<script lang="ts">
	import type { MediaItem, NoteContent } from '@shared/types';

	interface Props { item: MediaItem }
	let { item }: Props = $props();

	const content = $derived(item.content as NoteContent);
</script>

{#key item.id}
	<div class="c-note-slot">
		<article class="c-note-card">
			<p class="c-note-card__eyebrow">Note</p>
			<blockquote class="c-note-card__text">{content.text}</blockquote>
			<div class="c-note-card__attribution">
				<span class="c-note-card__author">{item.author.displayName}</span>
				{#if item.author.team}
					<span class="c-note-card__team">{item.author.team}</span>
				{/if}
			</div>
		</article>
	</div>
{/key}

<style>
	/* Transparent container — the broadcast background shows through */
	.c-note-slot {
		position: relative;
		width: 100%;
		height: 100%;
	}

	/* White editorial card — centered above geometric center (Tschichold) */
	.c-note-card {
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -54%);
		max-width: 58%;
		max-height: 72%;
		overflow: hidden;
		background: var(--color-surface, #f8f7f5);
		padding: clamp(20px, 3.2vw, 40px) clamp(24px, 3.8vw, 48px);
	}

	/* Eyebrow — "Note", ghost label above the body */
	.c-note-card__eyebrow {
		font-family: var(--font-editorial, 'Schibsted Grotesk', sans-serif);
		font-size: var(--broadcast-fz-xs, clamp(5px, 0.72vw, 7px));
		font-weight: 400;
		color: rgba(0, 0, 0, 0.35);
		letter-spacing: 0.14em;
		text-transform: uppercase;
		margin-bottom: clamp(10px, 1.4vw, 16px);
		/* Reveal: clip from top downward */
		animation: note-eyebrow-in 500ms cubic-bezier(0.16, 1, 0.3, 1) both;
	}

	/* Body text — primary voice of the participant */
	.c-note-card__text {
		font-family: var(--font-editorial, 'Schibsted Grotesk', sans-serif);
		font-size: clamp(16px, 1.55vw, 40px);
		font-weight: 400;
		font-style: normal;
		color: rgba(0, 0, 0, 0.84);
		line-height: 1.5;
		letter-spacing: -0.01em;
		margin: 0;
		padding: 0;
		quotes: none;
		/* Reveal: translate up from below, clipped */
		animation: note-text-in 560ms cubic-bezier(0.16, 1, 0.3, 1) 60ms both;
	}

	/* Attribution block — author + team, after the body */
	.c-note-card__attribution {
		display: flex;
		flex-direction: column;
		gap: clamp(2px, 0.3vw, 4px);
		margin-top: clamp(14px, 2vw, 22px);
		/* Slides up 7px after text, per spec */
		animation: note-attr-in 400ms cubic-bezier(0.16, 1, 0.3, 1) 280ms both;
	}

	/* Author name — Fraunces 300, the only serif in the note card */
	.c-note-card__author {
		display: block;
		font-family: var(--font-display, 'Fraunces', serif);
		font-size: clamp(13px, 1.10vw, 28px);
		font-weight: 300;
		font-style: normal;
		color: rgba(0, 0, 0, 0.60);
		letter-spacing: 0.01em;
		line-height: 1;
	}

	/* Team — ghost metadata, above the 28% floor for dark-on-white */
	.c-note-card__team {
		display: block;
		font-family: var(--font-editorial, 'Schibsted Grotesk', sans-serif);
		font-size: clamp(5px, 0.65vw, 7px);
		font-weight: 400;
		color: rgba(0, 0, 0, 0.38);
		letter-spacing: 0.10em;
		text-transform: uppercase;
		line-height: 1;
	}

	/* ── Keyframes ────────────────────────────────────────────── */

	@keyframes note-eyebrow-in {
		from { opacity: 0; transform: translateY(4px); }
		to   { opacity: 1; transform: translateY(0);   }
	}

	@keyframes note-text-in {
		from { opacity: 0; transform: translateY(10px); }
		to   { opacity: 1; transform: translateY(0);    }
	}

	@keyframes note-attr-in {
		from { opacity: 0; transform: translateY(7px); }
		to   { opacity: 1; transform: translateY(0);   }
	}
</style>
