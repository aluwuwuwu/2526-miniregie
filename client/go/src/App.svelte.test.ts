import { describe, it, expect, vi, afterEach } from 'vitest';
import { mount, unmount, flushSync } from 'svelte';
import App from './App.svelte';
import type { Participant } from '@shared/types.js';

// ─── Mock api ─────────────────────────────────────────────────────────────────

vi.mock('./lib/api.js', () => ({
  api: {
    auth: {
      me: vi.fn(),
      login: vi.fn(),
      logout: vi.fn(),
    },
    go: {
      status: vi.fn().mockResolvedValue({ jamStatus: 'idle', myItems: [] }),
      teams: vi.fn().mockResolvedValue([]),
    },
  },
  isApiError: (e: unknown) =>
    typeof e === 'object' && e !== null && 'status' in e,
}));

const PARTICIPANT: Participant = {
  id: 'p1',
  username:    'alice',
  displayName: 'Alice',
  team:        'Team A',
  role:        'participant',
  avatarUrl:   '/uploads/alice.jpg',
  firstSeenAt: 1000,
  lastSeenAt:  2000,
  banned:      false,
  bannedAt:    null,
  banReason:   null,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function mountApp() {
  const target = document.createElement('div');
  document.body.appendChild(target);
  const instance = mount(App, { target });
  return { target, instance };
}

afterEach(() => {
  document.body.innerHTML = '';
  vi.clearAllMocks();
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('App routing', () => {
  it('shows the loading spinner on first render', async () => {
    const { api } = await import('./lib/api.js');
    vi.mocked(api.auth.me).mockResolvedValue(null);

    const { target, instance } = mountApp();
    flushSync();

    expect(target.querySelector('.spinner')).not.toBeNull();
    unmount(instance);
  });

  it('shows the login screen when session is absent', async () => {
    const { api } = await import('./lib/api.js');
    vi.mocked(api.auth.me).mockResolvedValue(null);

    const { target, instance } = mountApp();

    await vi.waitFor(() => {
      expect(target.querySelector('.spinner')).toBeNull();
    });

    // Login component renders a form
    expect(target.querySelector('form')).not.toBeNull();
    unmount(instance);
  });

  it('shows the dashboard when session has avatarUrl', async () => {
    const { api } = await import('./lib/api.js');
    vi.mocked(api.auth.me).mockResolvedValue({ participant: PARTICIPANT });

    const { target, instance } = mountApp();

    await vi.waitFor(() => {
      expect(target.querySelector('.spinner')).toBeNull();
    });

    // Dashboard renders — login form must not be present
    expect(target.querySelector('form[data-form="login"]')).toBeNull();
    unmount(instance);
  });

  it('shows onboarding when session has no avatarUrl', async () => {
    const { api } = await import('./lib/api.js');
    const noAvatar = { ...PARTICIPANT, avatarUrl: null };
    vi.mocked(api.auth.me).mockResolvedValue({ participant: noAvatar });

    const { target, instance } = mountApp();

    await vi.waitFor(() => {
      expect(target.querySelector('.spinner')).toBeNull();
    });

    // Onboarding renders an avatar upload input
    expect(target.querySelector('input[type="file"]')).not.toBeNull();
    unmount(instance);
  });

  it('falls back to login on network error', async () => {
    const { api } = await import('./lib/api.js');
    vi.mocked(api.auth.me).mockRejectedValue({ status: 0, error: 'Connexion perdue.' });

    const { target, instance } = mountApp();

    await vi.waitFor(() => {
      expect(target.querySelector('.spinner')).toBeNull();
    });

    expect(target.querySelector('form')).not.toBeNull();
    unmount(instance);
  });
});
