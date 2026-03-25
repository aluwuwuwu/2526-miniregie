<script lang="ts">
  import OnAirZone from './OnAirZone.svelte';
  import NextZone from './NextZone.svelte';
  import QueueZone from './QueueZone.svelte';
</script>

<div class="rundown-panel">
  <OnAirZone />
  <NextZone />
  <QueueZone />
</div>

<style>
  .rundown-panel {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: var(--bg-panel);
  }
</style>
