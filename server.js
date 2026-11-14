require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const path = require('path');
const db = require('./db');
const app = express();
app.disable('x-powered-by');
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        'script-src': ["'self'"],
        'script-src-attr': ["'none'"],
        'style-src': ["'self'", "'unsafe-inline'"],
        'img-src': ["'self'", 'data:'],
        'upgrade-insecure-requests': null,
      },
    },
    strictTransportSecurity: process.env.NODE_ENV === 'production' ? undefined : false,
  })
);
app.use(express.json({ limit: '100kb' }));
app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) {
    res.set('Cache-Control', 'no-store');
    if (req.body === undefined) req.body = {};
    if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body))
      return res.status(400).json({ message: 'Corpo da requisição inválido.' });
  }
  next();
});
for (const route of ['auth', 'billing', 'users', 'workouts', 'relationships', 'progress', 'stats'])
  app.use('/api/' + route, require('./routes/' + route));
app.get('/api/health', (req, res) => res.json({ status: 'ok', app: 'FTECH API' }));
app.use('/api', (req, res) => res.status(404).json({ message: 'Rota não encontrada.' }));
app.use(express.static(path.join(__dirname, 'public')));
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.use((req, res) => res.status(404).send('Página não encontrada.'));
app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  if (error.code === 'ER_DUP_ENTRY')
    return res.status(409).json({ message: 'Este registro já está cadastrado.' });
  let status = error.status || 500;
  if (status < 400 || status > 599) status = 500;
  if (status >= 500) console.error('Falha na API:', error.code || error.name);
  const message =
    status >= 500
      ? 'Não foi possível concluir a operação. Verifique o serviço e tente novamente.'
      : error.type === 'entity.parse.failed'
        ? 'JSON inválido.'
        : error.type === 'entity.too.large'
          ? 'Requisição muito grande.'
          : error.message;
  res.status(status).json({ message });
});
async function start() {
  const secret = process.env.JWT_SECRET || '';
  if (secret.length < 32 || /troque|sua.chave/i.test(secret))
    throw new Error('Configure JWT_SECRET com uma chave aleatória de pelo menos 32 caracteres.');
  await db.query('SELECT session_version FROM usuarios LIMIT 1');
  await db.query('SELECT data_execucao,carga_kg FROM progresso LIMIT 1');
  await db.query('SELECT dias_treino FROM treinos LIMIT 1');
  await db.query('SELECT objetivo,demonstracao,acesso_legado FROM usuarios LIMIT 1');
  await db.query('SELECT id FROM assinaturas LIMIT 1');
  await db.query('SELECT descanso_seg,observacoes FROM exercicios LIMIT 1');
  const server = await new Promise((resolve, reject) => {
    const instance = app.listen(Number(process.env.PORT) || 3000, () => resolve(instance));
    instance.once('error', reject);
  });
  console.log(`FTECH em http://localhost:${server.address().port}`);
  const shutdown = () => server.close(() => db.end().then(() => process.exit(0)));
  process.once('SIGTERM', shutdown);
  process.once('SIGINT', shutdown);
  return server;
}
if (require.main === module)
  start().catch(async (error) => {
    console.error('Não foi possível iniciar o FTECH:', error.code || error.message);
    console.error(
      'Confira o .env e execute npm run db (banco novo) ou npm run migrate (banco existente).'
    );
    await db.end();
    process.exitCode = 1;
  });
module.exports = { app, start };
