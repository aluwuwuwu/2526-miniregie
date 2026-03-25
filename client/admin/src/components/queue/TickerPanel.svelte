<script lang="ts">
  import { onMount } from 'svelte';
  import { socket } from '../../lib/socket.svelte.ts';
  import { api } from '../../lib/api.ts';
  import type { MediaItem } from '@shared/types';

  let items   = $state<MediaItem[]>([]);
  let loading = $state(false);
  let error   = $state<string | null>(null);

  // ── Drag state ───────────────────────────────────────────────────────────

  let draggedId:    string | null = $state(null);
  let dropTargetId: string | null = $state(null);
  let dropBefore:   boolean       = $state(true);
  let updating      = $state(false);
  let dragActive    = false;

  const displayItems = $derived((): MediaItem[] => {
    if (draggedId === null || dropTargetId === null || draggedId === dropTargetId) return items;
    const dragged = items.find(i => i.id === draggedId);
    if (!dragged) return items;
    const without   = items.filter(i => i.id !== draggedId);
    const targetIdx = without.findIndex(i => i.id === dropTargetId);
    if (targetIdx === -1) return items;
    const result = [...without];
    result.splice(dropBefore ? targetIdx : targetIdx + 1, 0, dragged);
    return result;
  });

  // ── Add form ─────────────────────────────────────────────────────────────

  let adding   = $state(false);
  let newText  = $state('');
  let newLabel = $state('');
  let saving   = $state(false);

  // ── Data fetching ─────────────────────────────────────────────────────────

  async function loadItems() {
    loading = true;
    error = null;
    try {
      items = await api.queue.main({ types: 'ticker' });
    } catch (e: unknown) {
      error = e instanceof Error ? e.message : 'Failed to load tickers';
    } finally {
      loading = false;
    }
  }

  onMount(() => {
    loadItems();
    socket.on('state', () => { if (!dragActive) loadItems(); });
    return () => { socket.off('state', loadItems); };
  });

  // ── Drag handlers ──────────────────────────────────────────────────────────

  function onDragStart(id: string) { dragActive = true; draggedId = id; }

  function onDragOver(e: DragEvent, id: string) {
    e.preventDefault();
    if (id === draggedId) return;
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    dropTargetId = id;
    dropBefore = e.clientY < r.top + r.height / 2;
  }

  async function onDrop(e: DragEvent) {
    e.preventDefault();
    if (!draggedId || !dropTargetId) { resetDrag(); return; }
    const newOrder = displayItems();
    resetDrag();
    updating = true;
    try { await api.queue.reorder(newOrder.map(i => i.id)); }
    catch { /* best-effort */ }
    finally { updating = false; }
    await loadItems();
  }

  function onDragEnd() { resetDrag(); }

  function resetDrag() { dragActive = false; draggedId = null; dropTargetId = null; }

  // ── Actions ───────────────────────────────────────────────────────────────

  async function addTicker() {
    const text = newText.trim();
    if (!text || saving) return;
    saving = true;
    try {
      await api.items.create({ type: 'ticker', text, ...(newLabel.trim() ? { label: newLabel.trim() } : {}) });
      newText = '';
      newLabel = '';
      adding = false;
      await loadItems();
    } finally {
      saving = false;
    }
  }

  async function deleteTicker(id: string) {
    await api.items.delete(id);
    loadItems();
  }

  function labelFor(item: MediaItem): string {
    const c = item.content as { text?: string; label?: string };
    return c.text ?? '—';
  }

  function breakingLabel(item: MediaItem): string | null {
    return (item.content as { label?: string }).label ?? null;
  }
</script>

