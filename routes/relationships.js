const router = require('../lib/router')();
const db = require('../db');
const auth = require('../middleware/auth');
const access = require('../middleware/access');
const v = require('../lib/validation');
function role(req, expected) {
  if (req.user.role !== expected) v.fail('Acesso restrito.', 403);
}
router.get('/students', auth, access, async (req, res) => {
  role(req, 'personal');
  const [rows] = await db.query(
    `SELECT u.id,u.nome,u.email,u.telefone,u.objetivo FROM aluno_personal ap JOIN usuarios u ON u.id=ap.aluno_id WHERE ap.personal_id=? AND ap.ativo=1 AND u.ativo=1 ORDER BY u.nome`,
    [req.user.id]
  );
  res.json(rows);
});
router.get('/trainer', auth, access, async (req, res) => {
  role(req, 'aluno');
  const [rows] = await db.query(
    `SELECT u.id,u.nome,u.email,u.telefone,u.bio FROM aluno_personal ap JOIN usuarios u ON u.id=ap.personal_id WHERE ap.aluno_id=? AND ap.ativo=1 AND u.ativo=1 LIMIT 1`,
    [req.user.id]
  );
  res.json(rows[0] || null);
});
router.get('/all', auth, access, async (req, res) => {
  role(req, 'admin');
  const [rows] = await db.query(
    `SELECT ap.id,ap.ativo,a.id aluno_id,a.nome aluno_nome,p.id personal_id,p.nome personal_nome FROM aluno_personal ap JOIN usuarios a ON a.id=ap.aluno_id JOIN usuarios p ON p.id=ap.personal_id ORDER BY a.nome`
  );
  res.json(rows);
});
router.get('/options', auth, access, async (req, res) => {
  role(req, 'admin');
  const [alunos] = await db.query(
    "SELECT id,nome FROM usuarios WHERE perfil='aluno' AND ativo=1 ORDER BY nome"
  );
  const [personais] = await db.query(
    "SELECT id,nome FROM usuarios WHERE perfil='personal' AND ativo=1 ORDER BY nome"
  );
  res.json({ alunos, personais });
});
router.post('/', auth, access, async (req, res) => {
  role(req, 'admin');
  const aluno = v.integer(req.body.aluno_id, 'Aluno'),
    personal = v.integer(req.body.personal_id, 'Professor');
  if (aluno === personal) v.fail('Aluno e professor devem ser pessoas diferentes.');
  const c = await db.getConnection();
  try {
    await c.beginTransaction();
    const [users] = await c.query(
      'SELECT id,perfil,ativo FROM usuarios WHERE id IN (?,?) ORDER BY id FOR UPDATE',
      [aluno, personal]
    );
    if (
      !users.some((u) => u.id === aluno && u.perfil === 'aluno' && u.ativo) ||
      !users.some((u) => u.id === personal && u.perfil === 'personal' && u.ativo)
    )
      v.fail('Selecione um aluno e um professor ativos.');
    await c.query('UPDATE aluno_personal SET ativo=0 WHERE aluno_id=?', [aluno]);
    await c.query(
      'INSERT INTO aluno_personal(aluno_id,personal_id,ativo) VALUES(?,?,1) ON DUPLICATE KEY UPDATE ativo=1',
      [aluno, personal]
    );
    await c.commit();
    res.status(201).json({ message: 'Aluno vinculado ao professor.' });
  } catch (error) {
    await c.rollback();
    throw error;
  } finally {
    c.release();
  }
});
router.delete('/:id', auth, access, async (req, res) => {
  role(req, 'admin');
  const [result] = await db.query('UPDATE aluno_personal SET ativo=0 WHERE id=?', [
    v.integer(req.params.id, 'Vínculo'),
  ]);
  if (!result.affectedRows) v.fail('Vínculo não encontrado.', 404);
  res.json({ message: 'Vínculo desativado.' });
});
module.exports = router;
