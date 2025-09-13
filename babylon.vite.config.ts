import { defineConfig } from 'vite';

export default defineConfig({
  root: 'web/babylon',
  publicDir: false,
  server: { open: '/index.html' },
  define: { 'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development') },
  build: {
    outDir: '../../dist-babylon',
    emptyOutDir: true,
  },
});
