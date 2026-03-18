import { describe, it, expect, beforeEach } from 'vitest';
import { flushSync } from 'svelte';
import type { Participant } from '@shared/types.js';

const PARTICIPANT: Participant = {
  id: 'p1',
  username: 'alice',
  displayName: 'Alice',
  team: 'Team A',
  role: 'participant',
  avatarUrl: '/uploads/alice.jpg',
  firstSeenAt: 1000,
  lastSeenAt: 2000,
  banned: false,
  bannedAt: null,
  banReason: null,
};

describe('participantState store', () => {
  // Re-import fresh module each test to reset state
  it('initialises with value null', async () => {
    const { participantState } = await import('./stores.svelte.js');
    expect(participantState.value).toBeNull();
  });

  it('can be set to a participant', async () => {
    const { participantState } = await import('./stores.svelte.js');
    flushSync(() => {
      participantState.value = PARTICIPANT;
    });
    expect(participantState.value?.displayName).toBe('Alice');
    expect(participantState.value?.id).toBe('p1');
  });

  it('can be reset to null', async () => {
    const { participantState } = await import('./stores.svelte.js');
    flushSync(() => {
      participantState.value = PARTICIPANT;
    });
    flushSync(() => {
      participantState.value = null;
    });
    expect(participantState.value).toBeNull();
  });

  it('reflects reactive updates', async () => {
    const { participantState } = await import('./stores.svelte.js');
    const log: Array<string | null> = [];

    const cleanup = $effect.root(() => {
      $effect(() => {
        log.push(participantState.value?.displayName ?? null);
      });
    });

    flushSync();
    expect(log).toEqual([null]);

    flushSync(() => {
      participantState.value = PARTICIPANT;
    });
    expect(log).toEqual([null, 'Alice']);

    flushSync(() => {
      participantState.value = null;
    });
    expect(log).toEqual([null, 'Alice', null]);

    cleanup();
  });
});
