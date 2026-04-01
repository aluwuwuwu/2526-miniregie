<script lang="ts">
	import { jamModeState, type SlotTimerMeta } from '$lib/jam-mode-state.svelte';
	import { serverState } from '$lib/server-state.svelte';
	import { contentPreview } from '$lib/pool-items.svelte';

	type SlotName = 'loud' | 'visual' | 'note';

	const LABELS: Record<SlotName, string> = {
		loud:   'Loud',
		visual: 'Visual',
		note:   'Note',
	};

	let now = $state(Date.now());
	let rafId: number;

	$effect(() => {
		function tick() {
			now = Date.now();
			rafId = requestAnimationFrame(tick);
		}
		rafId = requestAnimationFrame(tick);
		return () => cancelAnimationFrame(rafId);
	});

	function remaining(meta: SlotTimerMeta): number {
		return Math.max(0, meta.durationMs - (now - meta.startedAt));
	}

	function remainingLabel(meta: SlotTimerMeta): string {
		const totalSec = Math.ceil(remaining(meta) / 1000);
		const m = Math.floor(totalSec / 60);
		const s = totalSec % 60;
		return m > 0 ? `${m}m ${s.toString().padStart(2, '0')}s` : `${s}s`;
	}

	const activeSlots = $derived(
		(Object.entries(jamModeState.slotTimings) as [SlotName, SlotTimerMeta][])
			.filter(([, meta]) => remaining(meta) > 0),
	);

	const enrich = $derived(jamModeState.enrich);

	function enrichRemaining(): number {
		if (!enrich) return 0;
		return Math.max(0, enrich.checkAt - now);
	}

	function enrichRemainingLabel(): string {
		const totalSec = Math.ceil(enrichRemaining() / 1000);
		const m = Math.floor(totalSec / 60);
		const s = totalSec % 60;
		return m > 0 ? `${m}m ${s.toString().padStart(2, '0')}s` : `${s}s`;
	}
</script>

{#if activeSlots.length > 0 || enrich}
	<section class="c-admin__section">
		<p class="c-admin__label">Slot timers</p>
		<div class="c-slot-timers">
			{#each activeSlots as [slot, meta] (slot)}
				{@const slotItem = serverState.jamSlots[slot]}
				<div class="c-slot-timers__row">
					<span class="c-slot-timers__name">{LABELS[slot]}</span>
					<progress
						value={remaining(meta)}
						max={meta.durationMs}
					></progress>
					<span class="c-slot-timers__time">{remainingLabel(meta)}</span>
					{#if slotItem}
						<span class="c-slot-timers__media">{contentPreview(slotItem)}</span>
					{/if}
				</div>
			{/each}
			{#if enrich}
				<div class="c-slot-timers__row c-slot-timers__row--enrich">
					<span class="c-slot-timers__name">Enrich</span>
					<progress
						value={enrichRemaining()}
						max={enrich.intervalMs}
					></progress>
					<span class="c-slot-timers__time">{enrichRemainingLabel()}</span>
				</div>
			{/if}
		</div>
	</section>
{/if}
