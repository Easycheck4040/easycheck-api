import { Router } from 'express';
import multer from 'multer';
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import { supa } from './supa.js';

const upload = multer({ storage: multer.memoryStorage() });
const r = Router();

r.post('/hr/upload', upload.single('cv'), async (req,res)=>{
  const { company_id, name, email } = req.body;
  const buf = req.file.buffer;
  let text = '';
  if(req.file.mimetype==='application/pdf'){ const out = await pdfParse(buf); text = out.text; }
  else if(req.file.mimetype.includes('word')||req.file.originalname.endsWith('.docx')){
    const out = await mammoth.extractRawText({ buffer: buf }); text = out.value;
  } else { text = buf.toString('utf8'); }
  const { data: cand, error } = await supa.from('hr_candidates').insert({ company_id, name, email, cv_text: text }).select().single();
  if(error) return res.status(500).json({error:error.message});
  res.json({ ok:true, candidate: cand });
});

function extractStructure(text){
  const T = (text||'').toLowerCase();
  const skillsDict = ['excel','python','sql','javascript','accounting','sage','sap','office','react','node','java','communication','leadership'];
  const langDict = ['portuguese','português','french','français','german','deutsch','english','spanish','italian','luxembourgish'];
  const skills = skillsDict.filter(s=>T.includes(s));
  const languages = langDict.filter(l=>T.includes(l));
  const exp = T.match(/(\d+)\s*(years|anos|ans|jahre)/); const years = exp ? Number(exp[1]) : 0;
  return { experienceYears: years, skills, languages, education: [] };
}
function scoreCandidate(parsed, crit){
  const wE=crit.weight_experience||30, wS=crit.weight_skills||40, wL=crit.weight_languages||20, wEd=crit.weight_education||10;
  const base = Math.min(parsed.experienceYears*10, 100)*(wE/100);
  const ks = (crit.must_have_skills||[]).map(s=>String(s).toLowerCase());
  const ls = (crit.must_have_languages||[]).map(s=>String(s).toLowerCase());
  const hitS = ks.reduce((a,s)=> a + (parsed.skills.includes(s)?1:0), 0);
  const hitL = ls.reduce((a,l)=> a + (parsed.languages.join(' ').includes(l)?1:0), 0);
  const sS = Math.min(100, (hitS/Math.max(ks.length,1))*100)*(wS/100);
  const sL = Math.min(100, (hitL/Math.max(ls.length,1))*100)*(wL/100);
  const sEd = 0*(wEd/100);
  return Number((base + sS + sL + sEd).toFixed(2));
}
function biasFlags(text, forbidden){
  const T = (text||'').toLowerCase();
  const flags = [];
  (forbidden||[]).forEach(term=>{ if(T.includes(String(term).toLowerCase())) flags.push(term) });
  return Array.from(new Set(flags));
}

r.post('/hr/process-one', async (req,res)=>{
  const { company_id, candidate_id, criteria_id } = req.body;
  const { data: cand } = await supa.from('hr_candidates').select('*').eq('id', candidate_id).eq('company_id', company_id).single();
  const { data: crit } = await supa.from('hr_criteria').select('*').eq('id', criteria_id).eq('company_id', company_id).single();
  const parsed = extractStructure(cand.cv_text||'');
  const score = scoreCandidate(parsed, crit);
  const flags = biasFlags(cand.cv_text||'', crit.forbidden_terms||[]);
  await supa.from('hr_candidates').update({ parsed_json: parsed, score, bias_flags: flags }).eq('id', candidate_id);
  res.json({ ok:true, score, parsed, bias_flags: flags });
});

r.post('/hr/rank-all', async (req,res)=>{
  const { company_id, criteria_id } = req.body;
  const { data: crit } = await supa.from('hr_criteria').select('*').eq('id', criteria_id).eq('company_id', company_id).single();
  const { data: cands } = await supa.from('hr_candidates').select('*').eq('company_id', company_id);
  const ranked = (cands||[]).map(c=>{
    const p = extractStructure(c.cv_text||''); const s = scoreCandidate(p, crit); const f = biasFlags(c.cv_text||'', crit.forbidden_terms||[]);
    return { id:c.id, name:c.name, email:c.email, score:s, parsed:p, bias_flags:f };
  }).sort((a,b)=>b.score-a.score);
  res.json({ ok:true, ranked });
});

export default r;
