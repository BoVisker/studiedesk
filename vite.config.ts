/// <reference types="vitest/config" />
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath } from 'node:url'

// GitHub Pages serveert de app onder /<repo-naam>/. De workflow zet VITE_BASE
// automatisch op de reponaam; lokaal draait alles op '/'.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    base: env.VITE_BASE || '/',
    plugins: [react(), tailwindcss()],
    resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
    test: {
      environment: 'jsdom',
      globals: true,
      include: ['tests/**/*.test.{ts,tsx}'],
      setupFiles: ['tests/setup.ts'],
    },
  }
})
