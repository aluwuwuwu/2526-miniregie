<script lang="ts">
	import { login, auth } from '$lib/auth.svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';

	let username = $state('');
	let password = $state('');
	let error = $state('');
	let submitting = $state(false);

	const redirect = $derived(
		(page.url.searchParams.get('redirect') ?? '/').replace(/[^a-zA-Z0-9/_-]/g, '')
	);

	$effect(() => {
		if (!auth.loading && auth.participant) {
			goto(redirect);
		}
	});

	async function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		error = '';
		submitting = true;
		const result = await login(username, password);
		submitting = false;
		if (result.error) {
			error = result.error;
			return;
		}
		goto(redirect);
	}
</script>

<div class="o-page">
	<main class="c-login">
		<h1 class="c-login__title">MiniRégie</h1>

		<form class="c-login__form" onsubmit={handleSubmit}>
			{#if error}
				<p class="c-login__error" role="alert">{error}</p>
			{/if}

			<div class="c-field">
				<label class="c-field__label" for="username">Username</label>
				<input
					class="c-field__input"
					id="username"
					type="text"
					bind:value={username}
					autocomplete="username"
					required
				/>
			</div>

			<div class="c-field">
				<label class="c-field__label" for="password">Password</label>
				<input
					class="c-field__input"
					id="password"
					type="password"
					bind:value={password}
					autocomplete="current-password"
					required
				/>
			</div>

			<button class="c-btn c-btn--primary" type="submit" disabled={submitting}>
				{submitting ? 'Signing in…' : 'Sign in'}
			</button>
		</form>
	</main>
</div>