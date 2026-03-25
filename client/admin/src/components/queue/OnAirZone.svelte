<script lang="ts">
  import { socketState } from '../../lib/socket.svelte.ts';
  import { api } from '../../lib/api.ts';
  import type { MediaItem } from '@shared/types';
  import { LAYOUT_LABEL } from '../../lib/media.ts';
  import OnAirRow from './OnAirRow.svelte';

  const activeIds    = $derived(socketState.globalState?.broadcast.activeItemIds ?? []);
  const regime       = $derived(socketState.globalState?.broadcast.regime ?? 'normal');
  const snapshot     = $derived(socketState.globalState?.pool.queueSnapshot ?? []);
  const activeApp    = $derived(socketState.globalState?.broadcast.activeApp ?? '');
  const activeLayout = $derived(socketState.globalState?.broadcast.activeLayout ?? null);

  const primary   = $derived<MediaItem | null>(
    activeIds[0] ? (snapshot.find(i => i.id === activeIds[0]) ?? null) : null,
  );
  const companion = $derived<MediaItem | null>(
    activeIds[1] ? (snapshot.find(i => i.id === activeIds[1]) ?? null) : null,
  );

  // ── Duration helpers ─────────────────────────────────────────────────────

  const DURATIONS: Record<string, { normal: number; extended: number }> = {
    photo: { normal: 20_000, extended: 45_000 },
    gif:   { normal: 20_000, extended: 45_000 },
    clip:  { normal: 20_000, extended: 45_000 },
    note:  { normal: 12_000, extended: 30_000 },
  };

  const COMPANION_DUR: Record<string, number> = {
    photo: 20_000, gif: 20_000, clip: 20_000, note: 12_000,
  };

  function getPrimaryDuration(item: MediaItem): number | null {
    if (item.type === 'youtube') return null;
    if (item.type === 'clip') return Math.max((item.content as { duration: number }).duration * 1_000, 4_000);
    const d = DURATIONS[item.type];
    if (!d) return null;
    return regime === 'hold' ? d.extended : d.normal;
  }

  function getCompanionDuration(item: MediaItem): number | null {
    return COMPANION_DUR[item.type] ?? null;
  }

  // ── Progress tracking ────────────────────────────────────────────────────

  let primaryStartedAt:   number | null = $state(null);
  let companionStartedAt: number | null = $state(null);
  let now = $state(Date.now());

  let prevPrimaryId:   string | null = null;
  let prevCompanionId: string | null = null;

  $effect(() => {
    const pid = activeIds[0] ?? null;
    const cid = activeIds[1] ?? null;
    if (pid !== prevPrimaryId)   { prevPrimaryId = pid;   primaryStartedAt   = pid ? Date.now() : null; }
    if (cid !== prevCompanionId) { prevCompanionId = cid; companionStartedAt = cid ? Date.now() : null; }
  });

  $effect(() => {
    if (!primary) return;
    const timer = setInterval(() => { now = Date.now(); }, 250);
    return () => clearInterval(timer);
  });

  const primaryProgress = $derived.by((): number | null => {
    if (!primary || primaryStartedAt === null) return null;
    const dur = getPrimaryDuration(primary);
    if (dur === null) return null;
    return Math.min((now - primaryStartedAt) / dur, 1);
  });

  const primaryTimeLeft = $derived.by((): number | null => {
    if (!primary || primaryStartedAt === null) return null;
    const dur = getPrimaryDuration(primary);
    if (dur === null) return null;
    return Math.max(0, Math.round((dur - (now - primaryStartedAt)) / 1000));
  });

  const companionProgress = $derived.by((): number | null => {
    if (!companion || companionStartedAt === null) return null;
    const dur = getCompanionDuration(companion);
    if (dur === null) return null;
    return Math.min((now - companionStartedAt) / dur, 1);
  });

  const companionTimeLeft = $derived.by((): number | null => {
    if (!companion || companionStartedAt === null) return null;
    const dur = getCompanionDuration(companion);
    if (dur === null) return null;
    return Math.max(0, Math.round((dur - (now - companionStartedAt)) / 1000));
  });

  // ── Actions ──────────────────────────────────────────────────────────────

  let skipping = $state(false);

  async function skipScene() {
    if (!primary || skipping) return;
    skipping = true;
    try { await api.items.skip(primary.id); }
    finally { skipping = false; }
  }
