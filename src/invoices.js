import { Router } from 'express';
import { supa } from './supa.js';
import { smtpFromConnection } from './email.js';

const r = Router();

r.post('/invoices/create', async (req,res)=>{
  const { company_id, client_id, items=[], due_date, currency='EUR' } = req.body;
  let subtotal=0, vat_total=0;
  items.forEach(it=>{
    const line=(+it.qty||1)*(+it.unit_price||0);
    const vat=line*(+it.vat_rate||0)/100;
    subtotal+=line; vat_total+=vat;
  });
  const total=subtotal+vat_total;
  const number='FAT-'+Date.now();

  const { data: inv, error } = await supa.from('invoices').insert({
    company_id, client_id, number,
    issue_date:new Date().toISOString().slice(0,10),
    due_date, currency, subtotal, vat_total, total, status:'draft'
  }).select().single();

  if(error) return res.status(500).json({error:error.message});
  res.json({ ok:true, invoice: inv });
});

r.post('/invoices/send', async (req,res)=>{
  const { company_id, invoice_id, template_id, connection_id } = req.body;

  const { data: inv } = await supa.from('invoices').select('*')
    .eq('id', invoice_id).eq('company_id', company_id).single();

  const { data: cli } = await supa.from('clients').select('*')
    .eq('id', inv.client_id).single();

  const { data: conn } = await supa.from('connections').select('*')
    .eq('id', connection_id).eq('company_id', company_id).single();

  const data_map = {
    'company.name': '<<SET COMPANY>>',
    'client.name': cli?.name||'Client',
    'invoice.number': inv.number,
    'invoice.date': inv.issue_date,
    'invoice.total': inv.total
  };

  const pdfResp = await fetch(`${process.env.PUBLIC_URL}/api/templates/render`, {
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ company_id, template_id, data_map })
  }).then(r=>r.json());

  if(conn.type==='email_smtp'){
    const t = smtpFromConnection(conn);
    await t.sendMail({
      from: conn.config_json.from || conn.config_json.user,
      to: cli.email,
      subject: `Invoice ${inv.number}`,
      html: `<p>Please find attached invoice ${inv.number}.</p>`,
      attachments: [{ filename: `${inv.number}.pdf`, path: pdfResp.pdf_url }]
    });
  }

  await supa.from('invoices').update({ status:'sent', doc_pdf_url: pdfResp.pdf_url }).eq('id', invoice_id);
  await supa.from('mail_log').insert({ company_id, to_email: cli.email, subject:`Invoice ${inv.number}`, status:'sent', payload_json: pdfResp });

  res.json({ ok:true, sent:true });
});

export default r;
