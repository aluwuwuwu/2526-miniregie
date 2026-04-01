import { EventEmitter } from 'node:events';
import type { Server } from 'socket.io';
import type { App, MediaItem } from '../../../shared/types.js';
import { BaseApp } from './base-app.js';

// ─── AppManager ───────────────────────────────────────────────────────────────
//
// Manages the lifecycle of the active broadcast app.

export class AppManager extends EventEmitter {
  private readonly io: Server;
  private currentApp: App | null = null;
  private abortController: AbortController | null = null;

  constructor(io: Server) {
    super();
    this.io = io;
  }

  get current(): App | null {
    return this.currentApp;
  }

  // ─── Lifecycle ──────────────────────────────────────────────────────────────

  async transition(app: App): Promise<void> {
    if (this.currentApp) {
      this.abortController?.abort();
      await this.currentApp.stop();
      this.currentApp.remove();
    }

    this.abortController = new AbortController();
    this.currentApp = app;
    app.load(this.abortController.signal);
    if (app instanceof BaseApp) app._mount(this.io);
    app.play();
  }

  reset(): void {
    this.abortController?.abort();
    this.abortController = null;
    void this.currentApp?.stop();
    this.currentApp?.remove();
    this.currentApp = null;
  }

  destroy(): void {
    this.abortController?.abort();
    void this.currentApp?.stop();
  }

  getActiveAppState(): unknown {
    return this.currentApp instanceof BaseApp ? this.currentApp.getState() : null;
  }

  // ─── Pool delegation ────────────────────────────────────────────────────────

  onPoolUpdate(item: MediaItem): void {
    this.currentApp?.onPoolUpdate(item);
  }
}