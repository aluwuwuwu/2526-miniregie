import type { MediaItem } from '@shared/types';

// ─── Types ────────────────────────────────────────────────────────────────────

export type SlotName = 'loud' | 'visual' | 'note';

export interface SlotTimerConfig {
  photoDurationMs: number;
  noteDurationMs:  number;
  liveStreamMaxMs: number; // fallback for YouTube live streams (duration === 0)
}

// ─── SlotTimer ────────────────────────────────────────────────────────────────
//
// Manages one independent setTimeout per slot.
// Calls onExpired(slot) when the item's display time is up.
// JamModeApp owns queue advancement and layout re-resolution.

export interface SlotTimerMeta {
  startedAt:  number;
  durationMs: number;
}

export class SlotTimer {
  private readonly cfg: SlotTimerConfig;
  private readonly onExpired: (slot: SlotName) => void;
  private timers: Partial<Record<SlotName, ReturnType<typeof setTimeout>>> = {};
  private meta:   Partial<Record<SlotName, SlotTimerMeta>> = {};

  constructor(cfg: SlotTimerConfig, onExpired: (slot: SlotName) => void) {
    this.cfg       = cfg;
    this.onExpired = onExpired;
  }

  // Schedule a timer for the given slot based on the item type and content.
  // Clears any existing timer for that slot first.
  schedule(slot: SlotName, item: MediaItem): void {
    this.clear(slot);
    const ms = this.durationFor(slot, item);
    this.meta[slot] = { startedAt: Date.now(), durationMs: ms };
    this.timers[slot] = setTimeout(() => {
      delete this.timers[slot];
      delete this.meta[slot];
      this.onExpired(slot);
    }, ms);
  }

  clear(slot: SlotName): void {
    const t = this.timers[slot];
    if (t !== undefined) {
      clearTimeout(t);
      delete this.timers[slot];
      delete this.meta[slot];
    }
  }

  clearAll(): void {
    for (const slot of Object.keys(this.timers) as SlotName[]) {
      this.clear(slot);
    }
  }

  getMeta(slot: SlotName): SlotTimerMeta | undefined {
    return this.meta[slot];
  }

  // ─── Duration resolution ──────────────────────────────────────────────────

  private durationFor(slot: SlotName, item: MediaItem): number {
    if (slot === 'visual') return this.cfg.photoDurationMs;
    if (slot === 'note')   return this.cfg.noteDurationMs;

    // loud slot: use the item's own duration (clip or youtube)
    if (item.type === 'clip' || item.type === 'youtube') {
      const d = (item.content as { duration: number }).duration;
      return d > 0 ? d * 1000 : this.cfg.liveStreamMaxMs;
    }

    // Fallback — should not happen for a well-formed loud item
    return this.cfg.liveStreamMaxMs;
  }
}