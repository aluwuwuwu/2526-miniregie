<script lang="ts">
	import { serverState } from '$lib/server-state.svelte';
	import { poolItems, contentPreview, formatSubmittedAt } from '$lib/pool-items.svelte';
	import type { MediaItem } from '@shared/types';

	const jamLayout  = $derived(serverState.jamLayout);

	const pendingLoud = $derived(
		poolItems.items.filter((i: MediaItem) => ['youtube', 'clip'].includes(i.type) && i.status === 'ready'),
	);
	const pendingVisual = $derived(
		poolItems.items.filter((i: MediaItem) => ['photo', 'gif'].includes(i.type) && i.status === 'ready'),
	);
	const pendingNote = $derived(
		poolItems.items.filter((i: MediaItem) => i.type === 'note' && i.status === 'ready'),
	);
</script>

<section class="c-admin__section">
	<p class="c-admin__label">Layout — {jamLayout ?? 'IDLE'}</p>

	<div class="c-scene-queues__queues">
		{#each [
			{ label: `Loud (${pendingLoud.length})`, items: pendingLoud },
			{ label: `Visual (${pendingVisual.length})`, items: pendingVisual },
			{ label: `Note (${pendingNote.length})`, items: pendingNote },
		] as queue}
			<div>
				<p class="c-scene-queues__queue-label">{queue.label}</p>
				{#each queue.items as item (item.id)}
					<div class="c-scene-queues__row c-scene-queues__row--pending">
						<span class="c-scene-queues__type">{item.type}</span>
						<span class="c-scene-queues__label">{contentPreview(item)}</span>
						<span class="c-scene-queues__meta">{formatSubmittedAt(item.submittedAt)}</span>
					</div>
				{/each}
				{#if queue.items.length === 0}
					<div class="c-scene-queues__row">
						<span class="c-scene-queues__label">—</span>
					</div>
				{/if}
			</div>
		{/each}
	</div>
</section>