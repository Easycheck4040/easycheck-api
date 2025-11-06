import { Router } from 'express';
import { supa } from './supa.js';
import { htmlToPdf } from './pdf.js';

const r = Router();

r.post('/templates/save', async (req,res)=>{
  const { company_id, type, name, locale='pt', html } = req.body;
  const { data, error } = await supa.from('templates').insert({ company_id, type, name, locale, html }).select().single();
  if(error) return res.status(500).json({error:error.message});
  res.json({ ok:true, template:data });
});

r.post('/templates/render', async (req,res)=>{
  const { company_id, template_id, data_map } = req.body;
  const { data: tpl } = await supa.from('templates')
    .select('*').eq('id', template_id).eq('company_id', company_id).single();
  if(!tpl) return res.status(404).json({error:'template not found'});

  let html = tpl.html;
  for(const [k,v] of Object.entries(data_map||{})) html = html.replaceAll(`{{${k}}}`, String(v ?? ''));

  const pdf = await htmlToPdf(html);
  const path = `docs/${template_id}-${Date.now()}.pdf`;
  await supa.storage.from('documents').upload(path, pdf, { contentType:'application/pdf', upsert:true });
  const { data: signed } = await supa.storage.from('documents').createSignedUrl(path, 3600);
  res.json({ ok:true, pdf_url: signed.signedUrl });
});

export default r;
