import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    target: 'es2019',
    sourcemap: false,
  },
  server: {
    port: 5173,
  },
});
