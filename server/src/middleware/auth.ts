import { createHmac, timingSafeEqual } from 'node:crypto';
import { parse as parseCookieHeader } from 'cookie';
import type { Request, Response, NextFunction } from 'express';
import { getParticipantById } from '../db/queries.js';
import type { Participant } from '../../../shared/types.js';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SessionPayload {
  participantId: string;
  role:          string;
  exp:           number; // timestamp ms
}

// Extend Express Request to carry the authenticated participant
declare global {
  namespace Express {
    interface Request {
      participant?: Participant;
    }
  }
}

// ─── Config ───────────────────────────────────────────────────────────────────

const COOKIE_SECRET  = process.env['COOKIE_SECRET'] ?? 'dev_secret_change_me';
const COOKIE_NAME    = 'session';
const COOKIE_TTL_MS  = 7 * 24 * 60 * 60 * 1000; // 7 days

// ─── Cookie helpers ───────────────────────────────────────────────────────────

function hmac(payload: string): string {
  return createHmac('sha256', COOKIE_SECRET).update(payload).digest('hex');
}

export function signCookie(payload: SessionPayload): string {
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64');
  const sig     = hmac(encoded);
  return `${encoded}.${sig}`;
}

export function parseCookie(value: string): SessionPayload | null {
  const dot = value.lastIndexOf('.');
  if (dot === -1) return null;

  const encoded  = value.slice(0, dot);
  const sig      = value.slice(dot + 1);
  const expected = hmac(encoded);

  // Constant-time comparison to prevent timing attacks
  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) return null;

  let payload: SessionPayload;
  try {
    payload = JSON.parse(Buffer.from(encoded, 'base64').toString('utf8')) as SessionPayload;
  } catch {
    return null;
  }

  if (typeof payload.participantId !== 'string') return null;
  if (typeof payload.role          !== 'string') return null;
  if (typeof payload.exp           !== 'number') return null;
  if (payload.exp < Date.now())                  return null;

  return payload;
}

export function makeCookieOptions(): {
  httpOnly: boolean;
  sameSite: 'lax';
  maxAge:   number;
  path:     string;
} {
  return {
    httpOnly: true,
    sameSite: 'lax',
    maxAge:   COOKIE_TTL_MS,
    path:     '/',
  };
}

export function makeSessionCookie(participant: Participant): string {
  return signCookie({
    participantId: participant.id,
    role:          participant.role,
    exp:           Date.now() + COOKIE_TTL_MS,
  });
}

// ─── Middleware ───────────────────────────────────────────────────────────────

/**
 * Reads the `session` cookie, verifies HMAC + expiry, fetches the participant
 * from DB, and attaches it to `req.participant`. Returns 401 if invalid.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const cookieHeader = req.headers['cookie'] ?? '';
  const cookies      = parseCookieHeader(cookieHeader);
  const raw          = cookies[COOKIE_NAME];
  if (!raw) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  const payload = parseCookie(raw);
  if (!payload) {
    res.status(401).json({ error: 'Invalid or expired session' });
    return;
  }

  const participant = getParticipantById(payload.participantId);
  if (!participant) {
    res.status(401).json({ error: 'Participant not found' });
    return;
  }

  if (participant.banned) {
    res.status(403).json({ error: 'Account banned' });
    return;
  }

  req.participant = participant;
  next();
}

/**
 * Factory: returns middleware that allows only the given roles.
 * Must be used after `requireAuth`.
 */
export function requireRole(...roles: string[]): (req: Request, res: Response, next: NextFunction) => void {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.participant) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    if (!roles.includes(req.participant.role)) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }
    next();
  };
}

/**
 * Blocks access if the authenticated participant has no avatar (onboarding incomplete).
 * Must be used after `requireAuth`.
 */
export function requireOnboarding(req: Request, res: Response, next: NextFunction): void {
  if (!req.participant) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  if (!req.participant.avatarUrl) {
    res.status(403).json({ error: 'Onboarding required', onboarding: true });
    return;
  }
  next();
}

export { COOKIE_NAME };
