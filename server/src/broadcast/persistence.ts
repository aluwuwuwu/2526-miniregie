import { readFileSync, writeFileSync, existsSync, renameSync } from 'node:fs';
import { writeFile, rename } from 'node:fs/promises';
import type { GlobalState, AppId } from '../../../shared/types.js';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PersistedState {
  jam:          GlobalState['jam'];
  activeApp:    AppId;
  panicState:   boolean;
  panicMessage: string;
}

// ─── Initial state factory ────────────────────────────────────────────────────

export function buildInitialState(): GlobalState {
  return {
    jam:       { status: 'idle', startedAt: null, endsAt: null, timeRemaining: null },
    broadcast: {
      activeApp:      'pre-jam-idle',
      transition:     'idle',
      panicState:     false,
      panicMessage:   '',
      nextTriggerAt:  null,
      activeItemIds:  [],
      regime:         'normal',
      activeLayout:   null,
      nextPrediction: null,
    },
    pool: { total: 0, queueSnapshot: [], byType: {}, holdCount: 0 },
  };
}

// ─── Load ─────────────────────────────────────────────────────────────────────

/**
 * Reads state.json and reconstructs a GlobalState.
 * Returns null when the file is missing or unreadable — caller should fall back
 * to buildInitialState().
 */
export function loadState(statePath: string): GlobalState | null {
  try {
    if (!existsSync(statePath)) return null;

    const raw       = readFileSync(statePath, 'utf-8');
    const persisted = JSON.parse(raw) as PersistedState;

    // Recalculate timeRemaining after a restart
    if (persisted.jam.status === 'running' && persisted.jam.endsAt !== null) {
      persisted.jam.timeRemaining = Math.max(0, persisted.jam.endsAt - Date.now());
    }

    return {
      jam:       persisted.jam,
      broadcast: {
        activeApp:      persisted.activeApp,
        transition:     'idle',
        panicState:     persisted.panicState ?? false,
        panicMessage:   persisted.panicMessage ?? '',
        nextTriggerAt:  null,
        activeItemIds:  [],
        regime:         'normal',
        activeLayout:   null,
        nextPrediction: null,
      },
      pool: { total: 0, queueSnapshot: [], byType: {}, holdCount: 0 },
    };
  } catch {
    return null;
  }
}

// ─── Save ─────────────────────────────────────────────────────────────────────

/**
 * Atomically writes a PersistedState to disk (write to .tmp then rename).
 * Falls back to synchronous I/O on async failure so shutdown saves still land.
 */
export async function saveState(statePath: string, data: PersistedState): Promise<void> {
  const json = JSON.stringify(data, null, 2);
  const tmp  = `${statePath}.tmp`;
  try {
    await writeFile(tmp, json);
    await rename(tmp, statePath);
  } catch {
    try { writeFileSync(tmp, json); renameSync(tmp, statePath); } catch { /* best effort */ }
  }
}