import { EventEmitter } from 'node:events';
import type { App, MediaItem } from '../../../shared/types.js';

// ─── AppManager ───────────────────────────────────────────────────────────────
//
// Manages the lifecycle of the active broadcast app.

export class AppManager extends EventEmitter {
  private currentApp: App | null = null;
  private abortController: AbortController | null = null;

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
    app.play();
  }

  reset(): void {
    this.abortController?.abort();
    this.abortController = null;
    this.currentApp?.remove();
    this.currentApp = null;
  }

  destroy(): void {
    this.abortController?.abort();
    void this.currentApp?.stop();
  }

  // ─── Pool delegation ────────────────────────────────────────────────────────

  onPoolUpdate(item: MediaItem): void {
    this.currentApp?.onPoolUpdate(item);
  }
}