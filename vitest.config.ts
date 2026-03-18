import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { resolve } from 'node:path';

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'server',
          include: ['server/**/*.test.ts'],
          environment: 'node',
        },
      },
      {
        plugins: [svelte({ hot: false })],
        resolve: {
          alias: { '@shared': resolve(import.meta.dirname, 'shared') },
          conditions: ['browser'],
        },
        test: {
          name: 'client',
          include: ['client/admin/**/*.svelte.test.ts', 'client/go/**/*.svelte.test.ts'],
          environment: 'jsdom',
        },
      },
    ],
  },
});
