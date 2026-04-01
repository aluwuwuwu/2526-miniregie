<script lang="ts">
	import { broadcastUnlocked } from '$lib/jam-mode-state.svelte';
	let { children } = $props();
</script>

<svelte:head>
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link
		rel="stylesheet"
		href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,300;9..144,400&family=Schibsted+Grotesk:wght@400;500;700&display=swap"
	/>
</svelte:head>

<div class="o-broadcast">
	{@render children()}
</div>

{#if !broadcastUnlocked.value}
	<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
	<div class="c-autoplay-gate" onclick={() => { broadcastUnlocked.value = true; }}>
		<span class="c-autoplay-gate__label">▶ Cliquer pour démarrer</span>
	</div>
{/if}

<style>
	.c-autoplay-gate {
		position: fixed;
		inset: 0;
		z-index: 9999;
		display: flex;
		align-items: center;
		justify-content: center;
		background: #06080d;
		cursor: pointer;
	}

	.c-autoplay-gate__label {
		font-family: 'Schibsted Grotesk', sans-serif;
		font-size: 1.1rem;
		font-weight: 500;
		letter-spacing: 0.08em;
		color: #1ac0d7;
		text-transform: uppercase;
	}
</style>