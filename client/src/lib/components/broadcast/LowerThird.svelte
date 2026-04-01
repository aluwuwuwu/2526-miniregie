<script lang="ts">
	interface Props {
		visible: boolean;
		label: string;
		name: string;
		role?: string;
	}

	let { visible, label, name, role }: Props = $props();
</script>

<div class="c-lower-third" class:c-lower-third--visible={visible} aria-live="polite">
	<div class="c-lower-third__label">
		<span>{label || 'M4TV'}</span>
	</div>
	<div class="c-lower-third__block">
		<div class="c-lower-third__name">{name}</div>
		{#if role}
			<div class="c-lower-third__role">{role}</div>
		{/if}
	</div>
</div>

<style>
	.c-lower-third {
		position: absolute;
		left: var(--broadcast-space-safe, 2.2%);
		bottom: calc(var(--broadcast-h-ticker, clamp(18px, 3.2%, 26px)) + var(--broadcast-space-safe, 2.2%) + 6px);
		z-index: 20;
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 1.5px;
	}

	/* ── Cyan tag — seule surface colorée du lower-third ─────── */

	.c-lower-third__label {
		background: var(--color-brand, #1ac0d7);
		padding: clamp(1.5px, 0.22vw, 2.5px) clamp(5px, 0.7vw, 7px);
		/* Default: hidden. Exit transition: power2.in, no delay */
		clip-path: inset(0 100% 0 0);
		transition: clip-path 160ms cubic-bezier(0.4, 0, 1, 0);
	}

	.c-lower-third__label span {
		display: block;
		font-family: var(--font-editorial, 'Schibsted Grotesk', sans-serif);
		font-size: var(--broadcast-fz-xs, clamp(5px, 0.72vw, 7px));
		font-weight: var(--fw-bold, 700);
		letter-spacing: 0.13em;
		text-transform: uppercase;
		color: rgba(0, 0, 0, 0.68);
		line-height: 1;
		white-space: nowrap;
	}

	/* ── White editorial block ────────────────────────────────── */

	.c-lower-third__block {
		background: var(--color-surface, #f8f7f5);
		padding: clamp(4px, 0.55vw, 6px) clamp(8px, 1.1vw, 12px);
		/* Default: hidden. Exit transition: power2.in, no delay */
		clip-path: inset(0 100% 0 0);
		transition: clip-path 160ms cubic-bezier(0.4, 0, 1, 0);
	}

	/* Name — Fraunces 400, the editorial serif for human names */
	.c-lower-third__name {
		font-family: var(--font-display, 'Fraunces', serif);
		font-size: clamp(20px, 2.2vw, 56px);
		font-weight: 400;
		font-style: normal;
		color: #0a0a0a;
		line-height: 1.1;
		letter-spacing: 0.01em;
		white-space: nowrap;
	}

	/* Role — Schibsted Grotesk, metadata below the name */
	.c-lower-third__role {
		font-family: var(--font-editorial, 'Schibsted Grotesk', sans-serif);
		font-size: var(--broadcast-fz-xs, clamp(5px, 0.72vw, 7px));
		font-weight: var(--fw-regular, 400);
		color: #686868;
		letter-spacing: 0.10em;
		text-transform: uppercase;
		margin-top: clamp(2px, 0.3vw, 4px);
		line-height: 1;
		white-space: nowrap;
	}

	/* ── Visible state — entry wipes ─────────────────────────── */

	/* Tag arrives first: 180ms power2.out, no delay */
	.c-lower-third--visible .c-lower-third__label {
		clip-path: inset(0 0% 0 0);
		transition: clip-path 180ms cubic-bezier(0, 0, 0.4, 1) 0ms;
	}

	/* Block arrives second: 320ms power2.out, 120ms delay (60ms overlap with tag) */
	.c-lower-third--visible .c-lower-third__block {
		clip-path: inset(0 0% 0 0);
		transition: clip-path 320ms cubic-bezier(0, 0, 0.4, 1) 120ms;
	}
</style>
