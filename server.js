import express from 'express';
import cors from 'cors';
import routes from './src/routes.js';

const app = express();

app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '20mb' }));

// Health checks
app.get('/', (_,res)=>res.send('Easycheck API'));
app.get('/health', (_,res)=>res.json({ ok:true }));

// API
app.use('/api', routes);

app.listen(process.env.PORT || 3000, () => {
  console.log('API on');
});
