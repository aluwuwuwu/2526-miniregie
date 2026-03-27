import type { Participant } from '@shared/types';

interface AuthState {
	participant: Participant | null;
	loading: boolean;
}

export const auth = $state<AuthState>({ participant: null, loading: true });

export async function checkSession(): Promise<void> {
	try {
		const res = await fetch('/auth/me');
		auth.participant = res.ok ? ((await res.json()) as { participant: Participant }).participant : null;
	} catch {
		auth.participant = null;
	} finally {
		auth.loading = false;
	}
}

export async function login(username: string, password: string): Promise<{ error?: string }> {
	const res = await fetch('/auth/login', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ username, password }),
	});
	const data = (await res.json()) as { participant?: Participant; error?: string };
	if (!res.ok) return { error: data.error ?? 'Login failed' };
	auth.participant = data.participant ?? null;
	return {};
}

export async function logout(): Promise<void> {
	await fetch('/auth/logout', { method: 'POST' });
	auth.participant = null;
}