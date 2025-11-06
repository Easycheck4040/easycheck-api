import { Router } from 'express';
import { supa } from './supa.js';
import { seal } from './crypto.js';

const r = Router();

r.post('/connections/save', async (req,res)=>{
  const { company_id, type, display_name, config } = req.body;
  if(!company_id || !type || !config) return res.status(400).json({error:'Missing fields'});

  const enc = {};
  for(const [k,v] of Object.entries(config)) enc[k] = (/pass|key|secret/i.test(k)) ? seal(String(v)) : v;

  const { data, error } = await supa.from('connections')
    .insert({ company_id, type, display_name, config_json: enc, is_active:true })
    .select().single();

  if(error) return res.status(500).json({error:error.message});
  res.json({ ok:true, connection:data });
});

export default r;
