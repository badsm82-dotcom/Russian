import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// VITE_BASE=/russian/ pour un hébergement dans un sous-dossier (ex. bmcg.ch/russian).
export default defineConfig({
  base: process.env.VITE_BASE ?? '/',
  plugins: [react()],
  server: { port: 5173, proxy: { '/v1': 'http://127.0.0.1:3000', '/health': 'http://127.0.0.1:3000' } },
});
