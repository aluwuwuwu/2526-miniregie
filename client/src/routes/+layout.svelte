<script lang="ts">
	import '../styles/main.css';
	import favicon from '$lib/assets/favicon.svg';
	import { checkSession } from '$lib/auth.svelte';
	import { onMount } from 'svelte';

	let { children } = $props();

	onMount(() => {
		checkSession();
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

{@render children()}
