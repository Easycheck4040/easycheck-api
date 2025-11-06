import { Router } from 'express';
import { supa } from './supa.js';

const r = Router();

// criar cliente
r.post('/clients/create', async (req,res)=>{
  try{
    const { company_id, name, email, vat, address, country='LU', locale='pt', dunning_days=15, auto_dunning=false } = req.body;
    if(!company_id || !name) return res.status(400).json({error:'Missing fields'});
    const { data, error } = await supa.from('clients').insert({
      company_id, name, email, vat, address, country, locale, dunning_days, auto_dunning
    }).select().single();
    if(error) return res.status(500).json({error:error.message});
    res.json({ ok:true, client:data });
  }catch(e){ res.status(500).json({error:String(e.message||e)}); }
});

// listar clientes
r.get('/clients/list', async (req,res)=>{
  try{
    const { company_id } = req.query;
    if(!company_id) return res.status(400).json({error:'company_id required'});
    const { data, error } = await supa.from('clients')
      .select('*').eq('company_id', company_id).order('created_at', { ascending:false });
    if(error) return res.status(500).json({error:error.message});
    res.json({ ok:true, clients:data||[] });
  }catch(e){ res.status(500).json({error:String(e.message||e)}); }
});

export default r;
