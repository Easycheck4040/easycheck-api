import puppeteer from 'puppeteer';
export async function htmlToPdf(html){
  const browser = await puppeteer.launch({ args:['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil:'load' });
  const pdf = await page.pdf({ format:'A4', printBackground:true });
  await browser.close();
  return pdf;
}
