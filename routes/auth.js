const router = require('../lib/router')();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const auth = require('../middleware/auth');
const v = require('../lib/validation');
const { rateLimit } = require('express-rate-limit');
const attempts = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: { message: 'Muitas tentativas. Aguarde alguns minutos e tente novamente.' },
});
function credentials(user) {
  return {
    token: jwt.sign({ id: user.id, version: user.session_version }, process.env.JWT_SECRET, {
      algorithm: 'HS256',
      expiresIn: '8h',
    }),
    user: { id: user.id, name: user.nome, email: user.email, role: user.perfil },
  };
}
router.post('/login', attempts, async (req, res) => {
  const email = v.email(req.body.email);
  if (
    typeof req.body.password !== 'string' ||
    !req.body.password ||
    Buffer.byteLength(req.body.password) > 72
  )
    v.fail('Informe uma senha válida.');
  const [[user]] = await db.query('SELECT * FROM usuarios WHERE email=? AND ativo=1 LIMIT 1', [
    email,
  ]);
  if (!user || !(await bcrypt.compare(req.body.password, user.senha_hash)))
    v.fail('E-mail ou senha inválidos.', 401);
  res.json(credentials(user));
});
router.post('/register', attempts, async (req, res) => {
  const nome = v.text(req.body.nome, 'Nome', 3, 120),
    email = v.email(req.body.email),
    password = v.password(req.body.password);
  const perfil = req.body.perfil ?? 'aluno';
  if (!['aluno', 'personal'].includes(perfil)) v.fail('Perfil inválido.');
  const hash = await bcrypt.hash(password, 10);
  const [result] = await db.query(
    'INSERT INTO usuarios(nome,email,senha_hash,perfil) VALUES(?,?,?,?)',
    [nome, email, hash, perfil]
  );
  res.status(201).json({
    ...credentials({ id: result.insertId, nome, email, perfil, session_version: 0 }),
    message: 'Conta criada com sucesso.',
  });
});
router.put('/password', auth, async (req, res) => {
  const newPassword = v.password(req.body.newPassword);
  if (
    typeof req.body.currentPassword !== 'string' ||
    Buffer.byteLength(req.body.currentPassword) > 72
  )
    v.fail('Senha atual inválida.');
  const [[user]] = await db.query('SELECT senha_hash FROM usuarios WHERE id=?', [req.user.id]);
  if (!user || !(await bcrypt.compare(req.body.currentPassword, user.senha_hash)))
    v.fail('Senha atual incorreta.');
  await db.query('UPDATE usuarios SET senha_hash=?,session_version=session_version+1 WHERE id=?', [
    await bcrypt.hash(newPassword, 10),
    req.user.id,
  ]);
  res.json({ message: 'Senha alterada. Entre novamente com a nova senha.' });
});
module.exports = router;
