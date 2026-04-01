// LowerThirdOrchestrator — manages show/hide/reattribution of the lower-third.
//
// Receives layout + slots after each resolution, determines the attributable item,
// and emits socket events at the right moments.
// The broadcast client only reacts — no timing logic lives there.

import type { LayoutName, MediaItem, YoutubeContent } from '@shared/types';
import type { SlotAssignment } from './layout-engine.js';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface LowerThirdPayload {
  label: string;
  name:  string;
  role:  string;
}

type EmitFn = (event: string, payload?: unknown) => void;

// ─── Constants ────────────────────────────────────────────────────────────────

const ATTRIBUTION_HOLD_MS       = 6_000;
const REATTRIBUTION_INTERVAL_MS = 90_000;
const REATTRIBUTION_HOLD_MS     = 4_000;

// Lower-third = editorial title for the dominant slot.
// Loud present → always the loud. Visual alone → caption-first, then author.
//
// LOUD_LT_LAYOUTS: layouts where the loud slot is the dominant item.
// All others in LAYOUTS_WITH_LT use the visual slot.
const LOUD_LT_LAYOUTS = new Set<LayoutName>([
  'MEDIA_FULL',
  'MEDIA_WITH_VISUAL',
  'MEDIA_WITH_CAPTION',
  'VERTICAL_MEDIA',
  'VERTICAL_MEDIA_WITH_NOTE',
]);

const LAYOUTS_WITH_LT = new Set<LayoutName>([
  // Visual-dominant
  'VISUAL_FULL',
  'VISUAL_WITH_CAPTION',
  'DUAL_VISUAL',
  'PORTRAIT_FULL',
  'PORTRAIT_WITH_NOTE',
  'PORTRAIT_DUO',
  'WIDE_VISUAL',
  'WIDE_VISUAL_WITH_NOTE',
  // Loud-dominant
  'MEDIA_FULL',
  'MEDIA_WITH_VISUAL',
  'MEDIA_WITH_CAPTION',
  'VERTICAL_MEDIA',
  'VERTICAL_MEDIA_WITH_NOTE',
]);

const TYPE_LABELS: Partial<Record<MediaItem['type'], string>> = {
  youtube:   'Vidéo',
  clip:      'Clip',
  photo:     'Photo',
  gif:       'GIF',
  giphy:     'GIF',
  note:      'Note',
  link:      'Lien',
  interview: 'Interview',
};

// ─── LowerThirdOrchestrator ───────────────────────────────────────────────────

export class LowerThirdOrchestrator {
  private readonly emit: EmitFn;

  private itemId:    string | undefined;
  private isVisual:  boolean = false;
  private payload:   LowerThirdPayload | null = null;
  private hideTimer: ReturnType<typeof setTimeout> | undefined;
  private reattTimer: ReturnType<typeof setTimeout> | undefined;

  constructor(emit: EmitFn) {
    this.emit = emit;
  }

  // Called after every layout resolution.
  update(layout: LayoutName, slots: SlotAssignment): void {
    const result = this.itemFor(layout, slots);
    if (!result) {
      this.clear();
      return;
    }
    if (result.item.id !== this.itemId) {
      this.itemId   = result.item.id;
      this.isVisual = result.isVisual;
      this.clearTimers();
      this.show(result.item, ATTRIBUTION_HOLD_MS);
    }
  }

  // Returns current payload for reconnect state (included in getState()).
  getPayload(): LowerThirdPayload | null {
    return this.payload;
  }

  clear(): void {
    if (this.itemId !== undefined || this.payload !== null) {
      this.itemId  = undefined;
      this.payload = null;
      this.emit('jam-mode:lower-third:hide');
    }
    this.clearTimers();
  }

  // ─── Private ─────────────────────────────────────────────────────────────────

  private itemFor(layout: LayoutName, slots: SlotAssignment): { item: MediaItem; isVisual: boolean } | undefined {
    if (!LAYOUTS_WITH_LT.has(layout)) return undefined;
    if (LOUD_LT_LAYOUTS.has(layout)) {
      return slots.loud ? { item: slots.loud, isVisual: false } : undefined;
    }
    return slots.visual ? { item: slots.visual, isVisual: true } : undefined;
  }

  private show(item: MediaItem, holdMs: number): void {
    this.payload = this.payloadFor(item, this.isVisual);
    this.emit('jam-mode:lower-third:show', this.payload);
    clearTimeout(this.hideTimer);
    this.hideTimer = setTimeout(() => {
      this.hideTimer = undefined;
      this.payload   = null;
      this.emit('jam-mode:lower-third:hide');
      this.scheduleReattribution(item);
    }, holdMs);
  }

  private scheduleReattribution(item: MediaItem): void {
    clearTimeout(this.reattTimer);
    this.reattTimer = setTimeout(() => {
      this.reattTimer = undefined;
      if (item.id === this.itemId) {
        this.show(item, REATTRIBUTION_HOLD_MS);
      }
    }, REATTRIBUTION_INTERVAL_MS);
  }

  private clearTimers(): void {
    clearTimeout(this.hideTimer);
    clearTimeout(this.reattTimer);
    this.hideTimer  = undefined;
    this.reattTimer = undefined;
  }

  private payloadFor(item: MediaItem, isVisual: boolean): LowerThirdPayload {
    const label = TYPE_LABELS[item.type] ?? item.type;
    if (item.type === 'youtube') {
      return {
        label,
        name: (item.content as YoutubeContent).title,
        role: `Envoyé par ${item.author.displayName}`,
      };
    }
    if (isVisual) {
      const caption = (item.content as { caption?: string | null }).caption;
      if (caption) return { label, name: caption, role: item.author.displayName };
    }
    return { label, name: item.author.displayName, role: item.author.role ?? '' };
  }
}
