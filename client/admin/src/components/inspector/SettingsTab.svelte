<script lang="ts">
  import { setContext } from 'svelte';
  import { socketState } from '../../lib/socket.svelte.ts';
  import { api } from '../../lib/api.ts';
  import type { JamConfig } from '@shared/types';
  import FieldGroup from '../FieldGroup.svelte';

  type SaveStatus = 'idle' | 'pending' | 'saved' | 'error';

  const jam = $derived(socketState.globalState?.jam);

  let saveStatus  = $state<SaveStatus>('idle');
  let saveError   = $state<string | null>(null);
  // plain (non-reactive) flags — changes must NOT re-trigger effects
  let initialized                                         = false;
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;

  // expose save status to all FieldGroup children via context
  setContext<() => SaveStatus>('saveStatus', () => saveStatus);

  let form = $state({
    startAt:               '',
    endsAt:                '',
    countdownMin:          10,
    transitionFailsafeSec: 3,
    statePersistSec:       30,
    postJamIdleMin:        5,
    itemCooldownMin:       5,
    authorCooldownMin:     3,
    clipQuota:             3,
    freshWindowMin:        15,
    watchdogSec:           30,
  });

  function isoToDatetimeLocal(iso: string): string {
    if (!iso) return '';
    const d = new Date(iso);
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  }

  function datetimeLocalToIso(local: string): string {
    if (!local) return '';
    return new Date(local).toISOString();
  }

  function configToForm(cfg: JamConfig): void {
    form.startAt               = isoToDatetimeLocal(cfg.jam.startAt);
    form.endsAt                = isoToDatetimeLocal(cfg.jam.endsAt);
    form.countdownMin          = cfg.jam.countdownDurationMs / 60_000;
    form.transitionFailsafeSec = cfg.broadcast.transitionFailsafeMs / 1_000;
    form.statePersistSec       = cfg.broadcast.statePersistIntervalMs / 1_000;
    form.postJamIdleMin        = cfg.broadcast.postJamIdleDelayMs / 60_000;
    form.itemCooldownMin       = cfg.pool.itemCooldownMs / 60_000;
    form.authorCooldownMin     = cfg.pool.authorDisplayCooldownMs / 60_000;
    form.clipQuota             = cfg.pool.clipQuotaPerParticipant;
    form.freshWindowMin        = cfg.pool.freshItemWindowMs / 60_000;
    form.watchdogSec           = cfg.client.watchdogTimeoutMs / 1_000;
  }

  function formToConfig(): Partial<JamConfig> {
    return {
      jam: {
        startAt:             datetimeLocalToIso(form.startAt),
        endsAt:              datetimeLocalToIso(form.endsAt),
        countdownDurationMs: form.countdownMin * 60_000,
      },
      broadcast: {
        transitionFailsafeMs:   form.transitionFailsafeSec * 1_000,
        statePersistIntervalMs: form.statePersistSec * 1_000,
        postJamIdleDelayMs:     form.postJamIdleMin * 60_000,
      },
      pool: {
        itemCooldownMs:          form.itemCooldownMin * 60_000,
        authorDisplayCooldownMs: form.authorCooldownMin * 60_000,
        clipQuotaPerParticipant: form.clipQuota,
        freshItemWindowMs:       form.freshWindowMin * 60_000,
      },
      client: {
        watchdogTimeoutMs: form.watchdogSec * 1_000,
      },
    };
  }

  $effect(() => {
    api.config.get().then(cfg => {
      configToForm(cfg);
      // defer so the autosave effect below doesn't fire for the initial population
      setTimeout(() => { initialized = true; }, 0);
    }).catch(() => { initialized = true; });
  });

  // autosave: debounce 800ms after any form change
  $effect(() => {
    // read every field to register reactive dependencies
    void JSON.stringify(form);
    if (!initialized) return;
    if (debounceTimer) clearTimeout(debounceTimer);
    saveStatus = 'pending';
    debounceTimer = setTimeout(autoSave, 800);
  });

  async function autoSave(): Promise<void> {
    saveError = null;
    try {
      await api.config.update(formToConfig());
      saveStatus = 'saved';
      setTimeout(() => { saveStatus = 'idle'; }, 2000);
    } catch (err) {
      saveError  = (err as { error?: string }).error ?? 'Erreur';
      saveStatus = 'error';
    }
  }
</script>

