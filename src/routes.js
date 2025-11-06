// src/routes.js
import { Router } from 'express';

const r = Router();

// helper: monta módulo se existir (ignora se não existir)
async function attach(modulePath, mount = '/') {
  try {
    const mod = await import(modulePath);
    r.use(mount, mod.default || mod);
    console.log('[routes] mounted', modulePath, 'at', mount);
  } catch (e) {
    console.warn('[routes] skipped (not found):', modulePath);
  }
}

// monta rotas (as que não existirem serão ignoradas)
await attach('./connections.js');
await attach('./templates.js');
await attach('./invoices.js');
await attach('./hr.js');
await attach('./clients.js');
await attach('./company.js');   // ok se não existir
await attach('./ai.js', '/ai'); // ok se não existir

export default r;
