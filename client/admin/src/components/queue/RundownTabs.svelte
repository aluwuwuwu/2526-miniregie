<script lang="ts">
  import RundownPanel from './RundownPanel.svelte';
  import TickerPanel from './TickerPanel.svelte';
  import PlayedPanel from './PlayedPanel.svelte';
  import PoolPanel from '../pool/PoolPanel.svelte';

  let active = $state<'rundown' | 'tickers' | 'pool' | 'played'>('rundown');
</script>

<div class="rundown-tabs">
  <div class="rundown-tabs__bar">
    <button
      class="rundown-tabs__tab"
      class:rundown-tabs__tab--active={active === 'rundown'}
      onclick={() => (active = 'rundown')}
    >Rundown</button>
    <button
      class="rundown-tabs__tab"
      class:rundown-tabs__tab--active={active === 'tickers'}
      onclick={() => (active = 'tickers')}
    >Tickers</button>
    <button
      class="rundown-tabs__tab"
      class:rundown-tabs__tab--active={active === 'pool'}
      onclick={() => (active = 'pool')}
    >Pool</button>
    <button
      class="rundown-tabs__tab"
      class:rundown-tabs__tab--active={active === 'played'}
      onclick={() => (active = 'played')}
    >Played</button>
  </div>

  <div class="rundown-tabs__content">
    <div class="rundown-tabs__pane" class:rundown-tabs__pane--visible={active === 'rundown'}>
      <RundownPanel />
    </div>
    <div class="rundown-tabs__pane" class:rundown-tabs__pane--visible={active === 'tickers'}>
      <TickerPanel />
    </div>
    <div class="rundown-tabs__pane" class:rundown-tabs__pane--visible={active === 'pool'}>
      <PoolPanel />
    </div>
    <div class="rundown-tabs__pane" class:rundown-tabs__pane--visible={active === 'played'}>
      <PlayedPanel />
    </div>
  </div>
</div>

<style>
  .rundown-tabs {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: var(--bg-panel);
  }

  .rundown-tabs__bar {
    display: flex;
    border-bottom: 1px solid var(--border-dim);
    flex-shrink: 0;
  }

  .rundown-tabs__tab {
    padding: 0 14px;
    height: 36px;
    font-size: var(--font-size-base);
    font-family: var(--font-mono, monospace);
    font-weight: 600;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: var(--text-dim);
    background: transparent;
    border: none;
    border-bottom: 2px solid transparent;
    margin-bottom: -1px;
    cursor: pointer;
    transition: color 0.12s;
  }

  .rundown-tabs__tab:hover { color: var(--text-muted); }

  .rundown-tabs__tab--active {
    color: var(--text);
    border-bottom-color: var(--accent);
  }

  .rundown-tabs__content {
    flex: 1;
    min-height: 0;
    position: relative;
  }

  .rundown-tabs__pane {
    position: absolute;
    inset: 0;
    display: none;
  }

  .rundown-tabs__pane--visible {
    display: flex;
    flex-direction: column;
  }

  /* Hide panel-level headers inside tabs — tab bar serves that role */
  .rundown-tabs__pane :global(.panel-header) {
    display: none;
  }
</style>
