<script lang="ts">
	import type { MediaItem, YoutubeContent } from '@shared/types';
	import { broadcastUnlocked } from '$lib/jam-mode-state.svelte';

	interface Props { item: MediaItem; startSec?: number }
	let { item, startSec = 0 }: Props = $props();

	const content = $derived(item.content as YoutubeContent);

	let iframeEl: HTMLIFrameElement | undefined = $state();

	// Only update iframe src when the YouTube ID actually changes.
	// Setting iframe.src — even to the same value — reloads the video in all browsers.
	// We therefore track the last loaded ID and skip redundant assignments.
	// startSec is captured at load time — it is intentionally NOT reactive.
	let loadedId = '';
	$effect(() => {
		if (!iframeEl || !broadcastUnlocked.value) return;
		const id = content.youtubeId;
		if (id === loadedId) return;
		loadedId = id;
		const start = startSec > 0 ? `&start=${startSec}` : '';
		iframeEl.src =
			`https://www.youtube.com/embed/${id}` +
			`?autoplay=1&mute=0&controls=0&rel=0&modestbranding=1&enablejsapi=1${start}`;
	});
</script>

<div class="c-media-youtube">
	<iframe
		bind:this={iframeEl}
		class="c-media-youtube__frame"
		title={content.title}
		allow="autoplay; encrypted-media"
		allowfullscreen
	></iframe>

	{#if content.caption}
		<p class="c-media-youtube__caption">{content.caption}</p>
	{/if}
</div>

<style>
	.c-media-youtube {
		position: relative;
		width: 100%;
		height: 100%;
		background: #000;
		overflow: hidden;
	}

	.c-media-youtube__frame {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		border: none;
	}

	.c-media-youtube__caption {
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