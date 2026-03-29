import type { Server } from "socket.io";
import type { App, AppId, MediaItem } from "@shared/types";

// ─── BaseApp ──────────────────────────────────────────────────────────────────
//
// Abstract base for all broadcast apps.
// AppManager mounts the socket.io server before calling play(),
// so apps can emit events directly to clients without going through BroadcastManager.

export abstract class BaseApp implements App {
  abstract readonly id: AppId;
  abstract readonly outroMode: 'sequential' | 'concurrent' | 'none';

  protected io!: Server;

  /** Called by AppManager right after load(), before play(). */
  _mount(io: Server): void {
    this.io = io;
  }

  /** Returns app-specific state for HTTP polling. Override in subclasses. */
  getState(): unknown { return null; }

  abstract load(signal: AbortSignal): void;
  abstract play(): void;
  abstract stop(): Promise<void>;
  abstract remove(): void;
  abstract onPoolUpdate(item: MediaItem): void;
}