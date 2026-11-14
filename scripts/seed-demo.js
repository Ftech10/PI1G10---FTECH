require('dotenv').config();
const bcrypt = require('bcryptjs');
const { randomUUID } = require('crypto');
const db = require('../db');
const { password } = require('../lib/validation');
const presentation = process.argv.includes('--presentation');
(async () => {
  if (process.env.NODE_ENV === 'production')
    throw new Error('Dados fictícios são permitidos apenas em desenvolvimento.');
  const initialPassword = password(process.env.DEMO_PASSWORD),
    c = await db.getConnection();
  try {
    await c.beginTransaction();
    const hash = await bcrypt.hash(initialPassword, 10);
    const accounts = [
      [
        'Lucas Souza',
        'aluno@fithtech.com',
        'aluno',
        'Manter uma rotina de treinos e acompanhar as cargas.',
        'Aluno fictício para demonstrar o uso do FTECH.',
      ],
      [
        'João Pedro',
        'personal@fithtech.com',
        'personal',
        '',
        'Professor fictício. Nesta demonstração, organiza a semana e acompanha os registros dos alunos.',
      ],
      ['Administrador', 'admin@fithtech.com', 'admin', '', 'Administração fictícia do projeto.'],
    ];
    for (const [nome, email, perfil, objetivo, bio] of accounts) {
      const [[existing]] = await c.query('SELECT id FROM usuarios WHERE email=?', [email]);
      if (existing) continue;
      const [created] = await c.query(
        'INSERT INTO usuarios(nome,email,senha_hash,perfil,objetivo,bio,demonstracao) VALUES(?,?,?,?,?,?,1)',
        [nome, email, hash, perfil, objetivo, bio]
      );
      if (perfil !== 'admin')
        await c.query(
          `INSERT INTO assinaturas(id,usuario_id,plano,subtotal_centavos,total_centavos,status,metodo,pago_em,valido_ate) VALUES(?,?,'anual',29900,29900,'pago','demo',NOW(),DATE_ADD(NOW(),INTERVAL 1 YEAR))`,
          [randomUUID(), created.insertId]
        );
    }
    const [users] = await c.query(
      "SELECT id,email,perfil FROM usuarios WHERE email IN ('aluno@fithtech.com','personal@fithtech.com')"
    );
    const student = users.find((u) => u.email === 'aluno@fithtech.com' && u.perfil === 'aluno'),
      trainer = users.find((u) => u.email === 'personal@fithtech.com' && u.perfil === 'personal');
    if (!student || !trainer) throw new Error('Contas existentes possuem perfis incompatíveis.');
    const [links] = await c.query('SELECT id FROM aluno_personal WHERE aluno_id=?', [student.id]);
    if (!links.length)
      await c.query('INSERT INTO aluno_personal(aluno_id,personal_id) VALUES(?,?)', [
        student.id,
        trainer.id,
      ]);
    const [old] = await c.query(
      'SELECT id FROM treinos WHERE aluno_id=? AND personal_id=? LIMIT 1',
      [student.id, trainer.id]
    );
    if (!old.length) {
      const templates = [
        {
          name: 'Treino A · força geral',
          days: [1, 3, 5],
          focus: 'Organização do treino de força · exemplo',
          exercises: [
            [
              'Supino reto',
              'Peito',
              3,
              '12',
              60,
              'Exemplo de orientação: movimento controlado e ajuste do banco com o professor.',
              15,
            ],
            [
              'Remada baixa',
              'Costas',
              3,
              '12',
              60,
              'Exemplo: mantenha o movimento confortável e siga a orientação do professor.',
              20,
            ],
            [
              'Agachamento',
              'Pernas',
              3,
              '10',
              90,
              'Exemplo: consulte a orientação do professor para a execução.',
              10,
            ],
          ],
        },
        {
          name: 'Treino B · estabilidade e condicionamento',
          days: [2, 4, 6],
          focus: 'Rotina complementar · exemplo',
          exercises: [
            [
              'Leg press',
              'Pernas',
              3,
              '12',
              90,
              'Exemplo: ajuste o equipamento com orientação antes de iniciar.',
              30,
            ],
            [
              'Prancha',
              'Abdômen',
              3,
              '30 segundos',
              45,
              'Exercício de exemplo sem carga adicional.',
              null,
            ],
            [
              'Caminhada',
              'Cardio',
              1,
              '15 minutos',
              0,
              'Atividade ilustrativa para demonstrar uma prescrição sem carga.',
              null,
            ],
          ],
        },
        {
          name: 'Treino C · mobilidade',
          days: [0],
          focus: 'Mobilidade e rotina leve · exemplo',
          exercises: [
            [
              'Mobilidade de ombros',
              'Ombros',
              2,
              '10 movimentos',
              30,
              'Exemplo ilustrativo: consulte a amplitude indicada pelo professor.',
              null,
            ],
            [
              'Caminhada leve',
              'Cardio',
              1,
              '10 minutos',
              0,
              'Atividade fictícia do plano demonstrativo.',
              null,
            ],
          ],
        },
      ];
      for (const template of presentation ? templates : templates.slice(0, 1)) {
        const [workout] = await c.query(
          'INSERT INTO treinos(aluno_id,personal_id,nome,foco,dias_semana,dias_treino) VALUES(?,?,?,?,?,?)',
          [
            student.id,
            trainer.id,
            template.name,
            template.focus,
            template.days.length,
            JSON.stringify(template.days),
          ]
        );
        const exercises = [];
        for (let i = 0; i < template.exercises.length; i++) {
          const [name, group, sets, reps, rest, notes, load] = template.exercises[i];
          const [exercise] = await c.query(
            'INSERT INTO exercicios(treino_id,nome,grupo_muscular,series,repeticoes,descanso_seg,observacoes,ordem) VALUES(?,?,?,?,?,?,?,?)',
            [workout.insertId, name, group, sets, reps, rest, notes, i + 1]
          );
          exercises.push({ id: exercise.insertId, name, load });
        }
        if (presentation)
          for (let ago = 21; ago >= 1; ago--) {
            const [[day]] = await c.query(
              "SELECT DATE_FORMAT(DATE_SUB(CURDATE(),INTERVAL ? DAY),'%Y-%m-%d') date,DAYOFWEEK(DATE_SUB(CURDATE(),INTERVAL ? DAY))-1 weekday",
              [ago, ago]
            );
            if (!template.days.includes(day.weekday)) continue;
            for (const exercise of exercises) {
              const load =
                exercise.load === null ? null : exercise.load + Math.floor((21 - ago) / 7) * 2.5;
              await c.query(
                "INSERT INTO progresso(aluno_id,exercicio_id,exercicio_nome,treino_nome,data_execucao,carga_kg,concluido_em) VALUES(?,?,?,?,?,?,TIMESTAMP(?,'18:00:00'))",
                [student.id, exercise.id, exercise.name, template.name, day.date, load, day.date]
              );
            }
          }
      }
    } else
      console.log(
        'Planos existentes preservados. Para uma demonstração completa com histórico fictício, use um banco de demonstração novo.'
      );
    await c.commit();
    console.log(
      'Demonstração pronta: aluno@fithtech.com, personal@fithtech.com e admin@fithtech.com. Senha das contas novas: DEMO_PASSWORD no .env. Nenhuma cobrança real.'
    );
  } catch (error) {
    await c.rollback();
    throw error;
  } finally {
    c.release();
  }
})()
  .catch((error) => {
    console.error('Erro na demonstração:', error.code || error.message);
    process.exitCode = 1;
  })
  .finally(() => db.end());
