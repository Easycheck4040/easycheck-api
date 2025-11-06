// src/server.js
import express from 'express';
import cors from 'cors';
import routes from './routes.js';
import bootstrap from './bootstrap.js';
import { protect } from './auth.js';

const app = express();

// CORS
const allow = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

app.use(cors({ origin: allow, methods: ['GET', 'POST', 'OPTIONS'] }));
app.use(express.json({ limit: '10mb' }));

// Health
app.get('/health', (_req, res) => res.json({ ok: true }));

// Bootstrap (ANTES do protect — permite criar empresa no 1º login)
app.use('/api', bootstrap);

// Tudo abaixo protegido (token Supabase OU x-easycheck-key)
app.use(protect);

// Rotas principais da aplicação
app.use('/api', routes);

// Start
const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Easycheck API listening on ${port}`));
