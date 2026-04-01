<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { serverState } from '$lib/server-state.svelte';
	import type { TickerContent } from '@shared/types';

	// ── Data ─────────────────────────────────────────────────────

	const tickerItems = $derived(
		serverState.state?.pool.queueSnapshot.filter(i => i.type === 'ticker') ?? []
	);

	const visible = $derived(tickerItems.length > 0);

	// ── Clock ─────────────────────────────────────────────────────

	let now = $state(new Date());
	let showCountdown = $state(false);
	let clockInterval: ReturnType<typeof setInterval> | undefined;
	let oscillInterval: ReturnType<typeof setInterval> | undefined;

	const clockTime = $derived(
		now.toLocaleTimeString('fr-BE', { hour: '2-digit', minute: '2-digit', hour12: false })
	);

	const countdownTime = $derived.by(() => {
		const endsAt = serverState.state?.jam.endsAt;
		if (!endsAt) return null;
		const remaining = Math.max(0, endsAt - now.getTime());
		const totalSecs = Math.floor(remaining / 1000);
		const h = Math.floor(totalSecs / 3600);
		const m = Math.floor((totalSecs % 3600) / 60);
		const s = totalSecs % 60;
		if (h > 0) return `${h}h${String(m).padStart(2, '0')}`;
		return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
	});

	// Only oscillate when a countdown is available
	const activeShowCountdown = $derived(showCountdown && countdownTime !== null);

	// ── Scroll ───────────────────────────────────────────────────

	let track: HTMLDivElement | undefined;

	$effect(() => {
		// Depend on items so the effect re-runs when content changes
		if (!track || tickerItems.length === 0) return;
		const rAF = requestAnimationFrame(() => {
			if (!track) return;
			// Track contains items duplicated — half is the real content width
			const duration = (track.scrollWidth / 2) / 55;
			track.style.setProperty('animation-duration', `${duration}s`);
		});
		return () => cancelAnimationFrame(rAF);
	});

	// ── Lifecycle ─────────────────────────────────────────────────

	onMount(() => {
		clockInterval  = setInterval(() => { now = new Date(); }, 1000);
		oscillInterval = setInterval(() => { showCountdown = !showCountdown; }, 5000);
	});

	onDestroy(() => {
		clearInterval(clockInterval);
		clearInterval(oscillInterval);
	});
</script>

