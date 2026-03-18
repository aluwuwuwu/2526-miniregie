<script lang="ts">
  import { onMount } from 'svelte';
  import { api } from '../lib/api.ts';
  import { socketState } from '../lib/socket.svelte.ts';
  import type { AppId } from '@shared/types';

  const BROADCAST_URL = (import.meta.env.VITE_BROADCAST_URL as string | undefined) ?? '/';

  const APPS: { id: AppId; label: string }[] = [
    { id: 'pre-jam-idle',     label: 'Attente' },
    { id: 'countdown-to-jam', label: 'Chrono' },
    { id: 'jam-mode',         label: 'JAM' },
    { id: 'micro-trottoir',   label: 'Micro-trottoir' },
    { id: 'end-of-countdown', label: 'Fin chrono' },
    { id: 'post-jam-idle',    label: 'Post-JAM' },
  ];

  const activeApp       = $derived(socketState.globalState?.broadcast.activeApp ?? null);
  const isTransitioning = $derived(socketState.globalState?.broadcast.transition === 'in_progress');

  let dispatching = $state(false);
  let dispatchErr = $state<string | null>(null);

  async function dispatch(appId: AppId): Promise<void> {
    if (isTransitioning || dispatching) return;
    dispatching = true;
    dispatchErr = null;
    try {
      await api.broadcast.dispatch(appId);
    } catch (e: unknown) {
      dispatchErr = e instanceof Error ? e.message : 'Erreur';
    } finally {
      dispatching = false;
    }
  }

  // --- Pan/zoom state ---
  const NATIVE_W = 1920;
  const NATIVE_H = 1080;

  let previewWrap = $state<HTMLDivElement | undefined>(undefined);
  let scale     = $state(1);
  let panX      = $state(0);
  let panY      = $state(0);
  let fitScale  = $state(1);
  let isDragging = $state(false);
  let dragStart  = { x: 0, y: 0, px: 0, py: 0 };

  const zoomPct   = $derived(Math.round((scale / fitScale) * 100));
  const transform = $derived(`translate(${panX}px,${panY}px) scale(${scale})`);

  function center(fs: number, w: number, h: number) {
    panX = (w - NATIVE_W * fs) / 2;
    panY = (h - NATIVE_H * fs) / 2;
  }

  function resetView() {
    if (!previewWrap) return;
    const { width, height } = previewWrap.getBoundingClientRect();
    const fs = Math.min(width / NATIVE_W, height / NATIVE_H);
    fitScale = fs;
    scale = fs;
    center(fs, width, height);
  }

  onMount(() => {
    const ro = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect;
      const fs = Math.min(width / NATIVE_W, height / NATIVE_H);
      const wasAtFit = Math.abs(scale - fitScale) < 0.001;
      fitScale = fs;
      if (wasAtFit) {
        scale = fs;
        center(fs, width, height);
      }
    });
    if (previewWrap) ro.observe(previewWrap);
    return () => ro.disconnect();
  });

  function onWheel(e: WheelEvent) {
    e.preventDefault();
    const factor   = e.deltaY < 0 ? 1.15 : 1 / 1.15;
    const newScale = Math.max(fitScale * 0.5, Math.min(fitScale * 10, scale * factor));
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;
    panX = cx - (cx - panX) * (newScale / scale);
    panY = cy - (cy - panY) * (newScale / scale);
    scale = newScale;
  }

  function onMouseDown(e: MouseEvent) {
    if (e.button !== 0) return;
    isDragging = true;
    dragStart = { x: e.clientX, y: e.clientY, px: panX, py: panY };
  }

  function onMouseMove(e: MouseEvent) {
    if (!isDragging) return;
    panX = dragStart.px + (e.clientX - dragStart.x);
    panY = dragStart.py + (e.clientY - dragStart.y);
  }

  function onMouseUp() { isDragging = false; }
</script>

