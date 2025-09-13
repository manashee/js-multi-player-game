import { defineConfig } from 'vite';

export default defineConfig({
  root: 'web/phaser',
  publicDir: false,
  server: { open: '/index.html' },
  define: { 'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development') },
  build: {
    outDir: '../../dist-phaser',
    emptyOutDir: true,
  },
});
