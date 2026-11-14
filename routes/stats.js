const router = require('../lib/router')();
const db = require('../db');
const auth = require('../middleware/auth');
const access = require('../middleware/access');
const v = require('../lib/validation');
const { readDays } = require('../lib/schedule');
router.get('/dashboard', auth, access, async (req, res) => {
  const [[clock]] = await db.query(
    "SELECT DAYOFWEEK(CURDATE())-1 dia,DATE_FORMAT(CURDATE(),'%Y-%m-%d') hoje"
  );
  const [[identity]] = await db.query('SELECT demonstracao FROM usuarios WHERE id=?', [
    req.user.id,
  ]);
  if (req.user.role === 'aluno') {
    const [plans] = await db.query(
      `SELECT t.id,t.nome,t.dias_treino,
      (SELECT COUNT(*) FROM exercicios e WHERE e.treino_id=t.id) exercicios,
      (SELECT COUNT(DISTINCT p.exercicio_id) FROM progresso p JOIN exercicios e ON e.id=p.exercicio_id
       WHERE e.treino_id=t.id AND p.aluno_id=? AND p.data_execucao=CURDATE()) concluidos
      FROM treinos t WHERE t.aluno_id=? AND t.ativo=1`,
      [req.user.id, req.user.id]
    );
    const scheduled = plans.filter((t) => readDays(t.dias_treino).includes(clock.dia));
    const total = scheduled.reduce((sum, t) => sum + t.exercicios, 0);
    const done = scheduled.reduce((sum, t) => sum + t.concluidos, 0);
    const [[history]] = await db.query(
      `SELECT COUNT(*) total,COUNT(DISTINCT CASE WHEN data_execucao>=DATE_SUB(CURDATE(),INTERVAL 6 DAY) AND data_execucao<=CURDATE() THEN data_execucao END) dias_ativos FROM progresso WHERE aluno_id=?`,
      [req.user.id]
    );
    const [months] = await db.query(
      `SELECT DATE_FORMAT(data_execucao,'%Y-%m') mes,COUNT(*) total FROM progresso WHERE aluno_id=? AND data_execucao>=DATE_SUB(DATE_FORMAT(CURDATE(),'%Y-%m-01'),INTERVAL 5 MONTH) GROUP BY mes ORDER BY mes`,
      [req.user.id]
    );
    const [recent] = await db.query(
      `SELECT id,exercicio_nome exercicio,treino_nome treino,data_execucao,carga_kg FROM progresso WHERE aluno_id=? ORDER BY concluido_em DESC,id DESC LIMIT 3`,
      [req.user.id]
    );
    const [[user]] = await db.query('SELECT objetivo FROM usuarios WHERE id=?', [req.user.id]);
    const [[trainer]] = await db.query(
      `SELECT u.id,u.nome FROM aluno_personal ap JOIN usuarios u ON u.id=ap.personal_id WHERE ap.aluno_id=? AND ap.ativo=1 AND u.ativo=1 LIMIT 1`,
      [req.user.id]
    );
    return res.json({
      demonstracao: !!identity.demonstracao,
      hoje: clock.hoje,
      dia_semana: clock.dia,
      treinos: plans.length,
      exercicios: plans.reduce((sum, t) => sum + t.exercicios, 0),
      exercicios_hoje: total,
      treinos_hoje: scheduled.length,
      concluidos: done,
      percentual: total ? Math.round((done / total) * 100) : 0,
      sem_agenda: plans.filter((t) => !readDays(t.dias_treino).length).length,
      historico_total: history.total,
      dias_ativos_semana: history.dias_ativos,
      meses: months,
      objetivo: user.objetivo || '',
      professor: trainer || null,
      ultimas_atividades: recent,
    });
  }
  if (req.user.role === 'personal') {
    const [[s]] = await db.query(
      'SELECT COUNT(*) total FROM aluno_personal ap JOIN usuarios u ON u.id=ap.aluno_id WHERE ap.personal_id=? AND ap.ativo=1 AND u.ativo=1',
      [req.user.id]
    );
    const [[w]] = await db.query(
      `SELECT COUNT(*) total FROM treinos t JOIN aluno_personal ap ON ap.aluno_id=t.aluno_id AND ap.personal_id=t.personal_id AND ap.ativo=1 JOIN usuarios u ON u.id=t.aluno_id WHERE t.personal_id=? AND t.ativo=1 AND u.ativo=1`,
      [req.user.id]
    );
    const [[p]] = await db.query(
      `SELECT COUNT(*) total FROM progresso p JOIN aluno_personal ap ON ap.aluno_id=p.aluno_id AND ap.personal_id=? AND ap.ativo=1 JOIN usuarios u ON u.id=p.aluno_id WHERE u.ativo=1`,
      [req.user.id]
    );
    const [[pending]] = await db.query(
      `SELECT COUNT(*) total FROM aluno_personal ap JOIN usuarios u ON u.id=ap.aluno_id WHERE ap.personal_id=? AND ap.ativo=1 AND u.ativo=1 AND NOT EXISTS(SELECT 1 FROM treinos t WHERE t.aluno_id=ap.aluno_id AND t.personal_id=ap.personal_id AND t.ativo=1)`,
      [req.user.id]
    );
    return res.json({
      demonstracao: !!identity.demonstracao,
      alunos: s.total,
      treinos: w.total,
      conclusoes: p.total,
      alunos_sem_treino: pending.total,
    });
  }
  if (req.user.role !== 'admin') v.fail('Acesso restrito.', 403);
  const [[u]] = await db.query('SELECT COUNT(*) total FROM usuarios WHERE ativo=1');
  const [[a]] = await db.query(
    "SELECT COUNT(*) total FROM usuarios WHERE perfil='aluno' AND ativo=1"
  );
  const [[p]] = await db.query(
    "SELECT COUNT(*) total FROM usuarios WHERE perfil='personal' AND ativo=1"
  );
  const [[w]] = await db.query('SELECT COUNT(*) total FROM treinos WHERE ativo=1');
  const [[pending]] = await db.query(
    `SELECT COUNT(*) total FROM usuarios u WHERE u.perfil='aluno' AND u.ativo=1 AND NOT EXISTS(SELECT 1 FROM aluno_personal ap WHERE ap.aluno_id=u.id AND ap.ativo=1)`
  );
  res.json({
    demonstracao: !!identity.demonstracao,
    usuarios: u.total,
    alunos: a.total,
    personais: p.total,
    treinos: w.total,
    alunos_sem_professor: pending.total,
  });
});
module.exports = router;
