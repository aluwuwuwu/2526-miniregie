<script lang="ts">
  import { Tabs } from 'bits-ui';
</script>

<div class="source-panel">
  <div class="panel-header">
    <span class="panel-label">Source / Contenu</span>
  </div>

  <Tabs.Root value="create" class="tabs-root">
    <Tabs.List class="tabs-list">
      <Tabs.Trigger value="create" class="tab-trigger">Créer</Tabs.Trigger>
      <Tabs.Trigger value="queue"  class="tab-trigger">Queue</Tabs.Trigger>
    </Tabs.List>

    <Tabs.Content value="create" class="tab-content">
      <div class="placeholder">
        <div class="placeholder-icon">✏️</div>
        <div class="placeholder-title">Création de contenu</div>
        <div class="placeholder-desc">
          Note · Lien · Photo · GIF · Clip · Interview<br>
          Mêmes fonctionnalités que le client /go
        </div>
      </div>
    </Tabs.Content>

    <Tabs.Content value="queue" class="tab-content">
      <div class="placeholder">
        <div class="placeholder-icon">📋</div>
        <div class="placeholder-title">File de modération</div>
        <div class="placeholder-desc">
          Pending → Ready / Évincer / Épingler<br>
          Filtres par type et statut
        </div>
      </div>
    </Tabs.Content>
  </Tabs.Root>
</div>

<style>
  .source-panel {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: var(--bg-panel);
    overflow: hidden;
  }

  :global(.tabs-root) {
    display: flex;
    flex-direction: column;
    flex: 1;
    overflow: hidden;
  }

  :global(.tabs-list) {
    display: flex;
    border-bottom: 1px solid var(--border-dim);
    background: var(--bg-panel);
    flex-shrink: 0;
  }

  :global(.tab-trigger) {
    flex: 1;
    padding: 7px 10px;
    background: transparent;
    border: none;
    border-bottom: 2px solid transparent;
    color: var(--text-muted);
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    cursor: pointer;
    transition: color 0.15s, border-color 0.15s;
  }

  :global(.tab-trigger:hover) {
    color: var(--text);
    background: var(--bg-hover);
  }

  :global(.tab-trigger[data-state="active"]) {
    color: var(--accent);
    border-bottom-color: var(--accent);
  }

  :global(.tab-content) {
    flex: 1;
    overflow-y: auto;
  }

  .placeholder {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    gap: 10px;
    padding: 20px;
    text-align: center;
    color: var(--text-muted);
  }

  .placeholder-icon { font-size: 32px; filter: grayscale(0.5); }

  .placeholder-title {
    font-size: 13px;
    font-weight: 600;
    color: var(--text);
  }

  .placeholder-desc {
    font-size: 11px;
    line-height: 1.6;
    color: var(--text-dim);
  }
</style>
