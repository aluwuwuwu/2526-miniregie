<script lang="ts">
	import { auth } from '$lib/auth.svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';

	let { children } = $props();

	$effect(() => {
		if (auth.loading) return;
		if (!auth.participant || auth.participant.role !== 'admin') {
			goto(`/login?redirect=${encodeURIComponent(page.url.pathname)}`);
		}
	});
</script>

{#if !auth.loading && auth.participant?.role === 'admin'}
	{@render children()}
{/if}