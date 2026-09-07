import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    target: 'es2020', // BigInt (gtfs/realtimeProto.js) nécessite ES2020 — support universel depuis 2020.
    sourcemap: false,
  },
  server: {
    port: 5173,
  },
});
