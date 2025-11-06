// src/bootstrap.js
import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { supa } from './supa.js';

const r = Router();

/**
 * POST /api/bootstrap
 * Header: Authorization: Bearer <token Supabase>
 * Se o user ainda não tiver empresa:
 *   - cria em companies (nome a partir do domínio do e-mail)
 *   - cria vínculo em user_companies (role 'owner')
 * Retorna: { ok, company_id, api_key }
 */
r.post('/bootstrap', async (req, res) => {
  try {
    const hdr = req.header('authorization') || '';
    const token = hdr.startsWith('Bearer ') ? hdr.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'Missing token' });

    let payload;
    try {
      payload = jwt.verify(token, process.env.SUPABASE_JWT_SECRET);
    } catch {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const user_id = payload.sub;
    const email = String(payload.email || payload.user_metadata?.email || '').toLowerCase();

    // Já possui vínculo?
    const { data: existing } = await supa
      .from('user_companies')
      .select('company_id')
      .eq('user_id', user_id)
      .maybeSingle();

    if (existing?.company_id) {
      const { data: comp } = await supa
        .from('companies')
        .select('api_key')
        .eq('id', existing.company_id)
        .maybeSingle();

      return res.json({ ok: true, company_id: existing.company_id, api_key: comp?.api_key });
    }

    // Cria empresa
    const domain = email.includes('@') ? email.split('@')[1] : 'company.local';
    const guess = domain.split('.')[0].replace(/[^a-z0-9\-]/gi, ' ').trim();
    const name = (guess ? guess.charAt(0).toUpperCase() + guess.slice(1) : 'Company');

    const { data: company, error: cErr } = await supa
      .from('companies')
      .insert({ name, locale: 'pt', timezone: 'Europe/Luxembourg' })
      .select()
      .single();

    if (cErr) return res.status(500).json({ error: cErr.message });

    // Vínculo user -> company
    const { error: uErr } = await supa
      .from('user_companies')
      .insert({ user_id, company_id: company.id, role: 'owner' });

    if (uErr) return res.status(500).json({ error: uErr.message });

    res.json({ ok: true, company_id: company.id, api_key: company.api_key });
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) });
  }
});

export default r;
