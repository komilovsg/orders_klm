import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const marketDataHandler = require('../api/market-data.js');

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'local-market-data-api',
      configureServer(server) {
        server.middlewares.use('/api/market-data', marketDataHandler);
      },
    },
  ],
  // Статическая сборка: деплоится куда угодно, сервер не нужен.
  base: './',
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
});
