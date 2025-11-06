import { Router } from 'express';
import { supa } from './supa.js';
import { detectIntent } from './intents.js';

const r = Router();

r.post('/assistant', async (req,res)=>{
  const { company_id, message, locale='pt' } = req.body;
  const intent = detectIntent(message);
  try{
    if(intent==='create_meeting'){
      await supa.from('meetings').insert({ company_id, title:'Meeting', start_at:new Date().toISOString() });
      return res.json({ ok:true, reply:'📅 Reunião criada.' });
    }
    if(intent==='generate_report'){
      const { data: invs } = await supa.from('invoices').select('total').eq('company_id', company_id);
      const sum = (invs||[]).reduce((a,b)=>a+(+b.total||0),0).toFixed(2);
      return res.json({ ok:true, reply:`Receita total: €${sum}` });
    }
    if(intent==='email_invoices'){ return res.json({ ok:true, reply:'✅ Posso enviar as faturas (ligar IDs reais no front).'}); }
    if(intent==='send_dunning'){ return res.json({ ok:true, reply:'📨 Rapel enviado (MVP).'}); }
    return res.json({ ok:true, reply:'👋 Diga, por exemplo: "Enviar a fatura 63 ao gestor Daniel".' });
  }catch(e){
    res.status(500).json({ ok:false, error:String(e.message||e) });
  }
});

export default r;
