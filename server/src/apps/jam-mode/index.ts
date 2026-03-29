// jam-mode app — server-side entry point

import type { AppId, LayoutName, MediaItem } from "@shared/types";
import type { PoolManager } from "../../pool";
import { getJamConfig } from '../../jam-config.js';
import { BaseApp } from "../base-app.js";
import { resolveLayout, assignSlots, type SlotAssignment } from "./layout-engine.js";
import { SlotTimer, type SlotName, type SlotTimerMeta } from "./slot-timer.js";

// ─── JamModeQueues ────────────────────────────────────────────────────────────

export interface JamModeQueues {
  loud:   MediaItem[]; // youtube + clip → loud slot
  visual: MediaItem[]; // photo + gif    → silent visual slot
  note:   MediaItem[]; // note           → silent caption slot
  ticker: MediaItem[]; // ticker         → PersistentChrome belt (cycled independently)
}

// ─── JamModeApp ───────────────────────────────────────────────────────────────
//
// Server-side lifecycle shell for the jam-mode broadcast app.
// The server drives all state (regime, active items, layout) —
// the broadcast client only receives, never reports back.

export class JamModeApp extends BaseApp {
  readonly id: AppId = 'jam-mode';
  readonly outroMode = 'sequential' as const;

  private readonly pool: PoolManager;
  private readonly slotTimer: SlotTimer;

  queues: JamModeQueues = { loud: [], visual: [], note: [], ticker: [] };
  layout: LayoutName    = 'IDLE';
  slots:  SlotAssignment = {};

  constructor(pool: PoolManager) {
    super();
    this.pool      = pool;
    const cfg      = getJamConfig().jamMode;
    this.slotTimer = new SlotTimer(cfg, (slot) => this.onSlotExpired(slot));
  }

  // ─── Lifecycle ──────────────────────────────────────────────────────────────

  load(_signal: AbortSignal): void {
    this.queues = this.fetchQueues();
  }

  play(): void {
    this.applyLayout();
  }

  async stop(): Promise<void> {
    this.slotTimer.clearAll();
  }

  remove(): void {
    this.queues = { loud: [], visual: [], note: [], ticker: [] };
  }

  // ─── State (HTTP polling) ────────────────────────────────────────────────────

  override getState(): { layout: LayoutName; slots: SlotAssignment } {
    return { layout: this.layout, slots: this.slots };
  }

  // ─── Pool delegation ────────────────────────────────────────────────────────

  onPoolUpdate(_item: MediaItem): void {
    this.queues = this.fetchQueues();
    if (this.layout === 'IDLE') {
      // Wake up from hold regime
      this.applyLayout();
    }
  }

  // ─── Slot expiry ─────────────────────────────────────────────────────────────

  private onSlotExpired(slot: SlotName): void {
    const current = this.slots[slot];
    if (current) {
      this.pool.markDisplayed(current.id, this.id);
    }
    this.queues = this.fetchQueues();
    this.applyLayout();
  }

  // ─── Layout application ──────────────────────────────────────────────────────
  //
  // Re-resolves layout + slots, reschedules timers only for slots that changed,
  // and emits the new layout to clients.

  private applyLayout(): void {
    const prevSlots = this.slots;

    // A slot with a running timer must not be dropped by the layout resolver.
    // Guard also checks queue length: if the item was somehow evicted, don't lock.
    const locked = {
      loud:   this.slotTimer.getMeta('loud')   !== undefined && this.queues.loud.length   > 0,
      visual: this.slotTimer.getMeta('visual') !== undefined && this.queues.visual.length > 0,
      note:   this.slotTimer.getMeta('note')   !== undefined && this.queues.note.length   > 0,
    };

    this.layout = resolveLayout(this.queues, locked);
    this.slots  = assignSlots(this.layout, this.queues);

    this.rescheduleTimers(prevSlots, this.slots);

    const timing: Partial<Record<SlotName, SlotTimerMeta>> = {};
    for (const slot of ['loud', 'visual', 'note'] as SlotName[]) {
      const m = this.slotTimer.getMeta(slot);
      if (m) timing[slot] = m;
    }

    this.io.emit('jam-mode:layout', { layout: this.layout, slots: this.slots, timing });
  }

  private rescheduleTimers(prev: SlotAssignment, next: SlotAssignment): void {
    for (const slot of ['loud', 'visual', 'note'] as SlotName[]) {
      const prevItem = prev[slot];
      const nextItem = next[slot];

      if (nextItem === undefined) {
        // Slot is now empty — cancel any running timer
        this.slotTimer.clear(slot);
      } else if (nextItem.id !== prevItem?.id) {
        // New item in this slot — start fresh timer
        this.slotTimer.schedule(slot, nextItem);
      }
      // Same item → timer keeps running, no change
    }
  }

  // ─── Queue snapshot ─────────────────────────────────────────────────────────

  private fetchQueues(): JamModeQueues {
    return {
      loud:   this.pool.getMain({ types: ['youtube', 'clip'] }),
      visual: this.pool.getMain({ types: ['photo', 'gif'] }),
      note:   this.pool.getMain({ types: ['note'] }),
      ticker: this.pool.getMain({ types: ['ticker'] }),
    };
  }
}