<div class="ticker-panel">
  <div class="ticker-panel__header panel-header">
    <span class="panel-label">Tickers</span>
    <div class="ticker-panel__controls">
      {#if loading || updating}
        <span class="ticker-panel__loading">{updating ? 'saving…' : '…'}</span>
      {/if}
      {#if items.length > 0}
        <span class="ticker-panel__count">{items.length}</span>
      {/if}
      <button class="ticker-panel__add-btn" onclick={() => (adding = !adding)}>
        {adding ? '✕' : '+ Add'}
      </button>
    </div>
  </div>

  {#if adding}
    <div class="ticker-panel__form">
      <textarea
        class="ticker-panel__input"
        placeholder="Ticker text…"
        bind:value={newText}
        rows={2}
      ></textarea>
      <input
        class="ticker-panel__input ticker-panel__input--label"
        type="text"
        placeholder="Breaking label (optional)"
        bind:value={newLabel}
      />
      <div class="ticker-panel__form-actions">
        <button class="btn btn-primary btn-xs" onclick={addTicker} disabled={saving || !newText.trim()}>
          {saving ? '…' : 'Add ticker'}
        </button>
        <button class="btn btn-ghost btn-xs" onclick={() => { adding = false; newText = ''; newLabel = ''; }}>
          Cancel
        </button>
      </div>
    </div>
  {/if}

  <div class="ticker-panel__body panel-body">
    {#if error}
      <div class="error-msg" style="margin:8px">{error}</div>
    {:else if items.length === 0 && !loading}
      <p class="ticker-panel__empty">No tickers yet.</p>
    {:else}
      {#each displayItems() as item, idx (item.id)}
        {@const isFirst = idx === 0}
        {@const breaking = breakingLabel(item)}
        <div
          class="ticker-item"
          class:ticker-item--active={isFirst}
          class:ticker-item--dragging={draggedId === item.id}
          class:ticker-item--drop-above={dropTargetId === item.id && dropBefore}
          class:ticker-item--drop-below={dropTargetId === item.id && !dropBefore}
          draggable="true"
          ondragstart={(e) => { e.dataTransfer?.setData('text/plain', item.id); onDragStart(item.id); }}
          ondragover={(e) => onDragOver(e, item.id)}
          ondrop={onDrop}
          ondragend={onDragEnd}
          role="listitem"
        >
          <span class="ticker-item__grip" aria-hidden="true"></span>
          <span class="ticker-item__active-mark" aria-hidden="true">{isFirst ? '▶' : ''}</span>
          <div class="ticker-item__content">
            {#if breaking}
              <span class="ticker-item__breaking">{breaking}</span>
            {/if}
            <span class="ticker-item__text">{labelFor(item)}</span>
            <span class="ticker-item__author">{item.author.displayName}</span>
          </div>
          <button
            class="ticker-item__delete"
            onclick={() => deleteTicker(item.id)}
            aria-label="Delete ticker"
          >✕</button>
        </div>
      {/each}
    {/if}
  </div>
</div>

<style>
  .ticker-panel {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: var(--bg-panel);
  }

  .ticker-panel__controls {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .ticker-panel__loading {
    font-size: var(--font-size-sm);
    color: var(--text-dim);
    font-family: var(--font-mono);
  }

  .ticker-panel__count {
    font-size: var(--font-size-sm);
    font-family: var(--font-mono);
    color: var(--text-muted);
    background: var(--bg-surface);
    padding: 1px 6px;
    border-radius: var(--radius);
  }

  .ticker-panel__add-btn {
    font-family: var(--font-mono);
    font-size: var(--font-size-sm);
    font-weight: 700;
    letter-spacing: 0.04em;
    color: var(--accent);
    background: transparent;
    border: 1px solid var(--accent);
    border-radius: var(--radius);
    padding: 1px 8px;
    cursor: pointer;
    transition: background 0.1s, color 0.1s;
  }

  .ticker-panel__add-btn:hover {
    background: color-mix(in srgb, var(--accent) 12%, transparent);
  }

  /* ── Add form ──────────────────────────────────────────────────────────── */

  .ticker-panel__form {
    padding: 8px 10px;
    border-bottom: 1px solid var(--border-dim);
    background: var(--bg-surface);
    display: flex;
    flex-direction: column;
    gap: 5px;
    flex-shrink: 0;
  }

  .ticker-panel__input {
    resize: vertical;
    font-size: var(--font-size-base);
    min-height: 40px;
  }

  .ticker-panel__input--label {
    resize: none;
    min-height: unset;
  }

  .ticker-panel__form-actions {
    display: flex;
    gap: 5px;
  }

  /* ── Body ─────────────────────────────────────────────────────────────── */

  .ticker-panel__body { overflow-y: auto; }

  .ticker-panel__empty {
    font-size: var(--font-size-md);
    color: var(--text-dim);
    text-align: center;
    margin-top: 32px;
  }

  /* ── Ticker item ──────────────────────────────────────────────────────── */

  .ticker-item {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 7px 8px;
    border-bottom: 1px solid var(--border-dim);
    border-left: 3px solid transparent;
    background: var(--bg-panel);
    transition: background 0.1s, border-left-color 0.15s;
    cursor: grab;
  }

  .ticker-item:hover        { background: var(--bg-hover); }
  .ticker-item--active      { border-left-color: var(--accent); }
  .ticker-item--dragging    { opacity: 0.35; }
  .ticker-item--drop-above  { box-shadow: inset 0 2px 0 var(--accent); }
  .ticker-item--drop-below  { box-shadow: inset 0 -2px 0 var(--accent); }

  .ticker-item__grip {
    width: 8px;
    height: 14px;
    flex-shrink: 0;
    opacity: 0.4;
    background-image:
      radial-gradient(circle, var(--text-dim) 1px, transparent 1px),
      radial-gradient(circle, var(--text-dim) 1px, transparent 1px);
    background-size: 3px 5px;
    background-position: 0 0, 4px 0;
    background-repeat: repeat-y;
  }

  .ticker-item__active-mark {
    font-size: var(--font-size-xs);
    color: var(--accent);
    width: 12px;
    flex-shrink: 0;
  }

  .ticker-item__content {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .ticker-item__breaking {
    font-family: var(--font-mono);
    font-size: var(--font-size-xs);
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--warning);
  }

  .ticker-item__text {
    font-size: var(--font-size-base);
    color: var(--text);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .ticker-item__author {
    font-size: var(--font-size-sm);
    color: var(--text-dim);
  }

  .ticker-item__delete {
    font-size: var(--font-size-sm);
    color: var(--text-dim);
    background: transparent;
    border: none;
    cursor: pointer;
    padding: 2px 4px;
    border-radius: var(--radius);
    flex-shrink: 0;
    transition: color 0.1s;
  }

  .ticker-item__delete:hover { color: var(--danger); }
</style>
