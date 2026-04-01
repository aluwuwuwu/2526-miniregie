<script lang="ts">
	import type { MediaItem, GifContent } from '@shared/types';
	import { fade } from 'svelte/transition';

	interface Props { item: MediaItem }
	let { item }: Props = $props();

	const content = $derived(item.content as GifContent);
</script>

<div class="c-media-gif">
	{#key content.url}
		<img
			in:fade={{ duration: 300 }}
			class="c-media-gif__img"
			src={content.url}
			alt={content.caption ?? ''}
		/>
	{/key}
</div>

<style>
	.c-media-gif {
		position: relative;
		width: 100%;
		height: 100%;
		background: #08090b;
		overflow: hidden;
	}

	.c-media-gif__img {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		object-fit: contain; /* preserve aspect ratio — GIFs often have specific ratios */
	}

	.c-media-gif__caption {
		position: absolute;
		bottom: 0;
		left: 0;
		right: 0;
		margin: 0;
		padding: 0.4em 0.7em;
		background: rgba(8, 9, 11, 0.82);
		color: #e0e0e0;
		font-family: 'Schibsted Grotesk', sans-serif;
		font-size: clamp(0.6rem, 1.4cqi, 0.85rem);
		line-height: 1.3;
	}
</style>