</script>

<div class="on-air-zone">
  <div class="on-air-zone__header">
    <span class="on-air-zone__label">On Air</span>
    <div class="on-air-zone__badges">
      {#if activeLayout && primary}
        <span class="on-air-zone__layout">{LAYOUT_LABEL[activeLayout] ?? activeLayout}</span>
      {/if}
      {#if activeApp === 'jam-mode'}
        <span class="on-air-zone__regime on-air-zone__regime--{regime}">{regime}</span>
      {/if}
    </div>
    {#if primary}
      <button class="on-air-zone__skip" onclick={skipScene} disabled={skipping}>
        {skipping ? '…' : 'Skip'}
      </button>
    {/if}
  </div>

  <div class="on-air-zone__body">
    {#if activeApp !== 'jam-mode'}
      <p class="on-air-zone__msg">
        not in jam mode — <span class="on-air-zone__app">{activeApp}</span>
      </p>
    {:else if !primary}
      <p class="on-air-zone__msg on-air-zone__msg--hold">
        {snapshot.length === 0 ? 'queue empty — hold' : `hold — ${snapshot.length} item${snapshot.length > 1 ? 's' : ''} queued`}
      </p>
    {:else}
      <OnAirRow role="primary"   item={primary}   progress={primaryProgress}   timeLeft={primaryTimeLeft} />
      <OnAirRow role="companion" item={companion}  progress={companionProgress} timeLeft={companionTimeLeft} />
    {/if}
  </div>
</div>

<style>
  .on-air-zone {
    flex-shrink: 0;
    border-bottom: 1px solid var(--border);
  }

  /* ── Header ──────────────────────────────────────────────────────────── */

  .on-air-zone__header {
    display: flex;
    align-items: center;
    gap: 7px;
    padding: 5px 10px;
    border-left: 3px solid var(--live);
    background: color-mix(in srgb, var(--live) 5%, var(--bg-surface));
    border-bottom: 1px solid var(--border-dim);
  }

  .on-air-zone__label {
    font-family: var(--font-mono);
    font-size: var(--font-size-sm);
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--live);
    flex-shrink: 0;
  }

  .on-air-zone__badges {
    display: flex;
    align-items: center;
    gap: 6px;
    flex: 1;
    min-width: 0;
  }

  .on-air-zone__layout {
    font-family: var(--font-mono);
    font-size: var(--font-size-sm);
    font-weight: 600;
    letter-spacing: 0.06em;
    color: var(--text-muted);
    white-space: nowrap;
  }

  .on-air-zone__regime {
    font-family: var(--font-mono);
    font-size: var(--font-size-sm);
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    padding: 1px 6px;
    border-radius: var(--radius);
    white-space: nowrap;
  }

  .on-air-zone__regime--normal { color: var(--ready);   background: color-mix(in srgb, var(--ready) 12%, transparent); }
  .on-air-zone__regime--hold   { color: var(--warning); background: color-mix(in srgb, var(--warning) 12%, transparent); }
  .on-air-zone__regime--buffer { color: var(--accent);  background: color-mix(in srgb, var(--accent) 12%, transparent); }

  .on-air-zone__skip {
    font-family: var(--font-mono);
    font-size: var(--font-size-sm);
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--text-muted);
    background: transparent;
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 2px 8px;
    cursor: pointer;
    flex-shrink: 0;
    transition: color 0.1s, border-color 0.1s;
  }

  .on-air-zone__skip:hover:not(:disabled) {
    color: var(--danger);
    border-color: var(--danger);
  }

  .on-air-zone__skip:disabled { opacity: 0.4; cursor: not-allowed; }

  /* ── Body ────────────────────────────────────────────────────────────── */

  .on-air-zone__body {
    background: var(--bg-panel);
  }

  .on-air-zone__msg {
    font-size: var(--font-size-md);
    color: var(--text-dim);
    padding: 14px 12px;
    margin: 0;
  }

  .on-air-zone__msg--hold { color: var(--warning); }

  .on-air-zone__app {
    font-family: var(--font-mono);
    color: var(--text-muted);
  }
</style>