<div class="program-monitor">
  <div class="panel-header">
    <span class="panel-label">Program Monitor</span>
    {#if isTransitioning}
      <span class="transitioning">⟳ transition…</span>
    {:else if activeApp}
      <span class="active-label">{activeApp}</span>
    {/if}
  </div>

  <!-- Preview with pan/zoom -->
  <div
    class="preview-wrap"
    bind:this={previewWrap}
    onwheel={onWheel}
    onmousedown={onMouseDown}
    onmousemove={onMouseMove}
    onmouseup={onMouseUp}
    onmouseleave={onMouseUp}
    ondblclick={resetView}
    style="cursor:{isDragging ? 'grabbing' : 'grab'}"
    role="img"
    aria-label="Broadcast preview"
  >
    <div class="preview-canvas" style="transform:{transform}; transform-origin:top left; position:absolute; top:0; left:0;">
      <iframe
        src={BROADCAST_URL}
        title="Broadcast"
        sandbox="allow-scripts allow-same-origin"
        scrolling="no"
        style="width:{NATIVE_W}px; height:{NATIVE_H}px; border:none; display:block; pointer-events:none;"
      ></iframe>
    </div>

    <div class="zoom-badge">{zoomPct}%</div>
    <button class="zoom-reset" onclick={resetView} title="Reset view (dbl-click)">↺</button>
  </div>

  <!-- App switcher -->
  <div class="switcher">
    <div class="switcher-label">App switch</div>
    {#if dispatchErr}
      <div class="error-msg" style="margin-bottom:6px;">{dispatchErr}</div>
    {/if}
    <div class="app-grid">
      {#each APPS as app (app.id)}
        <button
          class="app-btn"
          class:active={app.id === activeApp}
          onclick={() => dispatch(app.id)}
          disabled={dispatching || isTransitioning}
        >
          {app.label}
          {#if app.id === activeApp}
            <span class="live-dot"></span>
          {/if}
        </button>
      {/each}
    </div>
  </div>
</div>

<style>
  .program-monitor {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: #111111;
    overflow: hidden;
  }

  .active-label {
    font-size: 10px;
    font-family: var(--font-mono);
    color: var(--accent);
  }

  .transitioning {
    font-size: 10px;
    color: var(--warning);
    animation: blink 0.6s step-end infinite;
  }

  /* Preview */
  .preview-wrap {
    flex: 1;
    background: #000;
    overflow: hidden;
    position: relative;
    user-select: none;
  }

  /* Zoom overlay controls */
  .zoom-badge {
    position: absolute;
    bottom: 6px;
    left: 8px;
    font-size: 10px;
    font-family: var(--font-mono);
    color: rgba(255,255,255,0.5);
    background: rgba(0,0,0,0.5);
    padding: 1px 5px;
    border-radius: 3px;
    pointer-events: none;
    z-index: 10;
  }

  .zoom-reset {
    position: absolute;
    bottom: 4px;
    right: 8px;
    background: rgba(0,0,0,0.55);
    border: 1px solid rgba(255,255,255,0.15);
    color: rgba(255,255,255,0.6);
    font-size: 13px;
    line-height: 1;
    width: 22px;
    height: 22px;
    border-radius: 4px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10;
    padding: 0;
    transition: color 0.1s, background 0.1s;
  }

  .zoom-reset:hover {
    background: rgba(0,0,0,0.8);
    color: #fff;
  }

  /* App switcher */
  .switcher {
    flex-shrink: 0;
    padding: 8px 10px;
    background: var(--bg-panel);
    border-top: 1px solid var(--border-dim);
  }

  .switcher-label {
    font-size: 9px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--text-dim);
    margin-bottom: 6px;
  }

  .app-grid {
    display: flex;
    gap: 4px;
    flex-wrap: wrap;
  }

  .app-btn {
    padding: 4px 10px;
    background: var(--bg-surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    color: var(--text-muted);
    font-size: 11px;
    font-weight: 500;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 5px;
    transition: background 0.1s, color 0.1s, border-color 0.1s;
  }

  .app-btn:hover:not(:disabled) {
    background: var(--bg-hover);
    color: var(--text);
  }

  .app-btn.active {
    background: rgba(232,124,42,0.12);
    border-color: var(--accent);
    color: var(--accent);
    font-weight: 600;
  }

  .app-btn:disabled { opacity: 0.4; cursor: not-allowed; }

  .live-dot {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: var(--live);
    box-shadow: 0 0 4px var(--live);
  }
</style>
