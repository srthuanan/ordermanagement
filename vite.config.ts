import { defineConfig, Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { spawn } from 'child_process'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function cyberSyncPlugin(): Plugin {
  return {
    name: 'cyber-sync-middleware',
    configureServer(server) {
      server.middlewares.use('/api/cyber/sync-allocations', (req, res, next) => {
        if (req.method !== 'POST') return next();

        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
          let options: any = {};
          try { options = JSON.parse(body || '{}'); } catch (e) {}

          const { fromDate, toDate, preview } = options;
          const scriptPath = path.resolve(__dirname, 'scripts', 'sync_thuan_an_allocations.py');
          const args = [scriptPath];
          if (fromDate) args.push('--from', fromDate);
          if (toDate) args.push('--to', toDate);
          if (preview) args.push('--preview');

          console.log(`[CyberSync Vite Middleware] Running: python ${args.join(' ')}`);
          const py = spawn('python', args);
          let stdout = '';
          let stderr = '';

          py.stdout.on('data', d => { stdout += d.toString(); });
          py.stderr.on('data', d => { stderr += d.toString(); });

          py.on('close', code => {
            if (code !== 0) {
              res.writeHead(500, { 'Content-Type': 'application/json' });
              return res.end(JSON.stringify({ success: false, error: stderr || `Exit code ${code}` }));
            }
            try {
              const lines = stdout.trim().split('\n');
              const lastLine = lines[lines.length - 1];
              const parsed = JSON.parse(lastLine);
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify(parsed));
            } catch (e: any) {
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ success: false, raw: stdout, error: e.message }));
            }
          });
        });
      });
    }
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(Date.now().toString())
  },
  plugins: [
    cyberSyncPlugin(),
    react({
      babel: {
        compact: true
      }
    }),
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
  base: (process.env.IS_ELECTRON || process.env.IS_MOBILE)
    ? './'
    : (process.env.VERCEL === '1' || process.env.VERCEL === 'true')
      ? '/'
      : '/ordermanagement/',
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