<div class="settings-body">

  <section class="settings-section">
    <div class="section-title">État JAM</div>
    <div class="field-row">
      <span class="field-label">Statut</span>
      <span class="badge badge-{jam?.status ?? 'idle'}">{jam?.status ?? 'idle'}</span>
    </div>
    {#if jam?.startedAt}
      <div class="field-row">
        <span class="field-label">Démarré à</span>
        <span class="mono">{new Date(jam.startedAt).toLocaleTimeString('fr-BE')}</span>
      </div>
    {/if}
  </section>

  <section class="settings-section">
    <div class="section-title">Calendrier</div>
    <FieldGroup id="cfg-start-at" label="Début" desc="Heure de démarrage du JAM (déclenche le countdown)" value={form.startAt}>
      <input id="cfg-start-at" type="datetime-local" bind:value={form.startAt} />
    </FieldGroup>
    <FieldGroup id="cfg-ends-at" label="Fin" desc="Heure de fin absolue du JAM (trigger automatique)" value={form.endsAt}>
      <input id="cfg-ends-at" type="datetime-local" bind:value={form.endsAt} />
    </FieldGroup>
    <FieldGroup id="cfg-countdown" label="Countdown" desc="Durée du décompte avant le début du JAM" unit="min" value={form.countdownMin}>
      <input id="cfg-countdown" type="number" min="1" bind:value={form.countdownMin} />
    </FieldGroup>
  </section>

  <section class="settings-section">
    <div class="section-title">Broadcast</div>
    <FieldGroup id="cfg-failsafe" label="Failsafe transition" desc="Délai max avant forçage de transition si l'app ne répond pas" unit="s" value={form.transitionFailsafeSec}>
      <input id="cfg-failsafe" type="number" min="1" bind:value={form.transitionFailsafeSec} />
    </FieldGroup>
    <FieldGroup id="cfg-persist" label="Persist état" desc="Intervalle de sauvegarde de state.json sur disque" unit="s" value={form.statePersistSec}>
      <input id="cfg-persist" type="number" min="5" bind:value={form.statePersistSec} />
    </FieldGroup>
    <FieldGroup id="cfg-post-idle" label="Post-jam idle" desc="Temps d'attente en idle avant de passer en post-JAM" unit="min" value={form.postJamIdleMin}>
      <input id="cfg-post-idle" type="number" min="1" bind:value={form.postJamIdleMin} />
    </FieldGroup>
  </section>

  <section class="settings-section">
    <div class="section-title">Pool</div>
    <FieldGroup id="cfg-item-cd" label="Cooldown item" desc="Délai minimum entre deux diffusions du même item" unit="min" value={form.itemCooldownMin}>
      <input id="cfg-item-cd" type="number" min="1" bind:value={form.itemCooldownMin} />
    </FieldGroup>
    <FieldGroup id="cfg-author-cd" label="Cooldown auteur" desc="Délai minimum entre deux items du même auteur à l'écran" unit="min" value={form.authorCooldownMin}>
      <input id="cfg-author-cd" type="number" min="1" bind:value={form.authorCooldownMin} />
    </FieldGroup>
    <FieldGroup id="cfg-clip-quota" label="Quota clips" desc="Nombre maximum de clips vidéo acceptés par participant" unit="clips" value={form.clipQuota}>
      <input id="cfg-clip-quota" type="number" min="1" max="20" bind:value={form.clipQuota} />
    </FieldGroup>
    <FieldGroup id="cfg-fresh" label="Fenêtre fresh" desc="Items soumis dans cette fenêtre reçoivent un bonus de fraîcheur" unit="min" value={form.freshWindowMin}>
      <input id="cfg-fresh" type="number" min="1" bind:value={form.freshWindowMin} />
    </FieldGroup>
    <div class="field-row">
      <span class="field-label">Total items</span>
      <span class="mono">{socketState.globalState?.pool.total ?? '—'}</span>
    </div>
    <div class="field-row">
      <span class="field-label">Fresh items</span>
      <span class="mono">{socketState.globalState?.pool.fresh ?? '—'}</span>
    </div>
  </section>

  <section class="settings-section">
    <div class="section-title">Client broadcast</div>
    <FieldGroup id="cfg-watchdog" label="Watchdog timeout" desc="Reload automatique du client si aucun ping reçu dans ce délai" unit="s" value={form.watchdogSec}>
      <input id="cfg-watchdog" type="number" min="5" bind:value={form.watchdogSec} />
    </FieldGroup>
  </section>

  {#if saveError}
    <div class="error-bar">{saveError}</div>
  {/if}

</div>

<style>
  .settings-body {
    display: flex;
    flex-direction: column;
    gap: 0;
  }

  .settings-section {
    padding: 10px 12px;
    border-bottom: 1px solid var(--border-dim);
  }

  .section-title {
    font-size: 9px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--text-dim);
    margin-bottom: 8px;
  }

  .field-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 6px;
  }

  .field-label {
    font-size: 11px;
    color: var(--text-muted);
    white-space: nowrap;
  }

  .error-bar {
    padding: 6px 12px;
    font-size: 10px;
    color: var(--danger, #f44336);
  }
</style>