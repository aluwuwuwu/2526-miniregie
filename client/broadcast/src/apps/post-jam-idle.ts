import type { BroadcastApp } from '../types.js';
import type { GlobalState } from '@shared/types';
import type { Socket } from 'socket.io-client';

export function createPostJamIdle(): BroadcastApp {
  return {
    mount(container: HTMLElement, _state: GlobalState, _socket: Socket): void {
      container.className = 'app app--post-jam-idle';

      const el = document.createElement('div');
      el.className = 'post-jam-idle';

      const title = document.createElement('p');
      title.className = 'post-jam-idle__title';
      title.textContent = 'La JAM est terminée.';

      const subtitle = document.createElement('p');
      subtitle.className = 'post-jam-idle__subtitle';
      subtitle.textContent = 'Merci à toutes les équipes.';

      el.appendChild(title);
      el.appendChild(subtitle);
      container.appendChild(el);
    },

    unmount(): void {
      // No timers or listeners to clean up.
    },
  };
}