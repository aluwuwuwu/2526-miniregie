<script lang="ts">
  import { onMount } from 'svelte';
  import { socket, socketState } from '../../lib/socket.svelte.ts';
  import { api } from '../../lib/api.ts';
  import type { MediaItem } from '@shared/types';
  import QueueItem from './QueueItem.svelte';

  let items    = $state<MediaItem[]>([]);
  let loading  = $state(false);
  let updating = $state(false);
  let error    = $state<string | null>(null);

  // ── Drag state ───────────────────────────────────────────────────────────

  let draggedId:    string | null = $state(null);
  let dropTargetId: string | null = $state(null);
  let dropBefore:   boolean       = $state(true);
  let dragActive = false; // non-reactive — guards socket refresh during drag

  // ── Derived ──────────────────────────────────────────────────────────────

  const activeIds = $derived(socketState.globalState?.broadcast.activeItemIds ?? []);

  // Items not currently on-air (tickers excluded at fetch level)
  const queueItems = $derived(items.filter(i => !activeIds.includes(i.id)));

  // Apply live drag preview on top of the filtered queue
  const displayItems = $derived((): MediaItem[] => {
    if (draggedId === null || dropTargetId === null || draggedId === dropTargetId) {
      return queueItems;
    }
    const dragged = queueItems.find(i => i.id === draggedId);
    if (!dragged) return queueItems;
    const without   = queueItems.filter(i => i.id !== draggedId);
    const targetIdx = without.findIndex(i => i.id === dropTargetId);
    if (targetIdx === -1) return queueItems;
    const insertAt = dropBefore ? targetIdx : targetIdx + 1;
    const result = [...without];
    result.splice(insertAt, 0, dragged);
    return result;
  });

  // ── Data fetching ─────────────────────────────────────────────────────────

  async function loadItems() {
    loading = true;
    error = null;
    try {
      // Exclude tickers — they have their own panel
      items = await api.queue.main({ excludeTypes: 'ticker' });
    } catch (e: unknown) {
      error = e instanceof Error ? e.message : 'Failed to load queue';
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

  function onDragStart(id: string) {
    dragActive = true;
    draggedId = id;
  }

  function onDragOver(id: string, before: boolean) {
    if (id === draggedId) return;
    dropTargetId = id;
    dropBefore = before;
  }

  async function onDrop() {
    if (!draggedId || !dropTargetId) { resetDrag(); return; }

    const newQueueOrder = displayItems();
    resetDrag();

    // Prepend on-air items to preserve their positions at the front
    const onAirIds = activeIds.filter(id => items.some(i => i.id === id));
    const fullOrder = [...onAirIds, ...newQueueOrder.map(i => i.id)];

    updating = true;
    try {
      await api.queue.reorder(fullOrder);
    } catch {
      // best-effort — refresh to get consistent state
    } finally {
      updating = false;
    }
    await loadItems();
  }

  function onDragEnd() { resetDrag(); }

  function resetDrag() {
    dragActive = false;
    draggedId = null;
    dropTargetId = null;
  }
</script>

<div class="queue-zone">
  <div class="queue-zone__header">
    <span class="queue-zone__label">Queue</span>
    <div class="queue-zone__indicators">
      {#if loading || updating}
        <span class="queue-zone__loading">{updating ? 'saving…' : '…'}</span>
      {/if}
      {#if queueItems.length > 0}
        <span class="queue-zone__count">{queueItems.length}</span>
      {/if}
    </div>
  </div>

  <div class="queue-zone__body">
    {#if error}
      <div class="error-msg" style="margin:8px">{error}</div>
    {:else if queueItems.length === 0 && !loading}
      <p class="queue-zone__empty">Nothing queued.</p>
    {:else}
      {#each displayItems() as item, idx (item.id)}
        <QueueItem
          {item}
          {activeIds}
          position={idx + 1}
          onMutate={loadItems}
          isDragging={draggedId === item.id}
          dropIndicator={dropTargetId === item.id ? (dropBefore ? 'above' : 'below') : null}
          {onDragStart}
          {onDragOver}
          {onDrop}
          {onDragEnd}
        />
      {/each}
    {/if}
  </div>
</div>

<style>
  .queue-zone {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
  }

  /* ── Header ──────────────────────────────────────────────────────────── */

  .queue-zone__header {
    display: flex;
    align-items: center;
    gap: 7px;
    padding: 5px 10px;
    border-left: 3px solid transparent;
    background: var(--bg-surface);
    border-bottom: 1px solid var(--border-dim);
    flex-shrink: 0;
  }

  .queue-zone__label {
    font-family: var(--font-mono);
    font-size: var(--font-size-sm);
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--text-muted);
    flex: 1;
  }

  .queue-zone__indicators {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .queue-zone__loading {
    font-size: var(--font-size-sm);
    color: var(--text-dim);
    font-family: var(--font-mono);
  }

  .queue-zone__count {
    font-size: var(--font-size-sm);
    font-family: var(--font-mono);
    color: var(--text-muted);
    background: var(--bg-deep);
    padding: 1px 6px;
    border-radius: var(--radius);
  }

  /* ── Body ────────────────────────────────────────────────────────────── */

  .queue-zone__body {
    flex: 1;
    overflow-y: auto;
  }

  .queue-zone__empty {
    font-size: var(--font-size-md);
    color: var(--text-dim);
    text-align: center;
    margin-top: 32px;
  }
</style>
