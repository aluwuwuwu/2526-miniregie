<script lang="ts">
  import { getContext } from 'svelte';
  import type { Snippet } from 'svelte';

  interface Props {
    id:       string;
    label:    string;
    desc:     string;
    unit?:    string;
    value:    unknown;   // watched to detect local changes
    children: Snippet;
  }

  const { id, label, desc, unit, value, children } = $props();

  type SaveStatus = 'idle' | 'pending' | 'saved' | 'error';
  const saveStatus = getContext<() => SaveStatus>('saveStatus');

  let dirty     = $state(false);
  let showSaved = $state(false);
  let firstRun  = true;

  // mark dirty when this field's value changes (skip initial mount)
  $effect(() => {
    void value;
    if (firstRun) { firstRun = false; return; }
    dirty     = true;
    showSaved = false;
  });

  // react to global save completion — only for dirty fields
  $effect(() => {
    const s = saveStatus?.();
    if (s === 'saved' && dirty) {
      dirty = false;
      showSaved = true;
      setTimeout(() => { showSaved = false; }, 2000);
    }
  });

  const dotStatus = $derived<'pending' | 'saved' | 'error' | null>(
    showSaved                          ? 'saved'   :
    dirty && saveStatus?.() === 'error' ? 'error'   :
    dirty                               ? 'pending' :
    null
  );
</script>

<div class="field-group">
  <div class="field-label-row">
    <label class="field-label" for={id}>{label}</label>
    {#if dotStatus === 'pending'}
      <span class="save-dot pending" title="Sauvegarde…"></span>
    {:else if dotStatus === 'saved'}
      <span class="save-dot saved" title="Sauvegardé"></span>
    {:else if dotStatus === 'error'}
      <span class="save-dot error" title="Erreur de sauvegarde"></span>
    {/if}
  </div>
  <span class="field-desc">{desc}</span>
  {#if unit}
    <div class="input-unit">
      {@render children()}
      <span class="unit">{unit}</span>
    </div>
  {:else}
    {@render children()}
  {/if}
</div>

<style>
  .field-group {
    display: flex;
    flex-direction: column;
    gap: 4px;
    margin-bottom: 8px;
  }

  .field-label-row {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .field-label {
    font-size: 11px;
    color: var(--text-muted);
    white-space: nowrap;
  }

  .field-desc {
    font-size: 10px;
    color: var(--text-dim);
    line-height: 1.3;
  }

  .input-unit {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .unit {
    font-size: 11px;
    color: var(--text-dim);
    white-space: nowrap;
  }

  .save-dot {
    display: inline-block;
    width: 5px;
    height: 5px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .save-dot.pending {
    background: var(--text-dim);
    animation: pulse 0.8s ease-in-out infinite alternate;
  }

  .save-dot.saved {
    background: var(--accent, #4caf50);
  }

  .save-dot.error {
    background: var(--danger, #f44336);
  }

  @keyframes pulse {
    from { opacity: 0.3; }
    to   { opacity: 1;   }
  }
</style>