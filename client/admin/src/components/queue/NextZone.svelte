<script lang="ts">
  import { socketState } from '../../lib/socket.svelte.ts';
  import type { MediaItem } from '@shared/types';
  import { LAYOUT_LABEL, TYPE_LABEL, TYPE_COLOR, itemLabel } from '../../lib/media.ts';

  const activeApp    = $derived(socketState.globalState?.broadcast.activeApp ?? '');
  const prediction   = $derived(socketState.globalState?.broadcast.nextPrediction ?? null);
  const snapshot     = $derived(socketState.globalState?.pool.queueSnapshot ?? []);

  const items = $derived<MediaItem[]>(
    (prediction?.itemIds ?? [])
      .map(id => snapshot.find(i => i.id === id))
      .filter((i): i is MediaItem => i !== undefined),
  );

  const primary   = $derived<MediaItem | null>(items[0] ?? null);
  const companion = $derived<MediaItem | null>(items[1] ?? null);
</script>

<div class="next-zone">
  <div class="next-zone__header">
    <span class="next-zone__label">Next</span>
    {#if prediction}
      <span class="next-zone__layout">
        → {LAYOUT_LABEL[prediction.layout] ?? prediction.layout}
      </span>
    {/if}
  </div>

  <div class="next-zone__body">
    {#if activeApp !== 'jam-mode' || !prediction || !primary}
      <p class="next-zone__empty">—</p>
    {:else}
      <div class="next-zone__row">
        <span class="next-zone__role">primary</span>
        <span class="next-zone__type" style="color:{TYPE_COLOR[primary.type] ?? 'var(--text-muted)'}">
          {TYPE_LABEL[primary.type] ?? primary.type}
        </span>
        <span class="next-zone__author">{primary.author.displayName}</span>
        <span class="next-zone__content">{itemLabel(primary, 40)}</span>
      </div>
      <div class="next-zone__row next-zone__row--companion" class:next-zone__row--empty={!companion}>
        <span class="next-zone__role">companion</span>
        {#if companion}
          <span class="next-zone__type" style="color:{TYPE_COLOR[companion.type] ?? 'var(--text-muted)'}">
            {TYPE_LABEL[companion.type] ?? companion.type}
          </span>
          <span class="next-zone__author">{companion.author.displayName}</span>
          <span class="next-zone__content">{itemLabel(companion, 40)}</span>
        {:else}
          <span class="next-zone__none">—</span>
        {/if}
      </div>
    {/if}
  </div>
</div>

<style>
  .next-zone {
    flex-shrink: 0;
    border-bottom: 1px solid var(--border);
    opacity: 0.75;
    transition: opacity 0.15s;
  }

  .next-zone:hover { opacity: 1; }

  /* ── Header ──────────────────────────────────────────────────────────── */

  .next-zone__header {
    display: flex;
    align-items: center;
    gap: 7px;
    padding: 5px 10px;
    border-left: 3px solid var(--border);
    background: var(--bg-surface);
    border-bottom: 1px solid var(--border-dim);
  }

  .next-zone__label {
    font-family: var(--font-mono);
    font-size: var(--font-size-sm);
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--text-muted);
    flex-shrink: 0;
  }

  .next-zone__layout {
    font-family: var(--font-mono);
    font-size: var(--font-size-sm);
    font-weight: 600;
    letter-spacing: 0.06em;
    color: var(--accent);
  }

  /* ── Body ────────────────────────────────────────────────────────────── */

  .next-zone__body {
    background: var(--bg-panel);
  }

  .next-zone__empty {
    font-size: var(--font-size-md);
    color: var(--text-dim);
    padding: 8px 12px;
    margin: 0;
  }

  /* ── Row ─────────────────────────────────────────────────────────────── */

  .next-zone__row {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    border-left: 3px solid transparent;
  }

  .next-zone__row + .next-zone__row { border-top: 1px solid var(--border-dim); }

  .next-zone__row:first-child  { border-left-color: color-mix(in srgb, var(--live) 40%, transparent); }
  .next-zone__row--companion   { border-left-color: color-mix(in srgb, var(--accent) 40%, transparent); }
  .next-zone__row--empty       { opacity: 0.4; }

  .next-zone__role {
    font-family: var(--font-mono);
    font-size: var(--font-size-xs);
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--text-dim);
    flex-shrink: 0;
    min-width: 56px;
  }

  .next-zone__type {
    font-family: var(--font-mono);
    font-size: var(--font-size-sm);
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    flex-shrink: 0;
  }

  .next-zone__author {
    font-size: var(--font-size-base);
    font-weight: 500;
    color: var(--text);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    flex-shrink: 0;
    max-width: 120px;
  }

  .next-zone__content {
    font-size: var(--font-size-base);
    color: var(--text-muted);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    flex: 1;
    min-width: 0;
  }

  .next-zone__none {
    font-size: var(--font-size-md);
    color: var(--text-dim);
  }
</style>
