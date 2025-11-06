export function detectIntent(text){
  const t = (text||'').toLowerCase();
  if(t.includes('fatura') || t.includes('invoice')){
    if(t.includes('enviar') || t.includes('send')) return 'email_invoices';
    if(t.includes('criar') || t.includes('create')) return 'create_invoice';
  }
  if(t.includes('reuni') || t.includes('meeting')) return 'create_meeting';
  if(t.includes('rapel') || t.includes('dunning')) return 'send_dunning';
  if(t.includes('relat') || t.includes('report')) return 'generate_report';
  return 'chitchat';
}
