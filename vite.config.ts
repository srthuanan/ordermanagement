import { defineConfig, Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { spawn } from 'child_process'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function cyberSyncPlugin(): Plugin {
  const scriptPath = path.resolve(__dirname, 'scripts', 'sync_thuan_an_allocations.py');

  const runPy = (args: string[], inputBody: string, res: any) => {
    console.log(`[CyberSync Vite Middleware] Running: python ${args.join(' ')}`);
    const py = spawn('python', args);
    let stdout = '';
    let stderr = '';

    if (inputBody) {
      py.stdin.write(inputBody);
      py.stdin.end();
    }

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
  };

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
          const args = [scriptPath];
          if (fromDate) args.push('--from', fromDate);
          if (toDate) args.push('--to', toDate);
          if (preview) args.push('--preview');
          runPy(args, '', res);
        });
      });

      server.middlewares.use('/api/cyber/sync-locations', (req, res, next) => {
        if (req.method !== 'POST') return next();
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
          let options: any = {};
          try { options = JSON.parse(body || '{}'); } catch (e) {}
          const args = [scriptPath, '--sync-locations'];
          if (options.preview) args.push('--preview');
          runPy(args, body, res);
        });
      });

      server.middlewares.use('/api/cyber/plan-filter-options', (req, res, next) => {
        if (req.method !== 'GET') return next();
        const urlObj = new URL(req.url || '', `http://${req.headers.host || 'localhost'}`);
        const model = urlObj.searchParams.get('model') || '';
        const args = [scriptPath, '--plan-filter-options'];
        if (model) args.push('--model', model);
        runPy(args, '', res);
      });

      server.middlewares.use('/api/cyber/search-factory-plan', (req, res, next) => {
        if (req.method !== 'POST') return next();
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
          runPy([scriptPath, '--search-plan'], body, res);
        });
      });

      server.middlewares.use('/api/cyber/ton-kho-report', (req, res, next) => {
        if (req.method !== 'POST') return next();
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
          runPy([scriptPath, '--ton-kho-report'], body, res);
        });
      });

      server.middlewares.use('/api/cyber/xep-xe-contracts', (req, res, next) => {
        if (req.method !== 'POST') return next();
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
          runPy([scriptPath, '--xep-xe-contracts'], body, res);
        });
      });

      server.middlewares.use('/api/cyber/xep-xe-candidates', (req, res, next) => {
        if (req.method !== 'POST') return next();
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
          runPy([scriptPath, '--xep-xe-candidates'], body, res);
        });
      });

      server.middlewares.use('/api/cyber/xep-xe-save', (req, res, next) => {
        if (req.method !== 'POST') return next();
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
          runPy([scriptPath, '--xep-xe-save'], body, res);
        });
      });

      server.middlewares.use('/api/cyber/xep-xe-delete', (req, res, next) => {
        if (req.method !== 'POST') return next();
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
          runPy([scriptPath, '--xep-xe-delete'], body, res);
        });
      });

      server.middlewares.use('/api/cyber/create-dnx', (req, res, next) => {
        if (req.method !== 'POST') return next();
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
          runPy([scriptPath, '--create-dnx'], body, res);
        });
      });

      server.middlewares.use('/api/cyber/lookup-vin', (req, res, next) => {
        if (req.method !== 'POST') return next();
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
          runPy([scriptPath, '--lookup-vin'], body, res);
        });
      });

      server.middlewares.use('/api/cyber/voucher-tickets', (req, res, next) => {
        const parsedUrl = new URL(req.url || '', 'http://localhost');
        const queryParams: Record<string, any> = {};
        parsedUrl.searchParams.forEach((val, key) => {
          queryParams[key] = val;
        });

        if (req.method === 'POST') {
          let body = '';
          req.on('data', chunk => { body += chunk.toString(); });
          req.on('end', () => {
            let bodyObj = {};
            try { bodyObj = JSON.parse(body || '{}'); } catch (_) {}
            runPy([scriptPath, '--voucher-tickets'], JSON.stringify({ ...queryParams, ...bodyObj }), res);
          });
        } else {
          runPy([scriptPath, '--voucher-tickets'], JSON.stringify(queryParams), res);
        }
      });

      server.middlewares.use('/api/cyber/export-pdf', (req, res, next) => {
        const parsedUrl = new URL(req.url || '', 'http://localhost');
        const queryParams: Record<string, any> = {};
        parsedUrl.searchParams.forEach((val, key) => {
          queryParams[key] = val;
        });

        if (req.method === 'POST') {
          let body = '';
          req.on('data', chunk => { body += chunk.toString(); });
          req.on('end', () => {
            let bodyObj = {};
            try { bodyObj = JSON.parse(body || '{}'); } catch (_) {}
            runPy([scriptPath, '--export-pdf'], JSON.stringify({ ...queryParams, ...bodyObj }), res);
          });
        } else {
          runPy([scriptPath, '--export-pdf'], JSON.stringify(queryParams), res);
        }
      });

      server.middlewares.use('/api/cyber/view-pdf', (req, res) => {
        const parsedUrl = new URL(req.url || '', 'http://localhost');
        const stt = (parsedUrl.searchParams.get('stt_rec') || '').replace(/[^a-zA-Z0-9_\-]/g, '_');
        const filePath = path.resolve(__dirname, 'public/cyber_pdfs', `${stt}.pdf`);
        if (fs.existsSync(filePath)) {
          const stat = fs.statSync(filePath);
          res.writeHead(200, {
            'Content-Type': 'application/pdf',
            'Content-Length': stat.size,
            'Content-Disposition': 'inline'
          });
          fs.createReadStream(filePath).pipe(res);
        } else {
          res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
          res.end('File PDF không tồn tại');
        }
      });

      server.middlewares.use('/api/cyber/check-contract-status', (req, res, next) => {
        const parsedUrl = new URL(req.url || '', 'http://localhost');
        const queryParams: Record<string, any> = {};
        parsedUrl.searchParams.forEach((val, key) => {
          queryParams[key] = val;
        });

        if (req.method === 'POST') {
          let body = '';
          req.on('data', chunk => { body += chunk.toString(); });
          req.on('end', () => {
            let bodyObj = {};
            try { bodyObj = JSON.parse(body || '{}'); } catch (_) {}
            runPy([scriptPath, '--check-contract-status'], JSON.stringify({ ...queryParams, ...bodyObj }), res);
          });
        } else {
          runPy([scriptPath, '--check-contract-status'], JSON.stringify(queryParams), res);
        }
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
