// src/server.js
import express from 'express';
import cors from 'cors';
import bootstrap from './bootstrap.js';
import { protect } from './auth.js';

const app = express();

// CORS
const allow = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);
app.use(cors({ origin: allow, methods: ['GET','POST','OPTIONS'] }));
app.use(express.json({ limit: '10mb' }));

// Health
app.get('/health', (_req, res) => res.json({ ok: true }));

// Bootstrap (antes do protect: cria empresa + vínculo no 1º login)
app.use('/api', bootstrap);

// Protege TUDO a partir daqui (Bearer do Supabase OU x-easycheck-key)
app.use(protect);

// Helper para montar módulos de forma segura (ignora se o ficheiro não existir)
async function mount(modulePath, mountPath = '/api') {
  try {
    const m = await import(modulePath);
    app.use(mountPath, m.default || m);
    console.log('[mount] OK:', modulePath, '->', mountPath);
  } catch (e) {
    console.warn('[mount] SKIP (not found):', modulePath);
  }
}

// Monta cada módulo diretamente (sem routes.js)
await mount('./connections.js', '/api');
await mount('./templates.js',   '/api');
await mount('./invoices.js',    '/api');
await mount('./hr.js',          '/api');
await mount('./clients.js',     '/api');
await mount('./company.js',     '/api'); // ok se não existir
await mount('./ai.js',          '/api/ai'); // ok se não existir

// Start
const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Easycheck API listening on ${port}`));
