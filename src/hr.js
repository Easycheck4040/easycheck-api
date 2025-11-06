// src/hr.js
import { Router } from 'express';
import multer from 'multer';
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import { supa } from './supa.js';

const upload = multer({ storage: multer.memoryStorage() });
const r = Router();

/**
 * POST /api/hr/upload
 * FormData: { company_id, name, email, cv(file) }
 * Extrai texto de PDF/DOCX/TXT sem custo (sem LLM) e guarda candidato.
 */
r.post('/hr/upload', upload.single('cv'), async (req, res) => {
  try {
    const { company_id, name, email } = req.body;
    if (!company_id || !req.file) return res.status(400).json({ error: 'Missing fields' });

    const buf = req.file.buffer;
    let text = '';

    if (req.file.mimetype === 'application/pdf') {
      const out = await pdfParse(buf);
      text = out.text || '';
    } else if (
      req.file.mimetype.includes('word') ||
      req.file.originalname.toLowerCase().endsWith('.docx')
    ) {
      const out = await mammoth.extractRawText({ buffer: buf });
      text = out.value || '';
    } else {
      text = buf.toString('utf8');
    }

    const { data: cand, error } = await supa
      .from('hr_candidates')
      .insert({ company_id, name, email, cv_text: text })
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    res.json({ ok: true, candidate: cand });
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) });
  }
});

/* ========================= Heurísticas locais (sem LLM) ========================= */

function extractStructure(text) {
  const T = (text || '').toLowerCase();

  // listas simples para MVP
  const skillsDict = [
    'excel', 'python', 'sql', 'javascript', 'accounting', 'sage', 'sap',
    'office', 'react', 'node', 'java', 'communication', 'leadership'
  ];
  const langDict = [
    'portuguese', 'português', 'french', 'français', 'german', 'deutsch',
    'english', 'spanish', 'italian', 'luxembourgish'
  ];

  const skills = skillsDict.filter(s => T.includes(s));
  const languages = langDict.filter(l => T.includes(l));
  const exp = T.match(/(\d+)\s*(years|anos|ans|jahre)/);
  const years = exp ? Number(exp[1]) : 0;

  return { experienceYears: years, skills, languages, education: [] };
}

function scoreCandidate(parsed, crit) {
  const wE = crit?.weight_experience ?? 30;
  const wS = crit?.weight_skills ?? 40;
  const wL = crit?.weight_languages ?? 20;
  const wEd = crit?.weight_education ?? 10;

  const base = Math.min(parsed.experienceYears * 10, 100) * (wE / 100);

  const ks = (crit?.must_have_skills || []).map(s => String(s).toLowerCase());
  const ls = (crit?.must_have_languages || []).map(s => String(s).toLowerCase());

  const hitS = ks.reduce((a, s) => a + (parsed.skills.includes(s) ? 1 : 0), 0);
  const hitL = ls.reduce((a, l) => a + (parsed.languages.join(' ').includes(l) ? 1 : 0), 0);

  const sS = Math.min(100, (hitS / Math.max(ks.length, 1)) * 100) * (wS / 100);
  const sL = Math.min(100, (hitL / Math.max(ls.length, 1)) * 100) * (wL / 100);
  const sEd = 0 * (wEd / 100); // placeholder p/ educação

  return Number((base + sS + sL + sEd).toFixed(2));
}

function biasFlags(text, forbidden) {
  const T = (text || '').toLowerCase();
  const flags = [];
  (forbidden || []).forEach(term => {
    if (T.includes(String(term).toLowerCase())) flags.push(term);
  });
  return Array.from(new Set(flags));
}

/**
 * POST /api/hr/process-one
 * Body: { company_id, candidate_id, criteria_id }
 * Calcula parsed/score/flags para 1 candidato com base nos critérios.
 */
r.post('/hr/process-one', async (req, res) => {
  try {
    const { company_id, candidate_id, criteria_id } = req.body;
    if (!company_id || !candidate_id || !criteria_id)
      return res.status(400).json({ error: 'Missing fields' });

    const { data: cand } = await supa
      .from('hr_candidates')
      .select('*')
      .eq('id', candidate_id)
      .eq('company_id', company_id)
      .single();

    const { data: crit } = await supa
      .from('hr_criteria')
      .select('*')
      .eq('id', criteria_id)
      .eq('company_id', company_id)
      .single();

    if (!cand || !crit) return res.status(404).json({ error: 'candidate or criteria not found' });

    const parsed = extractStructure(cand.cv_text || '');
    const score = scoreCandidate(parsed, crit);
    const flags = biasFlags(cand.cv_text || '', crit.forbidden_terms || []);

    await supa
      .from('hr_candidates')
      .update({ parsed_json: parsed, score, bias_flags: flags })
      .eq('id', candidate_id);

    res.json({ ok: true, score, parsed, bias_flags: flags });
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) });
  }
});

/**
 * POST /api/hr/rank-all
 * Body: { company_id, criteria_id }
 * Ordena todos os candidatos da empresa conforme os critérios.
 */
r.post('/hr/rank-all', async (req, res) => {
  try {
    const { company_id, criteria_id } = req.body;
    if (!company_id || !criteria_id)
      return res.status(400).json({ error: 'Missing fields' });

    const { data: crit } = await supa
      .from('hr_criteria')
      .select('*')
      .eq('id', criteria_id)
      .eq('company_id', company_id)
      .single();

    const { data: cands } = await supa
      .from('hr_candidates')
      .select('*')
      .eq('company_id', company_id);

    const ranked = (cands || [])
      .map(c => {
        const p = extractStructure(c.cv_text || '');
        const s = scoreCandidate(p, crit);
        const f = biasFlags(c.cv_text || '', crit.forbidden_terms || []);
        return { id: c.id, name: c.name, email: c.email, score: s, parsed: p, bias_flags: f };
      })
      .sort((a, b) => b.score - a.score);

    res.json({ ok: true, ranked });
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) });
  }
});

/* ====================== NOVO: Gestão de Critérios de RH ======================= */

/**
 * POST /api/hr/criteria/save
 * Body: {
 *   company_id, title='Padrão',
 *   weight_experience=30, weight_skills=40, weight_languages=20, weight_education=10,
 *   must_have_skills=[], must_have_languages=[], forbidden_terms=[]
 * }
 */
r.post('/hr/criteria/save', async (req, res) => {
  try {
    const {
      company_id,
      title = 'Padrão',
      weight_experience = 30,
      weight_skills = 40,
      weight_languages = 20,
      weight_education = 10,
      must_have_skills = [],
      must_have_languages = [],
      forbidden_terms = []
    } = req.body;

    if (!company_id) return res.status(400).json({ error: 'company_id required' });

    const { data, error } = await supa
      .from('hr_criteria')
      .insert({
        company_id,
        title,
        weight_experience,
        weight_skills,
        weight_languages,
        weight_education,
        must_have_skills,
        must_have_languages,
        forbidden_terms
      })
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    res.json({ ok: true, criteria: data });
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) });
  }
});

/**
 * GET /api/hr/criteria/list?company_id=...
 */
r.get('/hr/criteria/list', async (req, res) => {
  try {
    const { company_id } = req.query;
    if (!company_id) return res.status(400).json({ error: 'company_id required' });

    const { data, error } = await supa
      .from('hr_criteria')
      .select('*')
      .eq('company_id', company_id)
      .order('created_at', { ascending: false });

    if (error) return res.status(500).json({ error: error.message });
    res.json({ ok: true, criteria: data || [] });
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) });
  }
});

export default r;
