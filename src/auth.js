// src/auth.js
import jwt from 'jsonwebtoken';
import { supa } from './supa.js';

/**
 * Middleware global de proteção:
 * - Se houver x-easycheck-key => autentica por chave da empresa (para crons/integradores).
 * - Caso contrário => exige Authorization: Bearer <token Supabase> e resolve company_id via user_companies.
 */
export async function protect(req, res, next) {
  try {
    if (req.method === 'OPTIONS') return res.sendStatus(200);

    // 1) API key (integrações/cron)
    const apiKey = req.header('x-easycheck-key');
    if (apiKey) {
      const { data, error } = await supa
        .from('companies')
        .select('id')
        .eq('api_key', apiKey)
        .maybeSingle();

      if (error || !data) return res.status(401).json({ error: 'Invalid key' });
      req.company_id = data.id;
      req.auth_type = 'key';
      return next();
    }

    // 2) Token de usuário (Supabase)
    const hdr = req.header('authorization') || '';
    const token = hdr.startsWith('Bearer ') ? hdr.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'Missing token' });

    let payload;
    try {
      payload = jwt.verify(token, process.env.SUPABASE_JWT_SECRET);
    } catch {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Vínculo user -> company (pega o primeiro)
    const { data: map, error: mErr } = await supa
      .from('user_companies')
      .select('company_id')
      .eq('user_id', payload.sub)
      .maybeSingle();

    if (mErr || !map) return res.status(403).json({ error: 'No company for user' });

    req.user_id = payload.sub;
    req.company_id = map.company_id;
    req.auth_type = 'user';
    next();
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) });
  }
}
