import { getScheduleEntries, markScheduleEntryFired, resetScheduleStatus } from '../db/queries.js';
import { shouldFire, parseScheduleEntry } from './triggers.js';
import type { GlobalState, LimitTrigger, MarketTrigger } from '../../../shared/types.js';

// ─── Types ────────────────────────────────────────────────────────────────────

/** LimitTrigger extended with the DB row id for persistent fired tracking. */
type DbLimitTrigger = LimitTrigger & { dbId: number };

// ─── ScheduleService ──────────────────────────────────────────────────────────

export class ScheduleService {
  private triggers: DbLimitTrigger[] = [];

  constructor() {
    this.reload();
  }

  // ─── Public API ─────────────────────────────────────────────────────────────

  /** Reloads schedule entries from DB. Call after any admin CRUD on schedule. */
  reload(): void {
    const entries = getScheduleEntries();
    this.triggers = entries.flatMap(entry => {
      // Skip already-fired entries — they must not re-trigger after a restart
      if (entry.status === 'fired') return [];
      try {
        return [{
          type:      'limit' as const,
          condition: parseScheduleEntry(entry.at),
          appId:     entry.app,
          fired:     false,
          dbId:      entry.id,
        }];
      } catch (err) {
        console.warn(`[schedule] Skipping entry id=${entry.id} "${entry.at}": ${err}`);
        return [];
      }
    });
  }

  get(): ReadonlyArray<LimitTrigger> {
    return this.triggers;
  }

  /** Returns the absolute ms timestamp of the next unfired trigger, or null. */
  getNextTriggerAt(jam: GlobalState['jam']): number | null {
    let earliest: number | null = null;
    for (const trigger of this.triggers) {
      if (trigger.fired) continue;
      const c = trigger.condition;
      let absTime: number | null = null;
      if (c.at === 'absolute') {
        absTime = new Date(c.value).getTime();
      } else if (c.at === 'H+' && jam.startedAt !== null) {
        absTime = jam.startedAt + c.value;
      } else if (c.at === 'T-' && jam.endsAt !== null) {
        absTime = jam.endsAt - c.value;
      }
      if (absTime !== null && (earliest === null || absTime < earliest)) {
        earliest = absTime;
      }
    }
    return earliest;
  }

  /**
   * Evaluates all unfired triggers against the current jam state and timestamp.
   * Marks fired triggers in DB and returns the corresponding MarketTriggers to
   * dispatch — keeping side effects out of the caller's tick loop.
   */
  evaluateTick(jam: GlobalState['jam'], now: number): MarketTrigger[] {
    const toDispatch: MarketTrigger[] = [];
    for (const trigger of this.triggers) {
      if (trigger.fired) continue;
      if (!shouldFire(trigger.condition, jam, now)) continue;
      trigger.fired = true;
      markScheduleEntryFired(trigger.dbId, now);
      toDispatch.push({ type: 'market', appId: trigger.appId, source: 'system' });
    }
    return toDispatch;
  }

  /**
   * Resolves the absolute end timestamp for the JAM by finding the
   * `end-of-countdown` schedule entry. Throws if missing or time is invalid.
   * T- format is rejected here because endsAt is what we're computing.
   */
  resolveJamEnd(startedAt: number): number {
    const entry = getScheduleEntries().find(e => e.app === 'end-of-countdown');
    if (!entry) throw new Error('No end-of-countdown entry in schedule — add an absolute timestamp entry first');

    const condition = parseScheduleEntry(entry.at);
    if (condition.at === 'T-') throw new Error('end-of-countdown cannot use T- format (circular dependency on endsAt)');

    const endsAt = condition.at === 'absolute'
      ? new Date(condition.value).getTime()
      : startedAt + condition.value; // H+

    if (isNaN(endsAt) || endsAt <= startedAt) throw new Error('end-of-countdown resolves to a past or invalid time');
    return endsAt;
  }

  /** Resets all schedule entries in DB and reloads so triggers can fire again. */
  resetAll(): void {
    resetScheduleStatus();
    this.reload();
  }
}