require('dotenv').config();
const db = require('../db');
(async () => {
  const c = await db.getConnection();
  try {
    const database = process.env.DB_NAME || 'fithtech';
    async function column(table, name, definition) {
      const [rows] = await c.query(
        'SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=? AND TABLE_NAME=? AND COLUMN_NAME=?',
        [database, table, name]
      );
      if (!rows.length) await c.query(`ALTER TABLE ${table} ADD COLUMN ${name} ${definition}`);
    }
    await column('usuarios', 'telefone', 'VARCHAR(30) NULL');
    await column('usuarios', 'bio', 'VARCHAR(500) NULL');
    await column(
      'usuarios',
      'atualizado_em',
      'TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'
    );
    await column('usuarios', 'session_version', 'INT UNSIGNED NOT NULL DEFAULT 0');
    await column('usuarios', 'objetivo', 'VARCHAR(180) NULL');
    await column('usuarios', 'demonstracao', 'BOOLEAN NOT NULL DEFAULT FALSE');
    await column('usuarios', 'acesso_legado', 'BOOLEAN NOT NULL DEFAULT TRUE');
    await c.query('ALTER TABLE usuarios ALTER COLUMN acesso_legado SET DEFAULT FALSE');
    await c.query(
      require('fs').readFileSync(require('path').join(__dirname, '../database/billing.sql'), 'utf8')
    );
    await column('treinos', 'dias_treino', 'VARCHAR(20) NULL');
    await column('exercicios', 'descanso_seg', 'SMALLINT UNSIGNED NOT NULL DEFAULT 60');
    await column('exercicios', 'observacoes', 'VARCHAR(500) NULL');
    await column('progresso', 'carga_kg', 'DECIMAL(7,2) NULL');
    await column(
      'treinos',
      'atualizado_em',
      'TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'
    );
    await column('progresso', 'exercicio_nome', 'VARCHAR(120) NULL');
    await column('progresso', 'treino_nome', 'VARCHAR(120) NULL');
    await column('progresso', 'data_execucao', 'DATE NULL');
    await c.query(`UPDATE progresso p JOIN exercicios e ON e.id=p.exercicio_id JOIN treinos t ON t.id=e.treino_id
      SET p.exercicio_nome=COALESCE(p.exercicio_nome,e.nome),p.treino_nome=COALESCE(p.treino_nome,t.nome)`);
    await c.query(
      'UPDATE progresso SET data_execucao=DATE(concluido_em) WHERE data_execucao IS NULL'
    );
    // Preserve duplicate legacy history as snapshots; only one retains the exercise reference per day.
    await c.query(`UPDATE progresso p JOIN (SELECT aluno_id,exercicio_id,data_execucao,MIN(id) keep_id
      FROM progresso WHERE exercicio_id IS NOT NULL GROUP BY aluno_id,exercicio_id,data_execucao HAVING COUNT(*)>1) duplicates
      ON p.aluno_id=duplicates.aluno_id AND p.exercicio_id=duplicates.exercicio_id AND p.data_execucao=duplicates.data_execucao
      SET p.exercicio_id=NULL WHERE p.id<>duplicates.keep_id`);
    await c.query('ALTER TABLE progresso MODIFY COLUMN data_execucao DATE NOT NULL');
    async function index(table, name, sql) {
      const [rows] = await c.query(
        'SELECT 1 FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=? AND TABLE_NAME=? AND INDEX_NAME=?',
        [database, table, name]
      );
      if (!rows.length) await c.query(sql);
    }
    await index(
      'progresso',
      'uq_progresso_dia',
      'CREATE UNIQUE INDEX uq_progresso_dia ON progresso(aluno_id,exercicio_id,data_execucao)'
    );
    await index(
      'progresso',
      'idx_progresso_aluno_data',
      'CREATE INDEX idx_progresso_aluno_data ON progresso(aluno_id,concluido_em)'
    );
    await index(
      'treinos',
      'idx_treinos_aluno_ativo',
      'CREATE INDEX idx_treinos_aluno_ativo ON treinos(aluno_id,ativo)'
    );
    console.log('Migração FTECH concluída. Usuários, treinos e histórico preservados.');
  } finally {
    c.release();
  }
})()
  .catch((e) => {
    console.error('Erro na migração:', e.code || e.message);
    process.exitCode = 1;
  })
  .finally(() => db.end());
