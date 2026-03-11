import { EventEmitter } from 'node:events';
import { randomUUID } from 'node:crypto';
import { computeScore } from './scoring.js';
import { sanitize } from './sanitize.js';
import { guard } from './guard.js';
import {
  insertItem, updateStatus, updatePriority, updatePinned, clearAllPinned,
  getReadyItems, getLastSubmissionAt, getClipCount, insertEvent,
  type ReadyItemFilters, type ScoredRow,
} from '../db/queries.js';
import type { GlobalState, MediaItem, MediaType } from '../../../shared/types.js';
import type { RawInput, ValidatedInput } from './types.js';

const AUTHOR_DISPLAY_COOLDOWN_MS = 3 * 60_000; // 3 minutes
const SAME_AUTHOR_PENALTY        = 30;
const CLIP_QUOTA                 = 3;

// ─── Filter types ─────────────────────────────────────────────────────────────

export interface NextItemFilters {
  types?:          MediaType[];
  submittedAfter?: number;
  excludeAuthorIds?: string[];
}

export interface GetQueueFilters {
  types?:           MediaType[];
  excludeTypes?:    MediaType[];
  submittedAfter?:  number;
  submittedBefore?: number;
  withCooldown?:    boolean; // default: true
  scoring?:         boolean; // default: true — false = sort by submittedAt ASC
}

export interface GetItemsFilters {
  types?:          MediaType[];
  submittedAfter?: number;
  sort?:           'submittedAt ASC' | 'submittedAt DESC';
}

// ─── PoolManager ──────────────────────────────────────────────────────────────

export class PoolManager extends EventEmitter {
  private readonly getJamState: () => GlobalState['jam'];
  // authorId → timestamp of last display
  private recentDisplayedAuthors = new Map<string, number>();

  constructor(options: { getJamState: () => GlobalState['jam'] }) {
    super();
    this.getJamState = options.getJamState;
  }

  // ─── Submission pipeline ────────────────────────────────────────────────────

  addItem(raw: RawInput, participantId: string): MediaItem {
    // 1. Sanitize
    const sanitized = sanitize(raw);
    if (!sanitized.ok) throw new Error(sanitized.error);

    // 2. Clip quota check (before guard to keep guard pure)
    if (raw.type === 'clip') {
      const count = getClipCount(participantId);
      if (count >= CLIP_QUOTA) throw new Error(`Clip quota reached (max ${CLIP_QUOTA} per JAM)`);
    }

    // 3. Guard — JAM status + rate limit
    const jamState = this.getJamState();
    const lastSubmissionAt = getLastSubmissionAt(participantId);
    const guarded = guard({ jamStatus: jamState.status, participantId, lastSubmissionAt });
    if (!guarded.ok) throw new Error(guarded.error);

    // 4. Create item as pending — respond immediately
    const priority = raw.type === 'interview' ? 200 : 100;
    const item: MediaItem = {
      id:          randomUUID(),
      type:        sanitized.validated.type as MediaType,
      content:     {} as MediaItem['content'], // filled by RESOLVE
      priority,
      status:      'pending',
      pinned:      false,
      submittedAt: Date.now(),
      author:      { participantId, displayName: '', team: '', role: '' }, // snapshot filled by caller
    };

    insertItem(item);

    // 5. Async pipeline — RESOLVE → ENRICH → ready
    void this.runPipeline(item.id, sanitized.validated);

    return item;
  }

  private async runPipeline(itemId: string, validated: ValidatedInput): Promise<void> {
    try {
      // RESOLVE: save files, run ffprobe, fetch thumbnails, etc.
      // Placeholder — will be implemented per type in routes/resolve.ts
      const content = await this.resolve(itemId, validated);

      // Update content in DB
      // Note: Drizzle doesn't expose a direct content update — we use raw status update
      // Content update query will be added to queries.ts when routes are implemented
      void content; // TODO: updateContent(itemId, content)

      updateStatus(itemId, 'ready');

      insertEvent({
        id: randomUUID(), itemId, type: 'enriched',
        appId: null, payload: null, createdAt: Date.now(),
      });

      this.emit('item:ready', itemId);
      this.emit('update');
    } catch {
      updateStatus(itemId, 'evicted');
      insertEvent({
        id: randomUUID(), itemId, type: 'evicted',
        appId: null, payload: { reason: 'unresolvable' }, createdAt: Date.now(),
      });
      this.emit('update');
    }
  }

  // Placeholder — actual resolution logic lives in routes/resolve.ts
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private async resolve(_itemId: string, _validated: unknown): Promise<MediaItem['content']> {
    return {} as MediaItem['content'];
  }

  // ─── Read ───────────────────────────────────────────────────────────────────

