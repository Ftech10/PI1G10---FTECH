const router = require('../lib/router')();
const db = require('../db');
const auth = require('../middleware/auth');
const access = require('../middleware/access');
const v = require('../lib/validation');
const { validateDays, presentWorkout, readDays } = require('../lib/schedule');
function trainer(req) {
  if (req.user.role !== 'personal') v.fail('Somente professores podem gerenciar treinos.', 403);
}
async function ownsWorkout(id, user, connection = db, lock = false) {
  const [rows] = await connection.query(
    `SELECT * FROM treinos WHERE id=? AND ativo=1${lock ? ' FOR UPDATE' : ''}`,
    [id]
  );
  const t = rows[0];
  if (!t) v.fail('Treino não encontrado.', 404);
  if (user.role === 'admin' || (user.role === 'aluno' && t.aluno_id === user.id)) return t;
  if (user.role === 'personal' && t.personal_id === user.id) {
    const [links] = await connection.query(
      `SELECT id FROM aluno_personal WHERE aluno_id=? AND personal_id=? AND ativo=1${lock ? ' FOR UPDATE' : ''}`,
      [t.aluno_id, user.id]
    );
    if (links.length) return t;
  }
  v.fail('Treino não encontrado ou vínculo encerrado.', 404);
}
router.get('/mine', auth, access, async (req, res) => {
  let sql, params;
  if (req.user.role === 'aluno') {
    sql = `SELECT t.*,u.nome personal_nome FROM treinos t JOIN usuarios u ON u.id=t.personal_id WHERE t.aluno_id=? AND t.ativo=1 ORDER BY t.criado_em DESC`;
    params = [req.user.id];
  } else if (req.user.role === 'personal') {
    sql = `SELECT t.*,u.nome aluno_nome FROM treinos t JOIN usuarios u ON u.id=t.aluno_id JOIN aluno_personal ap ON ap.aluno_id=t.aluno_id AND ap.personal_id=t.personal_id AND ap.ativo=1 WHERE t.personal_id=? AND t.ativo=1 AND u.ativo=1 ORDER BY t.criado_em DESC`;
    params = [req.user.id];
  } else if (req.user.role === 'admin') {
    sql = `SELECT t.*,a.nome aluno_nome,p.nome personal_nome FROM treinos t JOIN usuarios a ON a.id=t.aluno_id JOIN usuarios p ON p.id=t.personal_id WHERE t.ativo=1 ORDER BY t.criado_em DESC`;
    params = [];
  } else v.fail('Acesso restrito.', 403);
  const [rows] = await db.query(sql, params);
  if (rows.length) {
    const [exercises] = await db.query(
      'SELECT * FROM exercicios WHERE treino_id IN (?) ORDER BY ordem,id',
      [rows.map((t) => t.id)]
    );
    const grouped = new Map();
    for (const e of exercises) {
      if (!grouped.has(e.treino_id)) grouped.set(e.treino_id, []);
      grouped.get(e.treino_id).push(e);
    }
    for (const t of rows) t.exercicios = grouped.get(t.id) || [];
  }
  const [[clock]] = await db.query('SELECT DAYOFWEEK(CURDATE())-1 dia');
  res.json(rows.map((t) => presentWorkout(t, clock.dia)));
});
async function writeWorkout(req, res, editing) {
  trainer(req);
  const data = v.workout(req.body),
    workoutId = editing ? v.integer(req.params.id, 'Treino') : null;
  let days = validateDays(req.body.dias_treino);
  let frequency = days.length || data.dias_semana;
  const c = await db.getConnection();
  try {
    await c.beginTransaction();
    let id = workoutId;
    if (editing) {
      const existing = await ownsWorkout(id, req.user, c, true);
      if (req.body.dias_treino === undefined) {
        days = readDays(existing.dias_treino);
        frequency = days.length || data.dias_semana;
      }
      await c.query('UPDATE treinos SET nome=?,foco=?,dias_semana=?,dias_treino=? WHERE id=?', [
        data.nome,
        data.foco,
        frequency,
        JSON.stringify(days),
        id,
      ]);
    } else {
      const aluno = v.integer(req.body.aluno_id, 'Aluno');
      const [link] = await c.query(
        `SELECT ap.id FROM aluno_personal ap JOIN usuarios u ON u.id=ap.aluno_id WHERE ap.aluno_id=? AND ap.personal_id=? AND ap.ativo=1 AND u.ativo=1 FOR UPDATE`,
        [aluno, req.user.id]
      );
      if (!link.length) v.fail('Aluno não vinculado ou inativo.', 403);
      if (data.exercicios.some((e) => e.id))
        v.fail('Novos exercícios não devem possuir identificador.');
      const [r] = await c.query(
        'INSERT INTO treinos(aluno_id,personal_id,nome,foco,dias_semana,dias_treino) VALUES(?,?,?,?,?,?)',
        [aluno, req.user.id, data.nome, data.foco, frequency, JSON.stringify(days)]
      );
      id = r.insertId;
    }
    const [old] = await c.query('SELECT id FROM exercicios WHERE treino_id=?', [id]);
    const oldIds = new Set(old.map((e) => e.id)),
      kept = new Set();
    for (let index = 0; index < data.exercicios.length; index++) {
      const e = data.exercicios[index],
        values = [
          e.nome,
          e.grupo_muscular,
          e.series,
          e.repeticoes,
          e.video_url,
          index + 1,
          e.descanso_seg,
          e.observacoes,
        ];
      if (e.id) {
        if (!oldIds.has(e.id)) v.fail('Exercício não pertence ao treino.');
        await c.query(
          'UPDATE exercicios SET nome=?,grupo_muscular=?,series=?,repeticoes=?,video_url=?,ordem=?,descanso_seg=?,observacoes=? WHERE id=? AND treino_id=?',
          [...values, e.id, id]
        );
        kept.add(e.id);
      } else
        await c.query(
          'INSERT INTO exercicios(treino_id,nome,grupo_muscular,series,repeticoes,video_url,ordem,descanso_seg,observacoes) VALUES(?,?,?,?,?,?,?,?,?)',
          [id, ...values]
        );
    }
    for (const eid of oldIds)
      if (!kept.has(eid))
        await c.query('DELETE FROM exercicios WHERE id=? AND treino_id=?', [eid, id]);
    await c.commit();
    res.status(editing ? 200 : 201).json({
      id,
      message: editing ? 'Treino atualizado e histórico preservado.' : 'Treino criado.',
    });
  } catch (error) {
    await c.rollback();
    throw error;
  } finally {
    c.release();
  }
}
router.post('/', auth, access, (req, res) => writeWorkout(req, res, false));
router.put('/:id', auth, access, (req, res) => writeWorkout(req, res, true));
router.delete('/:id', auth, access, async (req, res) => {
  trainer(req);
  const c = await db.getConnection();
  try {
    await c.beginTransaction();
    const t = await ownsWorkout(v.integer(req.params.id, 'Treino'), req.user, c, true);
    await c.query('UPDATE treinos SET ativo=0 WHERE id=?', [t.id]);
    await c.commit();
    res.json({ message: 'Treino arquivado.' });
  } catch (error) {
    await c.rollback();
    throw error;
  } finally {
    c.release();
  }
});
router.get('/:id', auth, access, async (req, res) => {
  const t = await ownsWorkout(v.integer(req.params.id, 'Treino'), req.user);
  const [exercicios] = await db.query(
    `SELECT e.*,(SELECT p.carga_kg FROM progresso p WHERE p.exercicio_id=e.id AND p.aluno_id=? AND p.data_execucao=CURDATE() LIMIT 1) carga_hoje,EXISTS(SELECT 1 FROM progresso p WHERE p.exercicio_id=e.id AND p.aluno_id=? AND p.data_execucao=CURDATE()) concluido FROM exercicios e WHERE e.treino_id=? ORDER BY e.ordem,e.id`,
    [t.aluno_id, t.aluno_id, t.id]
  );
  const [[clock]] = await db.query(
    "SELECT DAYOFWEEK(CURDATE())-1 dia,DATE_FORMAT(CURDATE(),'%Y-%m-%d') hoje"
  );
  res.json({ ...presentWorkout(t, clock.dia), exercicios, hoje: clock.hoje });
});
module.exports = router;
