import type { GlobalState, MediaItem, TickerContent } from '@shared/types';
import type { Socket } from 'socket.io-client';

// ─── Countdown ────────────────────────────────────────────────────────────────

function formatMs(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1_000));
  const hh = Math.floor(total / 3_600);
  const mm = Math.floor((total % 3_600) / 60);
  const ss = total % 60;
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
}

type CountdownHint = 'compact' | 'large' | 'fullscreen';

function getCountdownHint(timeRemaining: number | null): CountdownHint {
  if (timeRemaining === null) return 'compact';
  if (timeRemaining <= 10 * 60_000) return 'fullscreen';
  if (timeRemaining <= 60 * 60_000) return 'large';
  return 'compact';
}

// ─── Ticker ───────────────────────────────────────────────────────────────────

class TickerEngine {
  private items: MediaItem[] = [];
  private cursor = 0;
  private animationId: number | null = null;
  private el: HTMLElement;
  private contentEl: HTMLElement;

  constructor(container: HTMLElement) {
    this.el = document.createElement('div');
    this.el.className = 'ticker-bar';

    const label = document.createElement('span');
    label.className = 'ticker-bar__label';
    label.textContent = '▸ JOSÉ';

    this.contentEl = document.createElement('span');
    this.contentEl.className = 'ticker-content';

    this.el.appendChild(label);
    this.el.appendChild(this.contentEl);
    container.appendChild(this.el);
  }

  update(snapshot: MediaItem[]): void {
    this.items = snapshot.filter(i => i.type === 'ticker' && i.status === 'ready');
    if (this.items.length === 0) {
      this.el.style.display = 'none';
      return;
    }
    this.el.style.display = '';
    if (this.cursor >= this.items.length) this.cursor = 0;
    this.renderCurrent();
  }

  private renderCurrent(): void {
    if (this.items.length === 0) return;
    const item = this.items[this.cursor % this.items.length];
    if (!item) return;
    const c = item.content as TickerContent;
    const text = c.label ? `${c.label} — ${c.text}` : c.text;

    // Remove existing animation by cloning the element
    const newContent = this.contentEl.cloneNode(false) as HTMLElement;
    newContent.className = 'ticker-content';
    newContent.textContent = text;

    // Listen for animation end to advance to next ticker item
    newContent.addEventListener('animationend', () => {
      this.cursor = (this.cursor + 1) % (this.items.length || 1);
      this.renderCurrent();
    }, { once: true });

    this.contentEl.replaceWith(newContent);
    this.contentEl = newContent;
  }

  destroy(): void {
    this.el.remove();
  }
}

// ─── QR code display ──────────────────────────────────────────────────────────

function createQrEl(goUrl: string): HTMLElement {
  const el = document.createElement('div');
  el.className = 'qr-block';

  const urlEl = document.createElement('p');
  urlEl.className = 'qr-block__url';
  urlEl.textContent = goUrl;

  el.appendChild(urlEl);
  return el;
}

// ─── PersistentLayer public API ───────────────────────────────────────────────

export class PersistentLayer {
  private container: HTMLElement;
  private countdownEl: HTMLElement;
  private ticker: TickerEngine;
  private currentHint: CountdownHint = 'compact';

  constructor(container: HTMLElement, goUrl: string) {
    this.container = container;

    // Countdown
    this.countdownEl = document.createElement('div');
    this.countdownEl.className = 'countdown countdown--compact';
    container.appendChild(this.countdownEl);

    // QR
    const qr = createQrEl(goUrl);
    container.appendChild(qr);

    // Ticker
    this.ticker = new TickerEngine(container);
  }

  onTick(payload: { timeRemaining: number | null }): void {
    const { timeRemaining } = payload;
    if (timeRemaining !== null) {
      this.countdownEl.textContent = formatMs(timeRemaining);
    }

    const hint = getCountdownHint(timeRemaining);
    if (hint !== this.currentHint) {
      this.countdownEl.classList.remove(`countdown--${this.currentHint}`);
      this.countdownEl.classList.add(`countdown--${hint}`);
      this.currentHint = hint;
    }
  }

  onState(state: GlobalState): void {
    // Update countdown from state if tick hasn't arrived yet
    this.onTick({ timeRemaining: state.jam.timeRemaining });
    // Update ticker pool
    this.ticker.update(state.pool.queueSnapshot);
  }

  destroy(): void {
    this.ticker.destroy();
    this.container.innerHTML = '';
  }
}

export function initPersistentLayer(
  container: HTMLElement,
  socket: Socket,
  initialState: GlobalState,
  goUrl: string
): PersistentLayer {
  const layer = new PersistentLayer(container, goUrl);
  layer.onState(initialState);

  socket.on('tick', (payload: { timeRemaining: number | null }) => {
    layer.onTick(payload);
  });

  socket.on('state', (state: GlobalState) => {
    layer.onState(state);
  });

  return layer;
}