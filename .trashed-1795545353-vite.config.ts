import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],

  // Sito: Emporio 46 Firenze
  base: '/',

  server: {
    host: true,
    port: 5173,
    strictPort: true,
    watch: {
      ignored: ['**/node_modules/**', '**/.git/**', '**/dist/**', '**/public/**'],
    },
    hmr: {
      overlay: false,
    },
  },

  build: {
    target: 'es2020',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks: {
          'three': ['three'],
          'gsap': ['gsap'],
          'framer': ['framer-motion'],
          'lenis': ['lenis'],
        },
      },
    },
  },
})
