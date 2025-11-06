import { Router } from 'express';
import connections from './connections.js';
import templates from './templates.js';
import invoices from './invoices.js';
import hr from './hr.js';
import ai from './ai.js';

const r = Router();
r.use(connections);
r.use(templates);
r.use(invoices);
r.use(hr);
r.use('/ai', ai);
export default r;
