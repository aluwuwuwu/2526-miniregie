import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import {
  getAllItems,
  updateStatus,
  updatePinned,
  deleteItem,
  searchParticipants,
  setBanned,
} from "../db/queries.js";
import type { MediaStatus, AppId } from "../../../shared/types.js";
import type { BroadcastManager } from "../broadcast/index.js";

const VALID_STATUSES: MediaStatus[] = ["pending", "ready", "evicted"];

export default function createApiRouter(broadcast: BroadcastManager): Router {
  const router = Router();

  // All API routes require admin role
  router.use(requireAuth, requireRole("admin"));

  // ─── JAM control ─────────────────────────────────────────────────────────────

  router.post("/jam/start", (req, res) => {
    const { endsAt } = req.body as { endsAt?: unknown };
    if (typeof endsAt !== "number" || endsAt <= Date.now()) {
      res.status(400).json({ error: "endsAt must be a future timestamp (ms)" });
      return;
    }
    broadcast.startJam(endsAt);
    res.json({ ok: true });
  });

  router.post("/jam/end", (_req, res) => {
    broadcast.endJam();
    res.json({ ok: true });
  });

  router.post("/jam/panic", (_req, res) => {
    broadcast.panic("manual");
    res.json({ ok: true });
  });

  router.delete("/jam/panic", (req, res) => {
    const { resumeAppId } = req.body as { resumeAppId?: unknown };
    if (typeof resumeAppId !== "string" || resumeAppId.trim().length === 0) {
      res.status(400).json({ error: "resumeAppId is required" });
      return;
    }
    broadcast.clearPanic(resumeAppId.trim() as AppId);
    res.json({ ok: true });
  });

  // ─── State ────────────────────────────────────────────────────────────────────

  router.get("/state", (_req, res) => {
    res.json(broadcast.getState());
  });

  // ─── Items ────────────────────────────────────────────────────────────────────

  router.get("/items", (req, res) => {
    const { status, authorId } = req.query as {
      status?: string;
      authorId?: string;
    };

    const statusFilter = VALID_STATUSES.includes(status as MediaStatus)
      ? (status as MediaStatus)
      : undefined;

    const items = getAllItems({
      ...(statusFilter !== undefined && { status: statusFilter }),
      ...(typeof authorId === "string" && { authorId }),
    });
    res.json(items);
  });

  router.patch("/items/:id/status", (req, res) => {
    const { id } = req.params as { id: string };
    const { status } = req.body as { status?: unknown };

    if (
      typeof status !== "string" ||
      !VALID_STATUSES.includes(status as MediaStatus)
    ) {
      res.status(400).json({ error: "Invalid status value" });
      return;
    }

    updateStatus(id, status as MediaStatus);
    res.json({ ok: true });
  });

  router.patch("/items/:id/pin", (req, res) => {
    const { id } = req.params as { id: string };
    const { pinned } = req.body as { pinned?: unknown };

    if (typeof pinned !== "boolean") {
      res.status(400).json({ error: "pinned must be a boolean" });
      return;
    }

    updatePinned(id, pinned);
    res.json({ ok: true });
  });

  router.delete("/items/:id", (req, res) => {
    const { id } = req.params as { id: string };
    deleteItem(id);
    res.json({ ok: true });
  });

  // ─── Participants ─────────────────────────────────────────────────────────────

  router.get("/participants", (req, res) => {
    const { q } = req.query as { q?: string };
    const results = searchParticipants(
      typeof q === "string" && q.length > 0 ? q : undefined,
    );
    res.json(results);
  });

  router.post("/participants/:id/ban", (req, res) => {
    const { id } = req.params as { id: string };
    const { reason } = req.body as { reason?: unknown };

    setBanned(id, true, Date.now(), typeof reason === "string" ? reason : null);
    res.json({ ok: true });
  });

  router.delete("/participants/:id/ban", (req, res) => {
    const { id } = req.params as { id: string };
    setBanned(id, false, null, null);
    res.json({ ok: true });
  });

  return router;
}
