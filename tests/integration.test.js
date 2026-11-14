const { test } = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
require('dotenv').config();
const mysql = require('mysql2/promise');
const database = 'ftech_test_' + Date.now();
const legacyDatabase = database + '_legacy';
const password = 'TestOnly!42';
process.env.DB_NAME = database;
process.env.JWT_SECRET = crypto.randomBytes(48).toString('hex');
process.env.DEMO_PASSWORD = password;
process.env.NODE_ENV = 'test';
function script(name, env = {}) {
  execFileSync(process.execPath, [path.join(__dirname, '../scripts', name)], {
    env: { ...process.env, ...env },
    stdio: 'pipe',
    timeout: 30000,
  });
}
test('integração com banco isolado (MySQL 8+ / MariaDB 10.6+)', async (t) => {
  const root = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    multipleStatements: true,
  });
  let server, db;
  try {
    script('init-db.js');
    script('migrate.js');
    script('migrate.js');
    script('seed-demo.js');
    db = require('../db');
    const { app } = require('../server');
    server = await new Promise((resolve) => {
      const s = app.listen(0, '127.0.0.1', () => resolve(s));
    });
    const base = 'http://127.0.0.1:' + server.address().port;
    async function request(route, token, method = 'GET', body) {
      const response = await fetch(base + '/api' + route, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: 'Bearer ' + token } : {}),
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
      return { status: response.status, data: await response.json(), headers: response.headers };
    }
    async function login(email, pass = password) {
      const r = await request('/auth/login', null, 'POST', { email, password: pass });
      assert.equal(r.status, 200, JSON.stringify(r.data));
      return r.data;
    }
    const admin = await login('admin@fithtech.com');
    let student = await login('aluno@fithtech.com');
    const trainer = await login('personal@fithtech.com');
    let w, e;
    await t.test('rotas protegidas, 404 JSON, JSON inválido e cabeçalhos', async () => {
      assert.equal((await request('/users/me')).status, 401);
      assert.equal((await request('/users', student.token)).status, 403);
      assert.equal((await request('/inexistente')).status, 404);
      const health = await request('/health');
      assert.match(health.headers.get('content-security-policy'), /script-src-attr 'none'/);
      assert.equal(health.headers.get('cache-control'), 'no-store');
      const bad = await fetch(base + '/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{',
      });
      assert.equal(bad.status, 400);
      assert.equal((await bad.json()).message, 'JSON inválido.');
    });
    await t.test('porta ocupada retorna falha de inicialização controlada', async () => {
      const originalPort = process.env.PORT;
      process.env.PORT = String(server.address().port);
      try {
        await assert.rejects(require('../server').start(), { code: 'EADDRINUSE' });
      } finally {
        if (originalPort === undefined) delete process.env.PORT;
        else process.env.PORT = originalPort;
      }
    });
    await t.test('nomes com apóstrofo e validações no servidor', async () => {
      assert.equal(
        (
          await request('/users/me', student.token, 'PUT', {
            nome: "Lucas D'Ávila",
            telefone: '',
            bio: '',
          })
        ).status,
        200
      );
      assert.equal(
        (
          await request('/auth/register', null, 'POST', {
            nome: 'Novo aluno',
            email: 'invalido',
            password,
            perfil: 'aluno',
          })
        ).status,
        400
      );
      assert.equal(
        (
          await request('/users', admin.token, 'POST', {
            nome: 'Novo',
            email: 'novo@example.com',
            perfil: 'aluno',
          })
        ).status,
        400
      );
      const body = {
        aluno_id: student.user.id,
        nome: 'Teste de treino',
        foco: 'Força',
        dias_semana: 9,
        exercicios: [{ nome: 'Supino' }],
      };
      assert.equal((await request('/workouts', trainer.token, 'POST', body)).status, 400);
      body.dias_semana = 3;
      body.exercicios[0].video_url = 'javascript:alert(1)';
      assert.equal((await request('/workouts', trainer.token, 'POST', body)).status, 400);
      body.exercicios = [{}];
      assert.equal((await request('/workouts', trainer.token, 'POST', body)).status, 400);
    });
    await t.test(
      'conclusão concorrente é idempotente e progresso considera somente hoje',
      async () => {
        const r = await request('/workouts/mine', student.token);
        w = r.data[0];
        const [[clock]] = await db.query('SELECT DAYOFWEEK(CURDATE())-1 dia');
        w.dias_treino = [clock.dia];
        await db.query('UPDATE treinos SET dias_treino=? WHERE id=?', [
          JSON.stringify(w.dias_treino),
          w.id,
        ]);
        e = w.exercicios[0];
        assert.equal(w.exercicios.length, 3);
        const results = await Promise.all(
          Array.from({ length: 10 }, () =>
            request('/progress/complete', student.token, 'POST', { exercicio_id: e.id })
          )
        );
        assert.ok(
          results.every((r) => r.status === 200),
          JSON.stringify(results)
        );
        const [[count]] = await db.query(
          'SELECT COUNT(*) total FROM progresso WHERE aluno_id=? AND exercicio_id=?',
          [student.user.id, e.id]
        );
        assert.equal(count.total, 1);
        await db.query(
          'UPDATE progresso SET data_execucao=DATE_SUB(CURDATE(),INTERVAL 1 DAY),concluido_em=DATE_SUB(NOW(),INTERVAL 1 DAY) WHERE aluno_id=?',
          [student.user.id]
        );
        assert.equal((await request('/stats/dashboard', student.token)).data.percentual, 0);
        assert.equal(
          (await request('/progress/complete', student.token, 'POST', { exercicio_id: e.id }))
            .status,
          200
        );
        const stats = (await request('/stats/dashboard', student.token)).data;
        assert.equal(stats.historico_total, 2);
        assert.equal(stats.concluidos, 1);
        assert.equal(stats.percentual, 33);
        await request('/progress/complete/' + e.id, student.token, 'DELETE');
        assert.equal((await request('/progress/mine', student.token)).data.length, 1);
      }
    );
    await require('./fixtures/product-scenarios')(t, {
      request,
      db,
      student,
      trainer,
      w,
      e,
      password,
    });
    await t.test('edição mantém referências e histórico; remoção preserva snapshot', async () => {
      const body = { ...w, exercicios: w.exercicios.map((x) => ({ ...x })) };
      body.exercicios[0].nome = 'Supino editado';
      assert.equal((await request('/workouts/' + w.id, trainer.token, 'PUT', body)).status, 200);
      let history = (await request('/progress/mine', student.token)).data;
      assert.equal(history[0].exercicio, 'Supino reto');
      body.exercicios = body.exercicios.slice(1);
      assert.equal((await request('/workouts/' + w.id, trainer.token, 'PUT', body)).status, 200);
      history = (await request('/progress/mine', student.token)).data;
      assert.equal(history[0].exercicio_id, null);
      assert.equal(history[0].exercicio, 'Supino reto');
    });
    await t.test(
      'vínculo inválido não remove o vínculo existente; perfis são conferidos',
      async () => {
        assert.equal(
          (
            await request('/relationships', admin.token, 'POST', {
              aluno_id: student.user.id,
              personal_id: 2147483647,
            })
          ).status,
          400
        );
        assert.equal(
          (await request('/relationships/trainer', student.token)).data.id,
          trainer.user.id
        );
        assert.equal(
          (
            await request('/relationships', admin.token, 'POST', {
              aluno_id: trainer.user.id,
              personal_id: student.user.id,
            })
          ).status,
          400
        );
      }
    );
    await t.test(
      'professor desvinculado perde listagem e permissão de alterar treino',
      async () => {
        const relationships = (await request('/relationships/all', admin.token)).data;
        const link = relationships.find((r) => r.aluno_id === student.user.id && r.ativo);
        await request('/relationships/' + link.id, admin.token, 'DELETE');
        assert.deepEqual((await request('/workouts/mine', trainer.token)).data, []);
        assert.equal((await request('/workouts/' + w.id, trainer.token)).status, 404);
        assert.equal((await request('/workouts/' + w.id, trainer.token, 'DELETE')).status, 404);
        assert.equal(
          (await request('/workouts/' + w.id, trainer.token, 'PUT', { ...w })).status,
          404
        );
        await request('/relationships', admin.token, 'POST', {
          aluno_id: student.user.id,
          personal_id: trainer.user.id,
        });
        assert.equal((await request('/workouts/' + w.id, trainer.token, 'DELETE')).status, 200);
        assert.equal((await request('/workouts/' + w.id, student.token)).status, 404);
        assert.equal((await request('/stats/dashboard', student.token)).data.percentual, 0);
      }
    );
    await t.test('desativação invalida token; reativação exige novo login', async () => {
      await request('/users/' + student.user.id + '/status', admin.token, 'PATCH', {
        ativo: false,
      });
      assert.equal((await request('/users/me', student.token)).status, 401);
      await request('/users/' + student.user.id + '/status', admin.token, 'PATCH', { ativo: true });
      assert.equal((await request('/users/me', student.token)).status, 401);
      student = await login('aluno@fithtech.com');
      assert.equal((await request('/users/me', student.token)).status, 200);
      assert.equal(
        (
          await request('/users/' + admin.user.id + '/status', admin.token, 'PATCH', {
            ativo: false,
          })
        ).status,
        400
      );
    });
    await t.test('troca de senha encerra sessões e seed repetido não redefine senha', async () => {
      const nextPassword = 'NovaSenha!123';
      assert.equal(
        (
          await request('/auth/password', student.token, 'PUT', {
            currentPassword: password,
            newPassword: nextPassword,
          })
        ).status,
        200
      );
      assert.equal((await request('/users/me', student.token)).status, 401);
      script('seed-demo.js');
      student = await login('aluno@fithtech.com', nextPassword);
      assert.equal((await request('/users/me', student.token)).data.nome, "Lucas D'Ávila");
    });
    await t.test('falhas assíncronas retornam JSON 500 sem encerrar servidor', async () => {
      const original = db.query;
      db.query = async () => {
        throw Object.assign(new Error('database detail must stay private'), {
          code: 'TEST_DB_FAILURE',
        });
      };
      try {
        const r = await request('/users/me', admin.token);
        assert.equal(r.status, 500);
        assert.doesNotMatch(r.data.message, /database detail/);
      } finally {
        db.query = original;
      }
      assert.equal((await request('/users/me', admin.token)).status, 200);
    });
    await t.test(
      'migração legado repetível preserva registros duplicados como histórico',
      async () => {
        const schema = fs
          .readFileSync(path.join(__dirname, 'fixtures/legacy.sql'), 'utf8')
          .replaceAll('fithtech', legacyDatabase);
        await root.query(schema);
        await root.query(
          "INSERT INTO usuarios(nome,email,senha_hash,perfil) VALUES ('Aluno','a@example.com','hash','aluno'),('Professor','p@example.com','hash','personal')"
        );
        await root.query(
          "INSERT INTO treinos(aluno_id,personal_id,nome,foco) VALUES(1,2,'Treino','Força')"
        );
        await root.query("INSERT INTO exercicios(treino_id,nome) VALUES(1,'Supino')");
        await root.query('INSERT INTO progresso(aluno_id,exercicio_id) VALUES(1,1),(1,1)');
        script('migrate.js', { DB_NAME: legacyDatabase });
        script('migrate.js', { DB_NAME: legacyDatabase });
        const [[legacyUser]] = await root.query('SELECT acesso_legado FROM usuarios WHERE id=1');
        assert.equal(legacyUser.acesso_legado, 1);
        const [rows] = await root.query('SELECT * FROM progresso');
        assert.equal(rows.length, 2);
        assert.ok(rows.every((r) => r.exercicio_nome === 'Supino' && r.data_execucao));
        assert.equal(rows.filter((r) => r.exercicio_id === 1).length, 1);
      }
    );
  } finally {
    if (server) await new Promise((resolve) => server.close(resolve));
    if (db) await db.end();
    await root.query('DROP DATABASE IF EXISTS `' + database + '`');
    await root.query('DROP DATABASE IF EXISTS `' + legacyDatabase + '`');
    await root.end();
  }
});
