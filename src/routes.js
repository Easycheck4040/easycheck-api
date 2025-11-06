// src/routes.js
import { Router } from 'express';
import connections from './connections.js';
import templates from './templates.js';
import invoices from './invoices.js';
import hr from './hr.js';
import ai from './ai.js';
import clients from './clients.js';
import company from './company.js'; // se já criaste antes

const r = Router();

// Cada módulo expõe as suas próprias rotas (já existentes)
r.use(connections);
r.use(templates);
r.use(invoices);
r.use(hr);
r.use(clients);
r.use(company);
r.use('/ai', ai);

export default r;
