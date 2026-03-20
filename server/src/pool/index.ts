import { EventEmitter } from 'node:events';
import { randomUUID } from 'node:crypto';
import { sanitize } from './sanitize.js';
import { guard } from './guard.js';
import {
  insertItem, updateStatus, updateContent, updatePriority, updateSubmittedAt,
  getReadyItems, getPlayedItems, getItemById, getLastSubmissionAt, getClipCount, insertEvent,
  type ReadyItemFilters, type ScoredRow, type PlayedRow,
} from '../db/queries.js';
import type { GlobalState, MediaItem, MediaType, ScoredMediaItem } from '../../../shared/types.js';
import type { RawInput, ValidatedInput } from './types.js';
import { resolve } from './resolve.js';
import { getJamConfig } from '../jam-config.js';

// ─── Filter types ─────────────────────────────────────────────────────────────

export interface NextItemFilters {
  types?:          MediaType[];
  submittedAfter?: number;
}

export interface GetQueueFilters {
  types?:           MediaType[];
  excludeTypes?:    MediaType[];
  submittedAfter?:  number;
  submittedBefore?: number;
}

export interface GetItemsFilters {
  types?:          MediaType[];
  submittedAfter?: number;
  sort?:           'submittedAt ASC' | 'submittedAt DESC';
}

// ─── PoolManager ──────────────────────────────────────────────────────────────

export class PoolManager extends EventEmitter {
  private readonly getJamState: () => GlobalState['jam'];
  private readonly cfg: ReturnType<typeof getJamConfig>['pool'];

  constructor(options: { getJamState: () => GlobalState['jam'] }) {
    super();
    this.getJamState = options.getJamState;
    this.cfg = getJamConfig().pool;
  }

  // ─── Submission pipeline ────────────────────────────────────────────────────

  addItem(raw: RawInput, participantId: string): MediaItem {
    // 1. Sanitize
    const sanitized = sanitize(raw);
    if (!sanitized.ok) throw new Error(sanitized.error);

    // 2. Clip quota check (before guard to keep guard pure)
    if (raw.type === 'clip') {
      const count = getClipCount(participantId);
      const quota = this.cfg.clipQuotaPerParticipant;
      if (count >= quota) throw new Error(`Clip quota reached (max ${quota} per JAM)`);
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
      submittedAt: Date.now(),
      author:      { participantId, displayName: '', team: '', role: '' }, // snapshot filled by caller
    };

    insertItem(item);

    // 5. Async pipeline — RESOLVE → ENRICH → ready
    const filePath = 'filePath' in raw ? raw.filePath : undefined;
    void this.runPipeline(item.id, sanitized.validated, filePath);

    return item;
  }

