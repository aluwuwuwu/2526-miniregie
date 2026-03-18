import type { BroadcastApp } from '../types.js';
import type { GlobalState } from '@shared/types';
import type { Socket } from 'socket.io-client';

function formatMs(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1_000));
  const hh = Math.floor(total / 3_600);
  const mm = Math.floor((total % 3_600) / 60);
  const ss = total % 60;
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
}

export function createCountdownToJam(): BroadcastApp {
  let displayEl: HTMLElement | null = null;
  let tickHandler: ((payload: { timeRemaining: number | null }) => void) | null = null;
  let boundSocket: Socket | null = null;

  return {
    mount(container: HTMLElement, state: GlobalState, socket: Socket): void {
      container.className = 'app app--countdown-to-jam';

      const el = document.createElement('div');
      el.className = 'countdown-to-jam';

      const label = document.createElement('p');
      label.className = 'countdown-to-jam__label';
      label.textContent = 'La JAM commence dans';

      const display = document.createElement('p');
      display.className = 'countdown-to-jam__display';
      display.textContent = state.jam.timeRemaining !== null
        ? formatMs(state.jam.timeRemaining)
        : '--:--:--';

      displayEl = display;

      el.appendChild(label);
      el.appendChild(display);
      container.appendChild(el);

      tickHandler = ({ timeRemaining }) => {
        if (displayEl !== null && timeRemaining !== null) {
          displayEl.textContent = formatMs(timeRemaining);
        }
      };

      boundSocket = socket;
      socket.on('tick', tickHandler);
    },

    unmount(): void {
      if (boundSocket !== null && tickHandler !== null) {
        boundSocket.off('tick', tickHandler);
      }
      displayEl = null;
      tickHandler = null;
      boundSocket = null;
    },
  };
}