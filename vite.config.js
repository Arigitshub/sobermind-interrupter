import { defineConfig } from 'vite';

export default defineConfig({
  base: process.env.DEPLOY_TARGET === 'gh-pages' ? '/sobermind-interrupter/' : '/',
  build: {
    outDir: 'dist',
  }
});
