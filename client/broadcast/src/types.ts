import type { GlobalState } from '@shared/types';
import type { Socket } from 'socket.io-client';

// Client-side app contract (distinct from server-side App interface in shared/types.ts).
// Each app is instantiated fresh via a factory function — never reused across mounts.
export interface BroadcastApp {
  mount(container: HTMLElement, state: GlobalState, socket: Socket): void;
  unmount(): void;
}

// Factory signature — each call returns a fresh, independent instance.
export type AppFactory = () => BroadcastApp;