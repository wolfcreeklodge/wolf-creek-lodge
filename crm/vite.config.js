import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/crm/',
  server: {
    port: 5173,
    proxy: {
      '/crm/api': {
        target: 'http://localhost:3000',
        rewrite: (path) => path.replace(/^\/crm/, ''),
      },
      '/crm/auth': {
        target: 'http://localhost:3000',
        rewrite: (path) => path.replace(/^\/crm/, ''),
      },
    },
  },
  build: {
    outDir: 'dist',
  },
});
