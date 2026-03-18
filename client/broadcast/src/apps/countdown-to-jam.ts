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
  let nextTriggerAt: number | null = null;
  let intervalId: ReturnType<typeof setInterval> | null = null;
  let stateHandler: ((s: GlobalState) => void) | null = null;
  let boundSocket: Socket | null = null;

  function tick(): void {
    if (displayEl === null) return;
    if (nextTriggerAt === null) {
      displayEl.textContent = '--:--:--';
      return;
    }
    const remaining = nextTriggerAt - Date.now();
    displayEl.textContent = formatMs(remaining > 0 ? remaining : 0);
  }

  return {
    mount(container: HTMLElement, state: GlobalState, socket: Socket): void {
      container.className = 'app app--countdown-to-jam';

      nextTriggerAt = state.broadcast.nextTriggerAt;

      const el = document.createElement('div');
      el.className = 'countdown-to-jam';

      const label = document.createElement('p');
      label.className = 'countdown-to-jam__label';
      label.textContent = 'La JAM commence dans';

      const display = document.createElement('p');
      display.className = 'countdown-to-jam__display';
      displayEl = display;

      el.appendChild(label);
      el.appendChild(display);
      container.appendChild(el);

      tick();
      intervalId = setInterval(tick, 1_000);

      // Keep nextTriggerAt in sync if schedule fires while mounted
      stateHandler = (s: GlobalState) => {
        nextTriggerAt = s.broadcast.nextTriggerAt;
      };
      boundSocket = socket;
      socket.on('state', stateHandler);
    },

    unmount(): void {
      if (intervalId !== null) clearInterval(intervalId);
      if (boundSocket !== null && stateHandler !== null) {
        boundSocket.off('state', stateHandler);
      }
      displayEl = null;
      intervalId = null;
      stateHandler = null;
      boundSocket = null;
    },
  };
}