import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import router from './routes/index.js';

dotenv.config();

// Força o Node a ignorar certificados "falsos" de redes corporativas
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const app = express();
app.use(cors());
app.use(express.json());

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err instanceof SyntaxError && 'body' in err) {
    return res.status(400).json({ erro: 'JSON inválido no corpo da requisição.' });
  }
  next(err);
});

app.get('/health', (req, res) => res.json({ status: 'ok' }));
app.use('/', router);

const port = Number(process.env.PORT) || 3333;
app.listen(port, () => {
  console.log(`🚀 Servidor do Aurum rodando na porta ${port}!`);
});
