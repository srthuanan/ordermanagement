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
  base: (process.env.GITHUB_PAGES === 'true') ? '/ordermanagement/' : '/',
  build: {
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react/') || id.includes('react-dom/')) {
              return 'vendor-react';
            }
            if (id.includes('jspdf') || id.includes('pdfjs-dist') || id.includes('html2canvas') || id.includes('react-pdf')) {
              return 'vendor-pdf';
            }
            if (id.includes('exceljs') || id.includes('xlsx')) {
              return 'vendor-excel';
            }
            if (id.includes('@google/genai')) {
              return 'vendor-ai';
            }
            if (id.includes('@supabase')) {
              return 'vendor-supabase';
            }
            if (id.includes('framer-motion') || id.includes('lucide-react')) {
              return 'vendor-ui';
            }
          }
        }
      }
    }
  }
})
