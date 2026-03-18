import { Router } from 'express';
import multer from 'multer';
import { extname } from 'node:path';
import { randomUUID } from 'node:crypto';
import { requireAuth, requireOnboarding } from '../middleware/auth.js';
import { getTeams, setAvatarUrl, getAllItems } from '../db/queries.js';
import type { BroadcastManager } from "../broadcast";

export default function createGoRouter(broadcast: BroadcastManager): Router {
const router = Router();

// ─── Multer setup ─────────────────────────────────────────────────────────────

const UPLOAD_DIR  = process.env['UPLOAD_DIR'] ?? './uploads';
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MiB

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);

const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOAD_DIR,
    filename(_req, file, cb) {
      const ext = extname(file.originalname).toLowerCase() || '.jpg';
      cb(null, `${randomUUID()}${ext}`);
    },
  }),
  limits: { fileSize: MAX_FILE_SIZE_BYTES },
  fileFilter(_req, file, cb) {
    if (ALLOWED_MIME.has(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPEG, PNG, and WebP images are accepted'));
    }
  },
});

// ─── Public routes ────────────────────────────────────────────────────────────

/**
 * GET /go/api/teams
 * Returns distinct non-empty team names for autocomplete during registration.
 */
router.get('/teams', (_req, res) => {
  const teams = getTeams();
  res.json(teams);
});

// ─── Auth required ────────────────────────────────────────────────────────────

/**
 * GET /go/api/me
 * Returns the currently authenticated participant.
 */
router.get('/me', requireAuth, (req, res) => {
  res.json({ participant: req.participant });
});

/**
 * GET /go/api/status
 * Returns jam status (stubbed) and the current participant's submitted items.
 */
router.get('/status', requireAuth, (req, res) => {
  const jamStatus = broadcast.getState().jam.status;

  const myItems = getAllItems({ authorId: req.participant!.id });

  res.json({ jamStatus, myItems });
});

// ─── Auth + onboarding required ───────────────────────────────────────────────

/**
 * POST /go/api/submit
 * Submit a new media item. Full implementation comes with the resolve pipeline.
 */
router.post('/submit', requireAuth, requireOnboarding, (_req, res) => {
  // TODO: implement full submission pipeline (sanitize → guard → enrich)
  res.status(501).json({ error: 'Not implemented' });
});

// ─── Onboarding ───────────────────────────────────────────────────────────────

/**
 * POST /go/api/onboarding/avatar
 * Uploads a profile photo and stores the URL on the participant record.
 * After this call the participant passes requireOnboarding.
 */
router.post(
  '/onboarding/avatar',
  requireAuth,
  upload.single('avatar'),
  (req, res) => {
    if (!req.file) {
      res.status(400).json({ error: 'No avatar file uploaded' });
      return;
    }

    const avatarUrl = `/uploads/${req.file.filename}`;
    setAvatarUrl(req.participant!.id, avatarUrl);

    res.json({ participant: { ...req.participant!, avatarUrl } });
  },
);

return router;
}
