import type { BroadcastApp } from '../types.js';
import type { GlobalState } from '@shared/types';
import type { Socket } from 'socket.io-client';

export function createPreJamIdle(): BroadcastApp {
  let tickTimer: ReturnType<typeof setInterval> | null = null;

  return {
    mount(container: HTMLElement, _state: GlobalState, _socket: Socket): void {
      container.className = 'app app--pre-jam-idle';

      const el = document.createElement('div');
      el.className = 'pre-jam-idle';

      const title = document.createElement('p');
      title.className = 'pre-jam-idle__title';
      title.textContent = 'JAM bientôt';

      const clock = document.createElement('p');
      clock.className = 'pre-jam-idle__clock';

      function updateClock(): void {
        const now = new Date();
        const hh = String(now.getHours()).padStart(2, '0');
        const mm = String(now.getMinutes()).padStart(2, '0');
        const ss = String(now.getSeconds()).padStart(2, '0');
        clock.textContent = `${hh}:${mm}:${ss}`;
      }

      updateClock();
      tickTimer = setInterval(updateClock, 1_000);

      el.appendChild(title);
      el.appendChild(clock);
      container.appendChild(el);
    },

    unmount(): void {
      if (tickTimer !== null) {
        clearInterval(tickTimer);
        tickTimer = null;
      }
    },
  };
}