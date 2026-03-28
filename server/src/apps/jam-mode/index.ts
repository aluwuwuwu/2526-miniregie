// jam-mode app — server-side entry point

import type { App, AppId, MediaItem } from "@shared/types";

// ─── JamModeApp ───────────────────────────────────────────────────────────────
//
// Server-side lifecycle shell for the jam-mode broadcast app.
// The server drives all state (regime, active items, layout prediction) —
// the broadcast client only receives, never reports back.
//
// Future work: add item fetch loop (play/onPoolUpdate) and layout prediction
// once the client-side layout engine is in place.

export class JamModeApp implements App {
  readonly id: AppId = 'jam-mode';
  readonly outroMode = 'sequential' as const;

  // ─── Lifecycle ──────────────────────────────────────────────────────────────

  load(_signal: AbortSignal): void {
    // future: set up prefetch, resolve pending resources
  }

  play(): void {
    // future: start item fetch loop, begin sequencing
  }

  async stop(): Promise<void> {
    // future: drain in-progress items, resolve pending transitions
  }

  remove(): void {
    // future: cancel any in-flight async work
  }

  // ─── Pool delegation ────────────────────────────────────────────────────────

  onPoolUpdate(_item: MediaItem): void {
    // future: interrupt hold regime when new items arrive
  }
}