<div class="c-ticker" class:c-ticker--visible={visible} aria-live="off" aria-atomic="false">

	<!-- Flag — UNIQUE colored surface -->
	<div class="c-ticker__flag" aria-hidden="true">
		<span class="c-ticker__dot"></span>
		M4TV
	</div>

	<!-- Oscillating clock: real time ↔ countdown -->
	<div class="c-ticker__clock">
		<span
			class="c-ticker__clock-val"
			class:c-ticker__clock-val--out={activeShowCountdown}
		>{clockTime}</span>
		{#if countdownTime !== null}
			<span
				class="c-ticker__clock-val c-ticker__clock-val--countdown"
				class:c-ticker__clock-val--out={!activeShowCountdown}
			><span class="c-ticker__clock-icon" aria-hidden="true">▼</span>{countdownTime}</span>
		{/if}
	</div>

	<!-- Scrolling text -->
	<div class="c-ticker__scroll">
		<div class="c-ticker__track" bind:this={track}>
			{#each [...tickerItems, ...tickerItems] as item, i (i)}
				<span class="c-ticker__item">{(item.content as TickerContent).text}</span>
				<span class="c-ticker__sep" aria-hidden="true">·</span>
			{/each}
		</div>
	</div>

</div>

<style>
	/* ── Container ───────────────────────────────────────────────── */

	.c-ticker {
		position: absolute;
		bottom: var(--broadcast-space-safe, 2.2%);
		left:   var(--broadcast-space-safe, 2.2%);
		right:  var(--broadcast-space-safe, 2.2%);
		height: var(--broadcast-h-ticker, clamp(18px, 3.2%, 26px));
		background: rgba(8, 8, 10, 0.93);
		display: flex;
		align-items: stretch;
		overflow: hidden;
		z-index: 10;
		/* Hidden by default — shown only when there is content */
		opacity: 0;
		pointer-events: none;
		transition: opacity 400ms ease;
	}

	.c-ticker--visible {
		opacity: 1;
		pointer-events: auto;
	}

	/* ── Flag — only colored surface ─────────────────────────────── */

	.c-ticker__flag {
		flex-shrink: 0;
		background: var(--color-brand, #1ac0d7);
		display: flex;
		align-items: center;
		gap: clamp(4px, 0.5vw, 6px);
		padding: 0 clamp(6px, 0.9vw, 10px);
		font-family: var(--font-editorial, 'Schibsted Grotesk', sans-serif);
		font-size: var(--broadcast-fz-xs, clamp(5px, 0.72vw, 7px));
		font-weight: var(--fw-bold, 700);
		letter-spacing: 0.13em;
		text-transform: uppercase;
		color: rgba(0, 0, 0, 0.68);
		white-space: nowrap;
	}

	/* Pulsing dot — live signal */
	.c-ticker__dot {
		display: block;
		width: 4px;
		height: 4px;
		border-radius: 50%;
		flex-shrink: 0;
		background: rgba(0, 0, 0, 0.68);
		animation: ticker-dot-pulse 2.2s ease-in-out infinite;
	}

	/* ── Clock block ─────────────────────────────────────────────── */

	.c-ticker__clock {
		flex-shrink: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0 clamp(8px, 1vw, 12px);
		border-right: 0.5px solid var(--color-rule-soft, rgba(255, 255, 255, 0.08));
		position: relative;
		min-width: clamp(60px, 7vw, 84px);
		overflow: hidden;
	}

	.c-ticker__clock-val {
		font-family: var(--font-editorial, 'Schibsted Grotesk', sans-serif);
		font-size: var(--broadcast-fz-xs, clamp(5px, 0.72vw, 7px));
		font-weight: var(--fw-bold, 700);
		color: rgba(255, 255, 255, 0.60);
		letter-spacing: 0.08em;
		white-space: nowrap;
		position: absolute;
		opacity: 1;
		transform: translateY(0);
		transition:
			opacity   220ms cubic-bezier(0, 0, 0.4, 1) 280ms,
			transform 220ms cubic-bezier(0, 0, 0.4, 1) 280ms;
	}

	.c-ticker__clock-val--countdown {
		color: #e05252;
		display: flex;
		align-items: center;
		gap: clamp(2px, 0.3vw, 4px);
	}

	.c-ticker__clock-icon {
		font-size: calc(var(--broadcast-fz-xs, clamp(5px, 0.72vw, 7px)) * 0.72);
		line-height: 1;
		opacity: 0.8;
	}

	/* Exiting clock value — fades out and slides up */
	.c-ticker__clock-val--out {
		opacity: 0;
		transform: translateY(-4px);
		transition:
			opacity   220ms cubic-bezier(0.4, 0, 1, 0),
			transform 220ms cubic-bezier(0.4, 0, 1, 0);
		pointer-events: none;
	}

	/* ── Scroll zone ─────────────────────────────────────────────── */

	.c-ticker__scroll {
		flex: 1;
		overflow: hidden;
		display: flex;
		align-items: center;
	}

	.c-ticker__track {
		display: flex;
		align-items: center;
		white-space: nowrap;
		will-change: transform;
		/* Duration set by JS (track.scrollWidth / 2 / 55). Default avoids flash. */
		animation: ticker-scroll 30s linear infinite;
	}

	.c-ticker__item {
		font-family: var(--font-editorial, 'Schibsted Grotesk', sans-serif);
		font-size: var(--broadcast-fz-xs, clamp(5px, 0.72vw, 7px));
		color: rgba(255, 255, 255, 0.72);
		letter-spacing: 0.04em;
		padding: 0 clamp(14px, 1.8vw, 22px);
	}

	/* Separator between items — neutral, never colored */
	.c-ticker__sep {
		font-family: var(--font-editorial, 'Schibsted Grotesk', sans-serif);
		font-size: var(--broadcast-fz-xs, clamp(5px, 0.72vw, 7px));
		color: rgba(255, 255, 255, 0.22);
		flex-shrink: 0;
	}

	/* ── Keyframes ───────────────────────────────────────────────── */

	@keyframes ticker-scroll {
		from { transform: translateX(0); }
		to   { transform: translateX(-50%); }
	}

	@keyframes ticker-dot-pulse {
		0%, 100% { opacity: 1;    }
		50%       { opacity: 0.18; }
	}
</style>
