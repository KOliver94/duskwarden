import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config'

// The generator's defaults pad maskable and Apple icons on white; the source SVG is already full bleed.
const background = '#0f0d1a'

export default defineConfig({
  preset: {
    ...minimal2023Preset,
    // Some padding keeps the horizon bar inside the circle Android launchers crop to.
    maskable: { sizes: [512], padding: 0.1, resizeOptions: { background } },
    apple: { sizes: [180], padding: 0, resizeOptions: { background } },
  },
  images: ['public/icon.svg'],
})
