/// <reference types="vitest/config" />
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { fileURLToPath } from 'node:url'

// GitHub Pages serveert de app onder /<repo-naam>/. De workflow zet VITE_BASE
// automatisch op de reponaam; lokaal draait alles op '/'.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    base: env.VITE_BASE || '/',
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'prompt',
        includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
        workbox: {
          globPatterns: ['**/*.{js,css,html,svg,woff2,png}'],
          // Grootste bundle is ~550 kB; ruim onder deze grens.
          maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
          // Onbekende route offline → de app-shell (HashRouter regelt de rest).
          navigateFallback: 'index.html',
          // API-verzoeken nooit uit de cache serveren; offline data loopt via IndexedDB.
          navigateFallbackDenylist: [/\/functions\//, /supabase\.co/],
          cleanupOutdatedCaches: true,
        },
        manifest: {
          name: 'StudieDesk',
          short_name: 'StudieDesk',
          description: 'Rustig leren, plannen en cijfers bijhouden.',
          lang: 'nl',
          display: 'standalone',
          theme_color: '#f6f1e7',
          background_color: '#f6f1e7',
          icons: [
            { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
            { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
            { src: 'maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          ],
        },
      }),
    ],
    resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
    test: {
      environment: 'jsdom',
      globals: true,
      include: ['tests/**/*.test.{ts,tsx}'],
      setupFiles: ['tests/setup.ts'],
    },
  }
})
