<script lang="ts">
  import { onMount } from 'svelte';
  import { socket } from '../../lib/socket.svelte.ts';
  import { api } from '../../lib/api.ts';
  import type { MediaStatus, ScoredMediaItem } from '@shared/types';
  import { TYPE_LABEL, TYPE_COLOR, itemLabel } from '../../lib/media.ts';

  let items   = $state<ScoredMediaItem[]>([]);
  let loading = $state(false);
  let error   = $state<string | null>(null);

  // ── Filters ───────────────────────────────────────────────────────────────

  type StatusFilter = 'all' | MediaStatus;
  let filterStatus = $state<StatusFilter>('all');
  let filterType   = $state<string>('all');

  const STATUS_OPTS: { value: StatusFilter; label: string }[] = [
    { value: 'all',     label: 'All' },
    { value: 'pending', label: 'Pending' },
    { value: 'ready',   label: 'Ready' },
    { value: 'played',  label: 'Played' },
    { value: 'evicted', label: 'Evicted' },
  ];

  const TYPE_OPTS = [
    { value: 'all',       label: 'All types' },
    { value: 'photo',     label: 'Photo' },
    { value: 'gif',       label: 'GIF' },
    { value: 'clip',      label: 'Clip' },
    { value: 'note',      label: 'Note' },
    { value: 'youtube',   label: 'YouTube' },
    { value: 'link',      label: 'Link' },
    { value: 'interview', label: 'Interview' },
    { value: 'ticker',    label: 'Ticker' },
  ];

  const displayItems = $derived(items.filter(i => {
    if (filterStatus !== 'all' && i.status !== filterStatus) return false;
    if (filterType   !== 'all' && i.type   !== filterType)   return false;
    return true;
  }));

  // ── Data fetching ─────────────────────────────────────────────────────────

  async function loadItems() {
    loading = true;
    error = null;
    try {
      items = (await api.items.list({ scored: true })) as ScoredMediaItem[];
    } catch (e: unknown) {
      error = e instanceof Error ? e.message : 'Failed to load pool';
    } finally {
      loading = false;
    }
  }

  onMount(() => {
    loadItems();
    socket.on('state', loadItems);
    return () => { socket.off('state', loadItems); };
  });

  // ── Actions ───────────────────────────────────────────────────────────────

  async function approve(id: string) {
    await api.items.updateStatus(id, 'ready');
    loadItems();
  }

  async function reject(id: string) {
    await api.items.updateStatus(id, 'evicted');
    loadItems();
  }

  async function requeue(id: string) {
    await api.items.requeue(id);
    loadItems();
  }

  async function remove(id: string) {
    await api.items.delete(id);
    loadItems();
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  function timeAgo(ts: number): string {
    const m = Math.floor((Date.now() - ts) / 60_000);
    if (m < 1) return 'now';
    if (m < 60) return `${m}m`;
    return `${Math.floor(m / 60)}h`;
  }
</script>

<div class="pool-panel">
  <div class="pool-panel__header panel-header">
    <span class="panel-label">Pool</span>
    <div class="pool-panel__meta">
      {#if loading}<span class="pool-panel__loading">…</span>{/if}
      <span class="pool-panel__count">{items.length}</span>
    </div>
  </div>

  <!-- ── Filters ─────────────────────────────────────────────────────────── -->
  <div class="pool-panel__filters">
    <div class="pool-panel__filter-row">
      {#each STATUS_OPTS as opt}
        <button
          class="pool-panel__chip"
          class:pool-panel__chip--active={filterStatus === opt.value}
          onclick={() => (filterStatus = opt.value)}
        >{opt.label}</button>
      {/each}
    </div>
    <div class="pool-panel__filter-row">
      <select class="pool-panel__select" bind:value={filterType}>
        {#each TYPE_OPTS as opt}
          <option value={opt.value}>{opt.label}</option>
        {/each}
      </select>
    </div>
  </div>

  <!-- ── Body ──────────────────────────────────────────────────────────────── -->
  <div class="pool-panel__body panel-body">
    {#if error}
      <div class="error-msg" style="margin:8px">{error}</div>
    {:else if displayItems.length === 0 && !loading}
      <p class="pool-panel__empty">No items match.</p>
    {:else}
      {#each displayItems as item (item.id)}
        <div class="pool-item">
          <div class="pool-item__main">
            <span
              class="pool-item__type"
              style="color:{TYPE_COLOR[item.type] ?? 'var(--text-muted)'}"
            >{TYPE_LABEL[item.type] ?? item.type}</span>
            <span class="pool-item__author">{item.author.displayName}</span>
            <span class="pool-item__team">{item.author.team}</span>
            <span class="pool-item__age">{timeAgo(item.submittedAt)}</span>
            <span class="pool-item__status pool-item__status--{item.status}">{item.status}</span>
          </div>

          <div class="pool-item__sub">
            <span class="pool-item__label">{itemLabel(item, 60)}</span>
            <div class="pool-item__stats">
              {#if item.displayedCount > 0}
                <span class="pool-item__stat pool-item__stat--played">{item.displayedCount}× played</span>
              {/if}
              {#if item.skippedCount > 0}
                <span class="pool-item__stat pool-item__stat--skipped">{item.skippedCount}× skipped</span>
              {/if}
            </div>
            <div class="pool-item__actions">
              {#if item.status === 'pending'}
                <button class="pool-item__btn pool-item__btn--approve" onclick={() => approve(item.id)}>
                  Approve
                </button>
                <button class="pool-item__btn pool-item__btn--reject" onclick={() => reject(item.id)}>
                  Reject
                </button>
              {:else if item.status === 'played' || item.status === 'evicted'}
                <button class="pool-item__btn pool-item__btn--requeue" onclick={() => requeue(item.id)}>
                  Re-queue
                </button>
              {:else if item.status === 'ready'}
                <button class="pool-item__btn pool-item__btn--reject" onclick={() => reject(item.id)}>
                  Remove
                </button>
              {/if}
              <button class="pool-item__btn pool-item__btn--delete" onclick={() => remove(item.id)}>
                Delete
              </button>
            </div>
          </div>
        </div>
      {/each}
    {/if}
  </div>
</div>

<style>
  .pool-panel {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: var(--bg-panel);
  }

  .pool-panel__meta {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .pool-panel__loading {
    font-size: var(--font-size-sm);
    color: var(--text-dim);
    font-family: var(--font-mono);
  }

  .pool-panel__count {
    font-size: var(--font-size-sm);
    font-family: var(--font-mono);
    color: var(--text-muted);
    background: var(--bg-surface);
    padding: 1px 6px;
    border-radius: var(--radius);
  }

  /* ── Filters ──────────────────────────────────────────────────────────── */

  .pool-panel__filters {
    padding: 6px 8px;
    border-bottom: 1px solid var(--border-dim);
    background: var(--bg-surface);
    display: flex;
    flex-direction: column;
    gap: 5px;
    flex-shrink: 0;
  }

  .pool-panel__filter-row {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }

  .pool-panel__chip {
    font-family: var(--font-mono);
    font-size: var(--font-size-sm);
    font-weight: 600;
    letter-spacing: 0.04em;
    color: var(--text-dim);
    background: transparent;
    border: 1px solid var(--border-dim);
    border-radius: var(--radius);
    padding: 2px 8px;
    cursor: pointer;
    transition: color 0.1s, border-color 0.1s, background 0.1s;
  }

  .pool-panel__chip:hover { color: var(--text-muted); border-color: var(--border); }

  .pool-panel__chip--active {
    color: var(--accent);
    border-color: var(--accent);
    background: color-mix(in srgb, var(--accent) 8%, transparent);
  }

  .pool-panel__select {
    font-family: var(--font-mono);
    font-size: var(--font-size-sm);
    color: var(--text-muted);
    background: var(--bg-panel);
    border: 1px solid var(--border-dim);
    border-radius: var(--radius);
    padding: 2px 6px;
    cursor: pointer;
  }

  /* ── Body ─────────────────────────────────────────────────────────────── */

  .pool-panel__body { overflow-y: auto; }

  .pool-panel__empty {
    font-size: var(--font-size-md);
    color: var(--text-dim);
    text-align: center;
    margin-top: 32px;
  }

  /* ── Pool item ────────────────────────────────────────────────────────── */

  .pool-item {
    padding: 7px 10px;
    border-bottom: 1px solid var(--border-dim);
    transition: background 0.08s;
  }

  .pool-item:hover { background: var(--bg-hover); }

  .pool-item__main {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 3px;
  }

  .pool-item__type {
    font-family: var(--font-mono);
    font-size: var(--font-size-sm);
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    flex-shrink: 0;
  }

  .pool-item__author {
    font-size: var(--font-size-base);
    font-weight: 500;
    color: var(--text);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    flex-shrink: 0;
  }

  .pool-item__team {
    font-size: var(--font-size-sm);
    color: var(--text-muted);
    white-space: nowrap;
    flex-shrink: 0;
  }

  .pool-item__age {
    font-family: var(--font-mono);
    font-size: var(--font-size-sm);
    color: var(--text-dim);
    flex: 1;
    text-align: right;
  }

  .pool-item__status {
    font-family: var(--font-mono);
    font-size: var(--font-size-xs);
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    padding: 1px 5px;
    border-radius: var(--radius);
    flex-shrink: 0;
  }

  .pool-item__status--pending { color: var(--warning); background: color-mix(in srgb, var(--warning) 10%, transparent); }
  .pool-item__status--ready   { color: var(--ready);   background: color-mix(in srgb, var(--ready) 10%, transparent); }
  .pool-item__status--played  { color: var(--text-dim); background: var(--bg-surface); }
  .pool-item__status--evicted { color: var(--danger);  background: color-mix(in srgb, var(--danger) 10%, transparent); }

  .pool-item__sub {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .pool-item__label {
    font-size: var(--font-size-base);
    color: var(--text-muted);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    flex: 1;
    min-width: 0;
  }

  .pool-item__stats {
    display: flex;
    gap: 6px;
    flex-shrink: 0;
  }

  .pool-item__stat {
    font-family: var(--font-mono);
    font-size: var(--font-size-xs);
    color: var(--text-dim);
  }

  .pool-item__stat--skipped { color: var(--warning); }

  .pool-item__actions {
    display: flex;
    gap: 4px;
    flex-shrink: 0;
  }

  .pool-item__btn {
    font-family: var(--font-mono);
    font-size: var(--font-size-sm);
    font-weight: 600;
    border-radius: var(--radius);
    padding: 2px 7px;
    cursor: pointer;
    transition: background 0.1s, color 0.1s, border-color 0.1s;
    border: 1px solid var(--border-dim);
    background: transparent;
    color: var(--text-muted);
  }

  .pool-item__btn:hover { border-color: var(--border); color: var(--text); }

  .pool-item__btn--approve { color: var(--ready); border-color: var(--ready); }
  .pool-item__btn--approve:hover { background: color-mix(in srgb, var(--ready) 10%, transparent); }

  .pool-item__btn--reject  { color: var(--text-muted); }
  .pool-item__btn--reject:hover  { color: var(--danger); border-color: var(--danger); }

  .pool-item__btn--requeue { color: var(--accent); border-color: var(--accent); }
  .pool-item__btn--requeue:hover { background: color-mix(in srgb, var(--accent) 10%, transparent); }

  .pool-item__btn--delete {
    color: var(--text-dim);
    border-color: transparent;
  }
  .pool-item__btn--delete:hover { color: var(--danger); border-color: var(--danger); }
</style>
