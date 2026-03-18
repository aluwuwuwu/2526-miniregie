import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { eq } from 'drizzle-orm';
import { scrypt, randomBytes, randomUUID } from 'node:crypto';
import { promisify } from 'node:util';
import * as schema from './schema.js';
import { participants } from './schema.js';

const scryptAsync = promisify(scrypt);

const DB_PATH = process.env['DB_PATH'] ?? 'miniregie.db';

const sqlite = new Database(DB_PATH);
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('foreign_keys = ON');

export const db = drizzle(sqlite, { schema });

migrate(db, { migrationsFolder: 'server/src/db/migrations' });

const now = Date.now();

// system:admin — phantom FK placeholder for system-generated media items.
// It has no username or password and cannot log in.
const systemAdmin = db.select().from(participants).where(eq(participants.id, 'system:admin')).get();
if (!systemAdmin) {
  db.insert(participants).values({
    id:          'system:admin',
    displayName: 'System',
    role:        'admin',
    firstSeenAt: now,
    lastSeenAt:  now,
  }).run();
}

// Real admin account — credentials from env, used to log into the admin UI.
const adminUsername = process.env['ADMIN_USERNAME'];
const adminPassword = process.env['ADMIN_PASSWORD'];

if (adminUsername && adminPassword) {
  const existing = db.select().from(participants).where(eq(participants.username, adminUsername)).get();
  if (!existing) {
    const salt = randomBytes(16).toString('hex');
    const hash = await scryptAsync(adminPassword, salt, 64) as Buffer;
    const passwordHash = `${salt}:${hash.toString('hex')}`;

    db.insert(participants).values({
      id:           randomUUID(),
      username:     adminUsername,
      passwordHash: passwordHash,
      displayName:  'Admin',
      role:         'admin',
      firstSeenAt:  now,
      lastSeenAt:   now,
    }).run();

    console.log(`[db] Admin account seeded for username: ${adminUsername}`);
  }
} else {
  console.warn('[db] ADMIN_USERNAME or ADMIN_PASSWORD not set — admin account not seeded');
}
