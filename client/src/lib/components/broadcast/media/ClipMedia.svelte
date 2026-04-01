<script lang="ts">
	import type { MediaItem, ClipContent } from '@shared/types';

	interface Props { item: MediaItem }
	let { item }: Props = $props();

	const content = $derived(item.content as ClipContent);

	let videoEl: HTMLVideoElement | undefined = $state();

	// Only reload when the URL actually changes — same as YoutubeMedia's approach.
	// Calling video.load() when the src hasn't changed would restart playback.
	let loadedUrl = '';
	$effect(() => {
		if (!videoEl) return;
		const url = content.url;
		if (url === loadedUrl) return;
		loadedUrl = url;
		videoEl.src = url;
		videoEl.load();
		videoEl.play().catch(() => {/* autoplay policy — silently ignore */});
	});
</script>

<div class="c-media-clip">
	<video
		bind:this={videoEl}
		class="c-media-clip__video"
		autoplay
		loop
		playsinline
	></video>

	{#if content.caption}
		<p class="c-media-clip__caption">{content.caption}</p>
	{/if}
</div>

<style>
	.c-media-clip {
		position: relative;
		width: 100%;
		height: 100%;
		background: #000;
		overflow: hidden;
	}

	.c-media-clip__video {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.c-media-clip__caption {
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