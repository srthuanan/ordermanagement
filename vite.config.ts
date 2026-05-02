import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['logoweb.png'],
      manifest: {
        name: 'Order Management',
        short_name: 'OrderMgmt',
        description: 'Công cụ nội bộ dành cho tư vấn bán hàng',
        theme_color: '#0D47A1',
        background_color: '#F7F9FC',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          {
            src: 'logoweb.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'logoweb.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        clientsClaim: true,
        skipWaiting: true,
        globPatterns: ['**/*.{js,css,html,png,svg,ico}'],
        maximumFileSizeToCacheInBytes: 20 * 1024 * 1024 // 20MB
      }
    })
  ],
  define: {
    '__APP_VERSION__': JSON.stringify(new Date().getTime().toString())
  },
  base: '/ordermanagement/',
  build: {
    chunkSizeWarningLimit: 5000,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-jspdf': ['jspdf']
        }
      }
    }
  }
})
