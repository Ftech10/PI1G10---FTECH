const router = require('../lib/router')();
const db = require('../db');
const auth = require('../middleware/auth');
const access = require('../middleware/access');
const v = require('../lib/validation');
router.post('/complete', auth, access, async (req, res) => {
  if (req.user.role !== 'aluno') v.fail('Somente alunos registram conclusão.', 403);
  const id = v.integer(req.body.exercicio_id, 'Exercício');
  const carga = v.load(req.body.carga_kg);
  const [result] = await db.query(
    `INSERT INTO progresso(aluno_id,exercicio_id,exercicio_nome,treino_nome,data_execucao,carga_kg)
    SELECT ?,e.id,e.nome,t.nome,CURDATE(),? FROM exercicios e JOIN treinos t ON t.id=e.treino_id
    WHERE e.id=? AND t.aluno_id=? AND t.ativo=1 ON DUPLICATE KEY UPDATE id=LAST_INSERT_ID(progresso.id),carga_kg=COALESCE(VALUES(carga_kg),progresso.carga_kg)`,
    [req.user.id, carga, id, req.user.id]
  );
  if (!result.affectedRows) {
    const [existing] = await db.query(
      'SELECT p.id FROM progresso p JOIN exercicios e ON e.id=p.exercicio_id JOIN treinos t ON t.id=e.treino_id WHERE p.aluno_id=? AND p.exercicio_id=? AND p.data_execucao=CURDATE() AND t.ativo=1',
      [req.user.id, id]
    );
    if (!existing.length) v.fail('Exercício não encontrado no seu treino ativo.', 404);
  }
  res.json({ message: 'Conclusão de hoje registrada.' });
});
router.delete('/complete/:exerciseId', auth, access, async (req, res) => {
  if (req.user.role !== 'aluno') v.fail('Acesso restrito.', 403);
  await db.query(
    'DELETE FROM progresso WHERE aluno_id=? AND exercicio_id=? AND data_execucao=CURDATE()',
    [req.user.id, v.integer(req.params.exerciseId, 'Exercício')]
  );
  res.json({ message: 'Conclusão de hoje desmarcada. O histórico anterior foi mantido.' });
});
router.get('/mine', auth, access, async (req, res) => {
  const aluno = req.user.role === 'aluno' ? req.user.id : v.integer(req.query.aluno_id, 'Aluno');
  if (req.user.role === 'personal') {
    const [links] = await db.query(
      'SELECT id FROM aluno_personal WHERE aluno_id=? AND personal_id=? AND ativo=1',
      [aluno, req.user.id]
    );
    if (!links.length) v.fail('Aluno não vinculado.', 403);
  } else if (!['aluno', 'admin'].includes(req.user.role)) v.fail('Acesso restrito.', 403);
  const [rows] = await db.query(
    `SELECT p.id,p.exercicio_id,p.concluido_em,p.data_execucao,p.carga_kg,
    COALESCE(p.exercicio_nome,e.nome) exercicio,COALESCE(p.treino_nome,t.nome) treino
    FROM progresso p LEFT JOIN exercicios e ON e.id=p.exercicio_id LEFT JOIN treinos t ON t.id=e.treino_id
    WHERE p.aluno_id=? ORDER BY p.concluido_em DESC,p.id DESC`,
    [aluno]
  );
  res.json(rows);
});
module.exports = router;
