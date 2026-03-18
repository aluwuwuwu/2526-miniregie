<script lang="ts">
  import { socketState } from '../lib/socket.svelte.ts';

  const jam      = $derived(socketState.globalState?.jam);
  const snapshot = $derived(socketState.globalState?.pool.queueSnapshot ?? []);

  function typeColor(type: string): string {
    const map: Record<string, string> = {
      photo: '#3b82f6', gif: '#8b5cf6', clip: '#ef4444',
      note: '#22c55e', link: '#f59e0b', youtube: '#ef4444',
      interview: '#e87c2a', ticker: '#06b6d4',
    };
    return map[type] ?? '#555';
  }
</script>

<div class="edit-timeline">
  <div class="timeline-header">
    <span class="panel-label">Timeline</span>
    {#if jam?.startedAt}
      <span class="timeline-info mono">
        H+{Math.floor((Date.now() - jam.startedAt) / 60_000)}min
      </span>
    {/if}
  </div>

  <div class="timeline-body">
    <!-- Ruler -->
    <div class="ruler">
      <div class="ruler-track">
        {#each {length: 49} as _, i}
          <div class="ruler-mark" style="left:{(i/48)*100}%">
            <span class="ruler-label">H+{String(i).padStart(2,'0')}</span>
          </div>
        {/each}
      </div>
    </div>

    <!-- Track: broadcast events (past) -->
    <div class="track">
      <div class="track-label">Diffusé</div>
      <div class="track-content">
        <div class="placeholder-track">
          <span>Historique des items diffusés — à connecter sur broadcast_events</span>
        </div>
      </div>
    </div>

    <!-- Track: queue (upcoming) -->
    <div class="track">
      <div class="track-label">Queue</div>
      <div class="track-content">
        {#if snapshot.length === 0}
          <div class="placeholder-track"><span>Pool vide</span></div>
        {:else}
          <div class="queue-items">
            {#each snapshot as item (item.id)}
              <div class="queue-item" style="border-color:{typeColor(item.type)}" title={item.type}>
                <span class="item-type" style="background:{typeColor(item.type)}">{item.type}</span>
                <span class="item-author">{item.author.displayName || '?'}</span>
              </div>
            {/each}
          </div>
        {/if}
      </div>
    </div>

    <!-- Track: schedule triggers -->
    <div class="track">
      <div class="track-label">Schedule</div>
      <div class="track-content">
        <div class="placeholder-track">
          <span>Triggers du schedule — à positionner sur la règle temporelle</span>
        </div>
      </div>
    </div>

    <!-- NOW marker -->
    <div class="now-marker" style="left:0%">
      <div class="now-line"></div>
      <span class="now-label">NOW</span>
    </div>
  </div>
</div>

<style>
  .edit-timeline {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: #111111;
    overflow: hidden;
  }

  .timeline-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 4px 10px;
    background: var(--bg-panel);
    border-bottom: 1px solid var(--border-dim);
    flex-shrink: 0;
    height: 26px;
  }

  .timeline-info { font-size: 11px; color: var(--text-muted); }

  .timeline-body {
    flex: 1;
    overflow-x: auto;
    overflow-y: hidden;
    position: relative;
    min-width: 0;
  }

  /* Ruler */
  .ruler {
    height: 24px;
    background: #0d0d0d;
    border-bottom: 1px solid var(--border-dim);
    position: sticky;
    top: 0;
    z-index: 2;
    overflow: hidden;
  }

  .ruler-track {
    position: relative;
    width: 4800px; /* 48h × 100px/h */
    height: 100%;
  }

  .ruler-mark {
    position: absolute;
    transform: translateX(-50%);
    display: flex;
    flex-direction: column;
    align-items: center;
    height: 100%;
    border-left: 1px solid var(--border-dim);
  }

  .ruler-label {
    font-size: 8px;
    color: var(--text-dim);
    font-family: var(--font-mono);
    padding: 3px 2px;
    white-space: nowrap;
  }

  /* Tracks */
  .track {
    display: flex;
    align-items: stretch;
    height: 36px;
    border-bottom: 1px solid var(--border-dim);
  }

  .track-label {
    width: 72px;
    flex-shrink: 0;
    font-size: 9px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--text-dim);
    display: flex;
    align-items: center;
    padding: 0 8px;
    background: #161616;
    border-right: 1px solid var(--border-dim);
  }

  .track-content {
    flex: 1;
    overflow: hidden;
    position: relative;
    display: flex;
    align-items: center;
  }

  .placeholder-track {
    padding: 0 10px;
    font-size: 10px;
    color: var(--text-dim);
    font-style: italic;
    white-space: nowrap;
  }

  .queue-items {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 0 8px;
    overflow-x: auto;
    height: 100%;
  }

  .queue-item {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 2px 6px;
    background: var(--bg-surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    border-left-width: 2px;
    white-space: nowrap;
    flex-shrink: 0;
  }

  .item-type {
    font-size: 8px;
    font-weight: 700;
    text-transform: uppercase;
    color: #fff;
    padding: 1px 3px;
    border-radius: 1px;
  }

  .item-author {
    font-size: 10px;
    color: var(--text-muted);
    max-width: 60px;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  /* NOW marker */
  .now-marker {
    position: absolute;
    top: 24px; /* below ruler */
    bottom: 0;
    transform: translateX(-50%);
    pointer-events: none;
    z-index: 3;
  }

  .now-line {
    width: 2px;
    height: 100%;
    background: var(--live);
    box-shadow: 0 0 6px var(--live-glow);
  }

  .now-label {
    position: absolute;
    top: 0;
    left: 3px;
    font-size: 8px;
    font-weight: 700;
    color: var(--live);
    letter-spacing: 0.05em;
    white-space: nowrap;
  }
</style>
