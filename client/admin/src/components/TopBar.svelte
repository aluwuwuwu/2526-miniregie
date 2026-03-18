<script lang="ts">
  import { api } from '../lib/api.ts';
  import { socketState } from '../lib/socket.svelte.ts';
  import type { Participant } from '@shared/types';

  interface Props {
    me: Participant;
    onLogout: () => void;
  }
  const { me, onLogout }: Props = $props();

  const jam        = $derived(socketState.globalState?.jam);
  const broadcast  = $derived(socketState.globalState?.broadcast);
  const panicState = $derived(broadcast?.panicState ?? false);
  const jamStatus  = $derived(jam?.status ?? 'idle');
  const isRunning  = $derived(jamStatus === 'running');

  let panicLoading = $state(false);

  function formatTime(ms: number | null): string {
    if (!ms || ms <= 0) return '--:--:--';
    const s = Math.floor(ms / 1000);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    return `${String(h).padStart(2,'0')}:${String(m%60).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;
  }

  async function triggerPanic(): Promise<void> {
    panicLoading = true;
    try { await api.jam.panic(); } finally { panicLoading = false; }
  }

  async function handleLogout(): Promise<void> {
    try { await api.auth.logout(); } catch { /* ignore */ }
    onLogout();
  }
</script>

<header class="topbar">
  <!-- Left: status -->
  <div class="topbar-left">
    <span class="brand">MiniRégie</span>

    <span class="conn-dot" class:online={socketState.connected}></span>

    <span class="badge badge-{panicState ? 'panic' : jamStatus}">
      {#if panicState}
        ⚠ PANIC
      {:else if jamStatus === 'running'}
        ● LIVE
      {:else}
        {jamStatus.toUpperCase()}
      {/if}
    </span>

    {#if isRunning || panicState}
      <span class="timer mono">
        <span class="timer-label">fin</span>
        {formatTime(socketState.timeRemaining)}
      </span>
    {/if}

    {#if broadcast?.activeApp}
      <span class="active-app">
        {broadcast.activeApp}
        {#if broadcast.transition === 'in_progress'}
          <span class="transition-dot"></span>
        {/if}
      </span>
    {/if}
  </div>

  <!-- Right: actions -->
  <div class="topbar-right">
    <span class="user">{me.displayName}</span>
    <button class="btn btn-ghost btn-xs" onclick={handleLogout}>Déconnexion</button>

    {#if !panicState}
      <button
        class="btn-panic"
        onclick={triggerPanic}
        disabled={panicLoading}
        title="Écran de sécurité immédiat"
      >
        ⚠ PANIC
      </button>
    {:else}
      <span class="panic-active">⚠ PANIC ACTIF</span>
    {/if}
  </div>
</header>

<style>
  .topbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 38px;
    padding: 0 12px;
    background: #111111;
    border-bottom: 1px solid var(--border-dim);
    flex-shrink: 0;
    gap: 12px;
    z-index: 10;
  }

  .topbar-left, .topbar-right {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .brand {
    font-size: 12px;
    font-weight: 700;
    color: var(--accent);
    letter-spacing: 0.05em;
  }

  .conn-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--text-dim);
  }
  .conn-dot.online { background: var(--ready); box-shadow: 0 0 5px var(--ready); }

  .timer {
    display: flex;
    align-items: baseline;
    gap: 4px;
    font-size: 16px;
    font-weight: 700;
    color: var(--text);
    font-variant-numeric: tabular-nums;
  }
  .timer-label {
    font-size: 9px;
    font-weight: 600;
    color: var(--text-dim);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    font-family: var(--font);
  }

  .active-app {
    font-size: 11px;
    color: var(--accent);
    font-family: var(--font-mono);
    display: flex;
    align-items: center;
    gap: 5px;
  }

  .transition-dot {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: var(--warning);
    animation: blink 0.6s step-end infinite;
  }

  .user {
    font-size: 11px;
    color: var(--text-muted);
  }

  .btn-panic {
    background: var(--live);
    color: #fff;
    border: none;
    border-radius: var(--radius);
    padding: 5px 16px;
    font-size: 12px;
    font-weight: 800;
    letter-spacing: 0.1em;
    cursor: pointer;
    box-shadow: 0 0 10px var(--live-glow);
    transition: background 0.1s, box-shadow 0.1s;
  }
  .btn-panic:hover:not(:disabled) {
    background: var(--danger-dim);
    box-shadow: 0 0 18px var(--live-glow);
  }
  .btn-panic:disabled { opacity: 0.4; cursor: not-allowed; }

  .panic-active {
    font-size: 12px;
    font-weight: 700;
    color: var(--live);
    letter-spacing: 0.08em;
  }
</style>
