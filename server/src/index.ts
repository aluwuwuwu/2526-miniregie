import express from 'express';
import { createServer } from 'node:http';
import { Server } from 'socket.io';

// Import DB to trigger migrations and seed on startup (side effects)
import './db/index.js';

import { PoolManager } from "./pool";
import { BroadcastManager } from "./broadcast";

import authRouter        from './routes/auth.js';
import createApiRouter   from './routes/api.js';
import createGoRouter    from './routes/go.js';

const app        = express();
const httpServer = createServer(app);
const io         = new Server(httpServer, {
  cors: { origin: '*' }, // restrict in production
});

app.use(express.json());

// ─── Core services ────────────────────────────────────────────────────────────

// Deferred reference breaks the circular dependency:
// pool needs getJamState → broadcast, broadcast needs pool.
// getJamState is only called lazily (never during construction).
let broadcastRef!: BroadcastManager;

const pool = new PoolManager({
  getJamState: () => broadcastRef.getState().jam,
});

const SCHEDULE_FILE = process.env['SCHEDULE_FILE'] ?? 'config/schedule.json';

const broadcast = new BroadcastManager({ io, pool, scheduleFile: SCHEDULE_FILE });
broadcastRef = broadcast;

// ─── Static file serving ──────────────────────────────────────────────────────

const UPLOAD_DIR = process.env['UPLOAD_DIR'] ?? './uploads';
app.use('/uploads', express.static(UPLOAD_DIR));
app.use('/admin',   express.static('client/admin/dist'));
app.use('/go',      express.static('client/go/dist'));
app.use('/',        express.static('client/broadcast/dist'));

// ─── Routes ───────────────────────────────────────────────────────────────────

app.use('/auth',   authRouter);
app.use('/api',    createApiRouter(broadcast));
// Mount participant API at /go/api so it doesn't conflict with the static /go SPA
app.use('/go/api', createGoRouter(broadcast, pool));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', ts: Date.now() });
});

// ─── Heartbeat for broadcast client watchdog ──────────────────────────────────

io.on('connection', (socket) => {
  console.log(`client connected: ${socket.id}`);

  const pingInterval = setInterval(() => {
    socket.emit('ping');
  }, 10_000);

  socket.on('disconnect', () => {
    clearInterval(pingInterval);
    console.log(`client disconnected: ${socket.id}`);
  });
});

// ─── Graceful shutdown ────────────────────────────────────────────────────────

process.on('SIGTERM', () => {
  broadcast.destroy();
  process.exit(0);
});

process.on('SIGINT', () => {
  broadcast.destroy();
  process.exit(0);
});

// ─── Start ────────────────────────────────────────────────────────────────────

const PORT = process.env['PORT'] ?? 3000;
httpServer.listen(PORT, () => {
  console.log(`MiniRégie server running on http://localhost:${PORT}`);
});