  private async runPipeline(itemId: string, validated: ValidatedInput, filePath?: string): Promise<void> {
    try {
      // RESOLVE: move files, run ffprobe, fetch OG metadata, etc.
      const content = await resolve({
        type:     validated.type,
        content:  validated as ValidatedInput['content'],
        filePath,
      });

      updateContent(itemId, content);
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

  // ─── Direct insert (admin / narrator bypass) ────────────────────────────────

  // Inserts a fully-formed item directly, bypassing sanitize/guard.
  // Use only for system:admin and system:narrator items.
  addDirectItem(item: MediaItem): void {
    insertItem(item);
    this.emit('update');
  }

  // ─── Stats (for GlobalState) ────────────────────────────────────────────────

  getStats(holdCount = 0): GlobalState['pool'] {
    const rows = getReadyItems({ excludeTypes: ['ticker'] });

    const byType: Record<string, number> = {};
    for (const row of rows) byType[row.type] = (byType[row.type] ?? 0) + 1;

    return {
      total:         rows.length,
      queueSnapshot: [...rows].sort(fifoSort).slice(0, 15),
      byType,
      holdCount,
    };
  }

  // ─── Admin queue view ────────────────────────────────────────────────────────

  getScoredQueue(): ScoredMediaItem[] {
    const rows = getReadyItems({ excludeTypes: ['ticker'] });
    return [...rows].sort(fifoSort).map(row => ({
      ...row,
      displayedCount: row.displayedCount,
      skippedCount:   row.skippedCount,
    }));
  }

  // ─── Read ───────────────────────────────────────────────────────────────────

  nextItem(filters: NextItemFilters = {}): MediaItem | null {
    const dbFilters: ReadyItemFilters = { excludeTypes: ['ticker'] };
    if (filters.types)          dbFilters.types          = filters.types;
    if (filters.submittedAfter) dbFilters.submittedAfter = filters.submittedAfter;

    const rows = getReadyItems(dbFilters);
    if (rows.length === 0) return null;

    return rows.sort(fifoSort)[0] ?? null;
  }

  getQueue(filters: GetQueueFilters = {}): MediaItem[] {
    const dbFilters: ReadyItemFilters = {};
    if (filters.types)           dbFilters.types           = filters.types;
    if (filters.excludeTypes)    dbFilters.excludeTypes    = filters.excludeTypes;
    if (!filters.types)          dbFilters.excludeTypes    = [...(filters.excludeTypes ?? []), 'ticker'];
    if (filters.submittedAfter)  dbFilters.submittedAfter  = filters.submittedAfter;
    if (filters.submittedBefore) dbFilters.submittedBefore = filters.submittedBefore;

    return getReadyItems(dbFilters).sort(fifoSort);
  }

  getItems(filters: GetItemsFilters = {}): MediaItem[] {
    const dbFilters: ReadyItemFilters = {};
    if (filters.types)          dbFilters.types          = filters.types;
    if (filters.submittedAfter) dbFilters.submittedAfter = filters.submittedAfter;

    const rows = getReadyItems(dbFilters);
    return filters.sort === 'submittedAt DESC'
      ? rows.sort((a, b) => b.submittedAt - a.submittedAt)
      : rows.sort((a, b) => a.submittedAt - b.submittedAt);
  }

  // ─── Write (called by apps) ─────────────────────────────────────────────────

  markDisplayed(itemId: string, appId: string): void {
    const item = getItemById(itemId);
    if (!item) return;

    insertEvent({ id: randomUUID(), itemId, type: 'displayed', appId, payload: null, createdAt: Date.now() });
    updateStatus(itemId, 'played');

    this.emit('update');
  }

  getPlayedItems(): PlayedRow[] {
    return getPlayedItems();
  }

  requeue(id: string): void {
    // Reset submittedAt to now so the item lands at the back of the FIFO queue
    updateSubmittedAt(id, Date.now());
    updatePriority(id, 100);
    updateStatus(id, 'ready');
    this.emit('update');
  }

  markSkipped(itemId: string, appId: string): void {
    insertEvent({ id: randomUUID(), itemId, type: 'skipped', appId, payload: null, createdAt: Date.now() });
    this.emit('update');
  }

  markHeld(itemId: string, appId: string, durationMs: number): void {
    insertEvent({ id: randomUUID(), itemId, type: 'held', appId, payload: { duration: durationMs }, createdAt: Date.now() });
  }

  evict(id: string, reason: 'manual' | 'unresolvable'): void {
    updateStatus(id, 'evicted');
    insertEvent({ id: randomUUID(), itemId: id, type: 'evicted', appId: null, payload: { reason }, createdAt: Date.now() });
    this.emit('update');
  }

  // ─── Reset ──────────────────────────────────────────────────────────────────

  reset(): void {
    this.emit('update');
  }

}

// ─── FIFO sort: admin drag order (priority DESC), then submission order ────────

function fifoSort(a: ScoredRow, b: ScoredRow): number {
  if (b.priority !== a.priority) return b.priority - a.priority;
  return a.submittedAt - b.submittedAt;
}
