const router = require('../lib/router')();
const db = require('../db');
const auth = require('../middleware/auth');
const access = require('../middleware/access');
const bcrypt = require('bcryptjs');
const v = require('../lib/validation');
function admin(req) {
  if (req.user.role !== 'admin') v.fail('Acesso restrito.', 403);
}
router.get('/me', auth, async (req, res) => {
  const [[user]] = await db.query(
    'SELECT id,nome,email,telefone,bio,objetivo,demonstracao,perfil,criado_em FROM usuarios WHERE id=?',
    [req.user.id]
  );
  if (!user) v.fail('Usuário não encontrado.', 404);
  res.json(user);
});
router.put('/me', auth, async (req, res) => {
  const nome = v.text(req.body.nome, 'Nome', 3, 120),
    telefone = v.text(req.body.telefone ?? '', 'Telefone', 0, 30),
    bio = v.text(req.body.bio ?? '', 'Biografia', 0, 500),
    objetivo = v.text(req.body.objetivo ?? '', 'Objetivo', 0, 180);
  await db.query('UPDATE usuarios SET nome=?,telefone=?,bio=?,objetivo=? WHERE id=?', [
    nome,
    telefone || null,
    bio || null,
    objetivo || null,
    req.user.id,
  ]);
  res.json({ message: 'Perfil atualizado com sucesso.' });
});
router.get('/', auth, access, async (req, res) => {
  admin(req);
  const [users] = await db.query(
    'SELECT id,nome,email,telefone,perfil,ativo,criado_em FROM usuarios ORDER BY nome'
  );
  res.json(users);
});
router.post('/', auth, access, async (req, res) => {
  admin(req);
  const nome = v.text(req.body.nome, 'Nome', 3, 120),
    email = v.email(req.body.email),
    hash = await bcrypt.hash(v.password(req.body.password), 10),
    perfil = req.body.perfil;
  if (!['aluno', 'personal', 'admin'].includes(perfil)) v.fail('Perfil inválido.');
  const [result] = await db.query(
    'INSERT INTO usuarios(nome,email,senha_hash,perfil) VALUES(?,?,?,?)',
    [nome, email, hash, perfil]
  );
  res.status(201).json({ id: result.insertId, message: 'Usuário criado.' });
});
router.patch('/:id/status', auth, access, async (req, res) => {
  admin(req);
  const id = v.integer(req.params.id, 'Usuário');
  if (id === req.user.id) v.fail('Você não pode alterar o status da própria conta.');
  if (typeof req.body.ativo !== 'boolean') v.fail('Informe um status válido.');
  const [result] = await db.query(
    'UPDATE usuarios SET ativo=?,session_version=session_version+1 WHERE id=?',
    [req.body.ativo ? 1 : 0, id]
  );
  if (!result.affectedRows) v.fail('Usuário não encontrado.', 404);
  res.json({ message: 'Status atualizado e sessões anteriores encerradas.' });
});
module.exports = router;