  nextItem(filters: NextItemFilters = {}): MediaItem | null {
    const now = Date.now();
    const dbFilters: ReadyItemFilters = { excludeTypes: ['ticker'] };
    if (filters.types)          dbFilters.types          = filters.types;
    if (filters.submittedAfter) dbFilters.submittedAfter = filters.submittedAfter;

    const rows = getReadyItems(dbFilters);

    // Compute per-author ready count for same-author penalty
    const authorReadyCount = this.computeAuthorReadyCounts(rows);

    // Active author cooldown
    const cooldownAuthors = new Set(
      [...this.recentDisplayedAuthors.entries()]
        .filter(([, ts]) => now - ts < AUTHOR_DISPLAY_COOLDOWN_MS)
        .map(([id]) => id),
    );

    const COOLDOWN_MS = 5 * 60_000;

    const candidates = rows
      .filter(row => {
        // 5-min item cooldown
        if (row.lastActivityAt && now - row.lastActivityAt < COOLDOWN_MS) return false;
        // Author display cooldown — skip if queue has other options
        if (cooldownAuthors.has(row.author.participantId)) return false;
        // Explicit exclude
        if (filters.excludeAuthorIds?.includes(row.author.participantId)) return false;
        return true;
      });

    // If all candidates are filtered by author cooldown, relax it
    const pool = candidates.length > 0 ? candidates : rows.filter(row =>
      !row.lastActivityAt || now - row.lastActivityAt >= COOLDOWN_MS,
    );

    if (pool.length === 0) return null;

    // Score and pick best
    return pool.reduce<ScoredRow | null>((best, row) => {
      const score = computeScore(row, {
        displayed:       row.displayedCount,
        skipped:         row.skippedCount,
        sameAuthorReady: (authorReadyCount.get(row.author.participantId) ?? 1) - 1,
      }, now);
      const bestScore = best ? computeScore(best, {
        displayed:       best.displayedCount,
        skipped:         best.skippedCount,
        sameAuthorReady: (authorReadyCount.get(best.author.participantId) ?? 1) - 1,
      }, now) : -Infinity;
      return score > bestScore ? row : best;
    }, null);
  }

  getQueue(filters: GetQueueFilters = {}): MediaItem[] {
    const now = Date.now();
    const withCooldown = filters.withCooldown ?? true;
    const scoring      = filters.scoring      ?? true;

    const dbFilters: ReadyItemFilters = {};
    if (filters.types)           dbFilters.types           = filters.types;
    if (filters.excludeTypes)    dbFilters.excludeTypes    = filters.excludeTypes;
    if (!filters.types)          dbFilters.excludeTypes    = [...(filters.excludeTypes ?? []), 'ticker'];
    if (filters.submittedAfter)  dbFilters.submittedAfter  = filters.submittedAfter;
    if (filters.submittedBefore) dbFilters.submittedBefore = filters.submittedBefore;

    let rows = getReadyItems(dbFilters);

    if (withCooldown) {
      const COOLDOWN_MS = 5 * 60_000;
      rows = rows.filter(row => !row.lastActivityAt || now - row.lastActivityAt >= COOLDOWN_MS);
    }

    if (!scoring) {
      return rows.sort((a, b) => a.submittedAt - b.submittedAt);
    }

    const authorReadyCount = this.computeAuthorReadyCounts(rows);
    return rows.sort((a, b) => {
      const scoreA = computeScore(a, { displayed: a.displayedCount, skipped: a.skippedCount, sameAuthorReady: (authorReadyCount.get(a.author.participantId) ?? 1) - 1 }, now);
      const scoreB = computeScore(b, { displayed: b.displayedCount, skipped: b.skippedCount, sameAuthorReady: (authorReadyCount.get(b.author.participantId) ?? 1) - 1 }, now);
      return scoreB - scoreA;
    });
  }

  getItems(filters: GetItemsFilters = {}): MediaItem[] {
    const dbFilters: ReadyItemFilters = {};
    if (filters.types)          dbFilters.types          = filters.types;
    if (filters.submittedAfter) dbFilters.submittedAfter = filters.submittedAfter;

    const rows = getReadyItems(dbFilters);
    const sorted = filters.sort === 'submittedAt DESC'
      ? rows.sort((a, b) => b.submittedAt - a.submittedAt)
      : rows.sort((a, b) => a.submittedAt - b.submittedAt);

    return sorted;
  }

  // ─── Write (called by apps) ─────────────────────────────────────────────────

  markDisplayed(itemId: string, appId: string): void {
    const item = this.getReady(itemId);
    insertEvent({ id: randomUUID(), itemId, type: 'displayed', appId, payload: null, createdAt: Date.now() });

    // Track author for display cooldown
    this.recentDisplayedAuthors.set(item.author.participantId, Date.now());

    // Auto-evict after display if pinned
    if (item.pinned) this.evict(itemId, 'post-pin');

    this.emit('update');
  }

  markSkipped(itemId: string, appId: string): void {
    insertEvent({ id: randomUUID(), itemId, type: 'skipped', appId, payload: null, createdAt: Date.now() });
    this.emit('update');
  }

  markHeld(itemId: string, appId: string, durationMs: number): void {
    insertEvent({ id: randomUUID(), itemId, type: 'held', appId, payload: { duration: durationMs }, createdAt: Date.now() });
    // No 'update' emit — held events are invisible to scoring
  }

  pin(id: string): void {
    clearAllPinned();
    updatePriority(id, 999);
    updatePinned(id, true);
    insertEvent({ id: randomUUID(), itemId: id, type: 'pinned', appId: null, payload: null, createdAt: Date.now() });
    this.emit('update');
  }

  evict(id: string, reason: 'manual' | 'post-pin' | 'unresolvable'): void {
    updateStatus(id, 'evicted');
    updatePinned(id, false);
    insertEvent({ id: randomUUID(), itemId: id, type: 'evicted', appId: null, payload: { reason }, createdAt: Date.now() });
    this.emit('update');
  }

  // ─── Helpers ────────────────────────────────────────────────────────────────

  private computeAuthorReadyCounts(rows: ScoredRow[]): Map<string, number> {
    const counts = new Map<string, number>();
    for (const row of rows) {
      const id = row.author.participantId;
      counts.set(id, (counts.get(id) ?? 0) + 1);
    }
    return counts;
  }

  private getReady(itemId: string): MediaItem {
    const rows = getReadyItems();
    const row = rows.find(r => r.id === itemId);
    if (!row) throw new Error(`Item ${itemId} not found or not ready`);
    return row;
  }
}
