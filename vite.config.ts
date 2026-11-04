import { defineConfig } from 'vite';
import { resolve } from 'node:path';

const rawBase = process.env.BASE_PATH ?? '/';
const base = '/' + rawBase.replace(/^\/+|\/+$/g, '') + '/';

export default defineConfig({
  base: base === '//' ? '/' : base,
  server: { allowedHosts: ['terminal.local'] },
  preview: { allowedHosts: ['terminal.local'] },
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 650,
    rollupOptions: {
      input: {
        home: resolve('index.html'),
        hush: resolve('work/hush/index.html'),
        gateway: resolve('work/gateway/index.html'),
        atlas: resolve('work/search-atlas/index.html'),
        resume: resolve('resume/index.html'),
        notFound: resolve('404.html'),
      },
    },
  },
});
