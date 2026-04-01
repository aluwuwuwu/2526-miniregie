<script lang="ts">
	import type { MediaItem, LinkContent } from '@shared/types';
	import { fade } from 'svelte/transition';

	interface Props { item: MediaItem }
	let { item }: Props = $props();

	const content = $derived(item.content as LinkContent);
</script>

<div class="c-media-link">
	{#key item.id}
		<div in:fade={{ duration: 300 }} class="c-media-link__inner">
			{#if content.thumbnail}
				<img class="c-media-link__thumb" src={content.thumbnail} alt="" />
			{/if}

			<div class="c-media-link__body">
				{#if content.siteName}
					<p class="c-media-link__site">{content.siteName}</p>
				{/if}
				{#if content.title}
					<p class="c-media-link__title">{content.title}</p>
				{/if}
				{#if content.description}
					<p class="c-media-link__desc">{content.description}</p>
				{/if}
				{#if content.caption}
					<p class="c-media-link__caption">{content.caption}</p>
				{/if}
			</div>
		</div>
	{/key}
</div>

<style>
	.c-media-link {
		position: relative;
		width: 100%;
		height: 100%;
		background: #0d0f12;
		overflow: hidden;
		container-type: size;
	}

	.c-media-link__inner {
		display: flex;
		flex-direction: column;
		width: 100%;
		height: 100%;
	}

	.c-media-link__thumb {
		width: 100%;
		flex: 1;
		min-height: 0;
		object-fit: cover;
	}

	.c-media-link__body {
		flex-shrink: 0;
		padding: 6% 8%;
		display: flex;
		flex-direction: column;
		gap: 0.3em;
	}

	.c-media-link__site {
		margin: 0;
		font-family: 'Schibsted Grotesk', sans-serif;
		font-size: clamp(0.45rem, 1.8cqh, 0.65rem);
		color: #1ac0d7;
		text-transform: uppercase;
		letter-spacing: 0.08em;
	}

	.c-media-link__title {
		margin: 0;
		font-family: 'Schibsted Grotesk', sans-serif;
		font-size: clamp(0.65rem, 3cqh, 1rem);
		font-weight: 600;
		color: #f0f0f0;
		line-height: 1.25;
	}

	.c-media-link__desc {
		margin: 0;
		font-family: 'Schibsted Grotesk', sans-serif;
		font-size: clamp(0.55rem, 2cqh, 0.78rem);
		color: #8a8a8a;
		line-height: 1.4;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	.c-media-link__caption {
		margin: 0.3em 0 0;
		font-family: 'Schibsted Grotesk', sans-serif;
		font-size: clamp(0.5rem, 1.8cqh, 0.7rem);
		color: #5a5a5a;
		font-style: italic;
	}
</style>