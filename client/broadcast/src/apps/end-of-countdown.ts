import type { BroadcastApp } from '../types.js';
import type { GlobalState } from '@shared/types';
import type { Socket } from 'socket.io-client';

export function createEndOfCountdown(): BroadcastApp {
  return {
    mount(container: HTMLElement, state: GlobalState, _socket: Socket): void {
      container.className = 'app app--end-of-countdown';

      const el = document.createElement('div');
      el.className = 'end-of-countdown';

      const title = document.createElement('p');
      title.className = 'end-of-countdown__title';
      title.textContent = 'Merci à tous !';

      const stats = document.createElement('div');
      stats.className = 'end-of-countdown__stats';

      const totalEl = document.createElement('p');
      totalEl.className = 'end-of-countdown__stat';
      totalEl.textContent = `${state.pool.total} soumissions au total`;

      const freshEl = document.createElement('p');
      freshEl.className = 'end-of-countdown__stat';
      freshEl.textContent = `${state.pool.fresh} soumissions fraîches`;

      stats.appendChild(totalEl);
      stats.appendChild(freshEl);

      el.appendChild(title);
      el.appendChild(stats);
      container.appendChild(el);
    },

    unmount(): void {
      // No timers or listeners to clean up.
    },
  };
}