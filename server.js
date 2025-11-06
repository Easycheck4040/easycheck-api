import express from 'express';
import cors from 'cors';
import routes from './src/routes.js';

const app = express();

app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '20mb' }));

app.get('/', (_,res)=>res.send('Easycheck API'));
app.use('/api', routes);

app.listen(process.env.PORT||3000, ()=>console.log('API on'));
