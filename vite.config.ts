import { defineConfig, Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import viteCompression from 'vite-plugin-compression'
import { spawn } from 'child_process'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function cyberSyncPlugin(): Plugin {
  const scriptPath = path.resolve(__dirname, 'scripts', 'sync_thuan_an_allocations.py');

  const responseCache = new Map<string, { timestamp: number; payload: any }>();
  const CACHE_TTL_MS = 2 * 60 * 1000; // 2 phút

  const invalidateCache = () => {
    if (responseCache.size > 0) {
      console.log(`[CyberSync Cache] Invaliding ${responseCache.size} cache entries due to data mutation.`);
      responseCache.clear();
    }
  };

  const runPy = (args: string[], inputBody: string, res: any, cacheKey?: string, forceRefresh = false, onComplete?: (success: boolean) => void) => {
    if (cacheKey && !forceRefresh) {
      const hit = responseCache.get(cacheKey);
      if (hit && (Date.now() - hit.timestamp) < CACHE_TTL_MS) {
        console.log(`[CyberSync Cache HIT] ${cacheKey} (${Date.now() - hit.timestamp}ms old)`);
        res.writeHead(200, { 'Content-Type': 'application/json', 'X-Cache': 'HIT' });
        return res.end(JSON.stringify(hit.payload));
      }
    }

    const startTime = Date.now();
    console.log(`[CyberSync Vite Middleware] Running: python ${args.join(' ')}`);
    const py = spawn('python', args);
    let stdout = '';
    let stderr = '';

    if (inputBody) {
      py.stdin.write(inputBody);
    }
    py.stdin.end();

    py.stdout.on('data', d => { stdout += d.toString(); });
    py.stderr.on('data', d => { stderr += d.toString(); });

    py.on('close', code => {
      if (code !== 0) {
        if (onComplete) onComplete(false);
        res.writeHead(500, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        return res.end(JSON.stringify({ success: false, error: stderr || `Exit code ${code}` }));
      }
      try {
        const lines = stdout.trim().split('\n');
        const lastLine = lines[lines.length - 1];
        const parsed = JSON.parse(lastLine);
        if (cacheKey && parsed && parsed.success !== false) {
          responseCache.set(cacheKey, { timestamp: Date.now(), payload: parsed });
        }
        if (onComplete) onComplete(true);
        console.log(`[CyberSync Vite Middleware] Completed in ${Date.now() - startTime}ms`);
        res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(JSON.stringify(parsed));
      } catch (e: any) {
        if (onComplete) onComplete(false);
        res.writeHead(500, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(JSON.stringify({ success: false, raw: stdout, error: e.message }));
      }
    });
  };

  return {
    name: 'cyber-sync-middleware',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url && req.url.startsWith('/api/')) {
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, HEAD');
          res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
          res.setHeader('Access-Control-Allow-Private-Network', 'true');
          if (req.method === 'OPTIONS') {
            res.statusCode = 204;
            return res.end();
          }
        }
        next();
      });

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
          runPy(args, body, res, undefined, false, success => {
            if (success && !preview) invalidateCache();
          });
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
          runPy(args, body, res, undefined, false, success => {
            if (success && !options.preview) invalidateCache();
          });
        });
      });

      server.middlewares.use('/api/cyber/plan-filter-options', (req, res, next) => {
        if (req.method !== 'GET') return next();
        const urlObj = new URL(req.url || '', `http://${req.headers.host || 'localhost'}`);
        const model = urlObj.searchParams.get('model') || '';
        const args = [scriptPath, '--plan-filter-options'];
        if (model) args.push('--model', model);
        runPy(args, '', res, `plan-filter-options:${model}`);
      });

      server.middlewares.use('/api/cyber/search-factory-plan', (req, res, next) => {
        if (req.method !== 'POST') return next();
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
          let options: any = {};
          try { options = JSON.parse(body || '{}'); } catch (e) {}
          const isForce = Boolean(options.force || options.refresh);
          runPy([scriptPath, '--search-plan'], body, res, `search-plan:${body}`, isForce);
        });
      });

      server.middlewares.use('/api/cyber/ton-kho-report', (req, res, next) => {
        if (req.method !== 'POST') return next();
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
          let options: any = {};
          try { options = JSON.parse(body || '{}'); } catch (e) {}
          const isForce = Boolean(options.force || options.refresh);
          runPy([scriptPath, '--ton-kho-report'], body, res, `ton-kho-report:${body}`, isForce);
        });
      });

      server.middlewares.use('/api/cyber/xep-xe-contracts', (req, res, next) => {
        if (req.method !== 'POST') return next();
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
          let options: any = {};
          try { options = JSON.parse(body || '{}'); } catch (e) {}
          const isForce = Boolean(options.force || options.refresh);
          runPy([scriptPath, '--xep-xe-contracts'], body, res, `xep-xe-contracts:${body}`, isForce);
        });
      });

      server.middlewares.use('/api/cyber/xep-xe-candidates', (req, res, next) => {
        if (req.method !== 'POST') return next();
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
          runPy([scriptPath, '--xep-xe-candidates'], body, res, `xep-xe-candidates:${body}`);
        });
      });

      server.middlewares.use('/api/cyber/xep-xe-save', (req, res, next) => {
        if (req.method !== 'POST') return next();
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
          runPy([scriptPath, '--xep-xe-save'], body, res, undefined, false, success => {
            if (success) invalidateCache();
          });
        });
      });

      server.middlewares.use('/api/cyber/xep-xe-delete', (req, res, next) => {
        if (req.method !== 'POST') return next();
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
          runPy([scriptPath, '--xep-xe-delete'], body, res, undefined, false, success => {
            if (success) invalidateCache();
          });
        });
      });

      server.middlewares.use('/api/cyber/create-dnx', (req, res, next) => {
        if (req.method !== 'POST') return next();
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
          runPy([scriptPath, '--create-dnx'], body, res, undefined, false, success => {
            if (success) invalidateCache();
          });
        });
      });

      server.middlewares.use('/api/cyber/lookup-vin', (req, res, next) => {
        if (req.method !== 'POST') return next();
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
          let options: any = {};
          try { options = JSON.parse(body || '{}'); } catch (e) {}
          const isForce = Boolean(options.forceRefresh || options.refresh);
          const cacheKey = `lookup-vin:${options.vin || (options.vins || []).join(',') || body}`;
          runPy([scriptPath, '--lookup-vin'], body, res, cacheKey, isForce);
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
            let bodyObj: any = {};
            try { bodyObj = JSON.parse(body || '{}'); } catch (_) {}
            const combined = { ...queryParams, ...bodyObj };
            const payloadStr = JSON.stringify(combined);
            const isForce = Boolean(combined.force || combined.refresh);
            runPy([scriptPath, '--voucher-tickets'], payloadStr, res, `voucher-tickets:${payloadStr}`, isForce);
          });
        } else {
          const payloadStr = JSON.stringify(queryParams);
          const isForce = Boolean(queryParams.force || queryParams.refresh);
          runPy([scriptPath, '--voucher-tickets'], payloadStr, res, `voucher-tickets:${payloadStr}`, isForce);
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
        const rawStt = (parsedUrl.searchParams.get('stt_rec') || '').replace(/\.pdf$/i, '');
        const baseStt = rawStt.replace(/(_sig|_nosig)$/i, '');
        const safeBase = baseStt.replace(/[^a-zA-Z0-9_\-]/g, '_');
        const stt = rawStt.replace(/[^a-zA-Z0-9_\-]/g, '_');
        
        const isNosig = /_nosig$/i.test(rawStt);
        const isSig = /_sig$/i.test(rawStt);

        let candidates: string[] = [];
        if (isNosig) {
          // Khi người dùng chọn không chèn chữ ký, TUYỆT ĐỐI không fallback sang file _sig.pdf
          candidates = [
            path.resolve(__dirname, 'public/cyber_pdfs', `${stt}.pdf`),
            path.resolve(__dirname, 'public/cyber_pdfs', `${safeBase}_nosig.pdf`)
          ];
        } else if (isSig) {
          candidates = [
            path.resolve(__dirname, 'public/cyber_pdfs', `${stt}.pdf`),
            path.resolve(__dirname, 'public/cyber_pdfs', `${safeBase}_sig.pdf`),
            path.resolve(__dirname, 'public/cyber_pdfs', `${safeBase}.pdf`)
          ];
        } else {
          candidates = [
            path.resolve(__dirname, 'public/cyber_pdfs', `${stt}.pdf`),
            path.resolve(__dirname, 'public/cyber_pdfs', `${safeBase}_sig.pdf`),
            path.resolve(__dirname, 'public/cyber_pdfs', `${safeBase}_nosig.pdf`),
            path.resolve(__dirname, 'public/cyber_pdfs', `${safeBase}.pdf`)
          ];
        }
        
        const foundPath = candidates.find(p => fs.existsSync(p));
        if (foundPath) {
          const stat = fs.statSync(foundPath);
          res.writeHead(200, {
            'Content-Type': 'application/pdf',
            'Content-Length': stat.size,
            'Content-Disposition': 'inline',
            'Access-Control-Allow-Origin': '*'
          });
          if (req.method === 'HEAD') {
            res.end();
            return;
          }
          fs.createReadStream(foundPath).pipe(res);
        } else {
          res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' });
          res.end(JSON.stringify({ success: false, error: 'File PDF không tồn tại' }));
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

      server.middlewares.use('/api/cyber/sync-ton-kho-to-supabase', (req, res, next) => {
        runPy([scriptPath, '--sync-ton-kho'], '{}', res, undefined, true, success => {
          if (success) invalidateCache();
        });
      });

      server.middlewares.use('/api/cyber/sync-all-to-supabase', (req, res, next) => {
        if (req.method !== 'POST') return next();
        runPy([scriptPath, '--sync-all-cyber'], '{}', res, undefined, true, success => {
          if (success) invalidateCache();
        });
      });

      const minvoiceScript = path.resolve(__dirname, 'scripts', 'm_invoice_service.py');

      server.middlewares.use('/api/minvoice/fetch-invoice', (req, res, next) => {
        if (req.method === 'POST') {
          let body = '';
          req.on('data', chunk => { body += chunk.toString(); });
          req.on('end', () => {
            runPy([minvoiceScript], body, res);
          });
        } else {
          const parsedUrl = new URL(req.url || '', 'http://localhost');
          const vin = parsedUrl.searchParams.get('vin') || '';
          runPy([minvoiceScript], JSON.stringify({ vin }), res);
        }
      });

      server.middlewares.use('/api/minvoice/sync-and-notify', (req, res, next) => {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
          try {
            const parsed = JSON.parse(body || '{}');
            parsed.action = 'sync_and_notify';
            runPy([minvoiceScript], JSON.stringify(parsed), res);
          } catch (e) {
            runPy([minvoiceScript], body, res);
          }
        });
      });

      server.middlewares.use('/api/minvoice/batch-fetch', (req, res, next) => {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
          runPy([minvoiceScript], body, res);
        });
      });

      const crmScript = path.resolve(__dirname, 'scripts', 'cyber_crm_service.py');

      server.middlewares.use('/api/cyber/crm-metadata', (req, res, next) => {
        const parsedUrl = new URL(req.url || '', 'http://localhost');
        const isForce = parsedUrl.searchParams.get('force') === 'true';
        runPy([crmScript, '--metadata'], '', res, 'crm-metadata', isForce);
      });

      server.middlewares.use('/api/cyber/crm-check-duplicates', (req, res, next) => {
        if (req.method !== 'POST') return next();
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
          let bodyObj: any = {};
          try { bodyObj = JSON.parse(body || '{}'); } catch (_) {}
          bodyObj.action = 'check_duplicates';
          runPy([crmScript], JSON.stringify(bodyObj), res);
        });
      });

      server.middlewares.use('/api/cyber/crm-import-khtn', (req, res, next) => {
        if (req.method !== 'POST') return next();
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
          let bodyObj: any = {};
          try { bodyObj = JSON.parse(body || '{}'); } catch (_) {}
          bodyObj.action = 'import_khtn';
          runPy([crmScript], JSON.stringify(bodyObj), res);
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
    viteCompression({
      verbose: false,
      algorithm: 'gzip',
      ext: '.gz',
    }),
    viteCompression({
      verbose: false,
      algorithm: 'brotliCompress',
      ext: '.br',
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
        globPatterns: ['**/*.{js,css,html,png,svg,ico,webp,woff2}'],
        maximumFileSizeToCacheInBytes: 10 * 1024 * 1024 // 10MB
      }
    })
  ],
  esbuild: {
    drop: process.env.NODE_ENV === 'production' ? ['console', 'debugger'] : []
  },
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
            if (id.includes('moment') || id.includes('axios') || id.includes('swr')) {
              return 'vendor-utils';
            }
            if (id.includes('three')) {
              return 'vendor-three';
            }
          }
        }
      }
    }
  }
})
