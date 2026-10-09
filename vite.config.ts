/// <reference types="vitest/config" />
import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'prompt',
      pwaAssets: { config: true, overrideManifestIcons: true },
      manifest: {
        name: 'Duskwarden',
        short_name: 'Duskwarden',
        description: 'Mesélői segéd gyilkosos társasjátékokhoz',
        lang: 'hu',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#0f0d1a',
        theme_color: '#0f0d1a',
      },
      workbox: { globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'] },
    }),
  ],
  resolve: { alias: { '@': path.resolve(import.meta.dirname, 'src') } },
  // The whole app is precached for offline play, so splitting chunks would not shorten first load.
  build: { chunkSizeWarningLimit: 800 },
  test: { include: ['src/**/*.test.ts'] },
})
