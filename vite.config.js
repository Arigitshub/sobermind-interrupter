import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  base: process.env.DEPLOY_TARGET === 'gh-pages' ? '/sobermind-interrupter/' : '/',
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        docs: resolve(__dirname, 'docs.html')
      }
    }
  }
});
