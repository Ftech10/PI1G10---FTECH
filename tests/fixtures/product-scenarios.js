const assert = require('node:assert/strict');
module.exports = async function productScenarios(
  t,
  { request, db, student, trainer, w, e, password }
) {
  await t.test('agenda distingue treino previsto, outro dia e sem dias definidos', async () => {
    const [[clock]] = await db.query('SELECT DAYOFWEEK(CURDATE())-1 dia');
    await db.query('UPDATE treinos SET dias_treino=? WHERE id=?', [
      JSON.stringify([(clock.dia + 1) % 7]),
      w.id,
    ]);
    let stats = (await request('/stats/dashboard', student.token)).data;
    assert.equal(stats.treinos_hoje, 0);
    assert.equal(stats.exercicios_hoje, 0);
    assert.equal((await request('/workouts/' + w.id, student.token)).data.agendado_hoje, false);
    await db.query('UPDATE treinos SET dias_treino=NULL WHERE id=?', [w.id]);
    assert.equal((await request('/stats/dashboard', student.token)).data.sem_agenda, 1);
    assert.equal(
      (await request('/workouts/' + w.id, trainer.token, 'PUT', { ...w, dias_treino: [1, 1] }))
        .status,
      400
    );
    await db.query('UPDATE treinos SET dias_treino=? WHERE id=?', [
      JSON.stringify([clock.dia]),
      w.id,
    ]);
  });
  await t.test('registra carga sem duplicar e preserva histórico do dia anterior', async () => {
    assert.equal(
      (
        await request('/progress/complete', student.token, 'POST', {
          exercicio_id: e.id,
          carga_kg: '22,5',
        })
      ).status,
      200
    );
    const detail = (await request('/workouts/' + w.id, student.token)).data;
    assert.equal(Number(detail.exercicios[0].carga_hoje), 22.5);
    assert.equal(detail.exercicios[0].descanso_seg, 60);
    assert.ok(detail.exercicios[0].observacoes.length > 0);
    assert.equal(
      (
        await request('/progress/complete', student.token, 'POST', {
          exercicio_id: e.id,
          carga_kg: -2,
        })
      ).status,
      400
    );
    await request('/progress/complete', student.token, 'POST', { exercicio_id: e.id });
    assert.equal(
      Number((await request('/workouts/' + w.id, student.token)).data.exercicios[0].carga_hoje),
      22.5
    );
    await request('/progress/complete/' + e.id, student.token, 'DELETE');
    assert.equal((await request('/progress/mine', student.token)).data.length, 1);
  });
  await t.test('pagamento simulado: preços, cupom, isolamento, idempotência e acesso', async () => {
    const r = await request('/auth/register', null, 'POST', {
      nome: 'Nova conta de teste',
      email: 'checkout@example.com',
      password,
      perfil: 'aluno',
    });
    assert.equal(r.status, 201);
    const user = r.data;
    assert.equal((await request('/stats/dashboard', user.token)).status, 402);
    assert.equal((await request('/workouts/mine', user.token)).status, 402);
    assert.equal((await request('/billing/status', user.token)).data.ativo, false);
    assert.equal((await request('/users/me', user.token)).status, 200);
    assert.equal(
      (await request('/billing/quote', user.token, 'POST', { plano: 'anual', cupom: 'INVALIDO' }))
        .status,
      400
    );
    const order = await request('/billing/checkout', user.token, 'POST', {
      plano: 'anual',
      cupom: 'PARCERIA10',
      total_centavos: 1,
    });
    assert.equal(order.status, 201);
    assert.equal(order.data.total_centavos, 26910);
    assert.equal((await request('/stats/dashboard', user.token)).status, 402);
    assert.equal(
      (
        await request('/billing/checkout/' + order.data.id + '/pay', trainer.token, 'POST', {
          metodo: 'pix',
        })
      ).status,
      404
    );
    assert.equal(
      (
        await request('/billing/checkout/' + order.data.id + '/pay', user.token, 'POST', {
          metodo: 'dinheiro',
        })
      ).status,
      400
    );
    const paid = await request('/billing/checkout/' + order.data.id + '/pay', user.token, 'POST', {
      metodo: 'pix',
    });
    assert.equal(paid.status, 200);
    assert.equal(paid.data.simulado, true);
    const repeated = await request(
      '/billing/checkout/' + order.data.id + '/pay',
      user.token,
      'POST',
      { metodo: 'cartao' }
    );
    assert.equal(repeated.data.assinatura.valido_ate, paid.data.assinatura.valido_ate);
    assert.equal(repeated.data.assinatura.metodo, 'pix');
    assert.equal((await request('/stats/dashboard', user.token)).status, 200);
    assert.equal((await request('/billing/status', user.token)).data.ativo, true);
    const onboard = (await request('/stats/dashboard', user.token)).data;
    assert.equal(onboard.professor, null);
    assert.equal(onboard.treinos, 0);
    await request('/users/me', user.token, 'PUT', {
      nome: 'Nova conta de teste',
      bio: '',
      telefone: '',
      objetivo: 'Treinar três vezes por semana',
    });
    assert.equal(
      (await request('/stats/dashboard', user.token)).data.objetivo,
      'Treinar três vezes por semana'
    );
    await db.query(
      'UPDATE assinaturas SET valido_ate=DATE_SUB(NOW(),INTERVAL 1 DAY) WHERE usuario_id=?',
      [user.user.id]
    );
    assert.equal((await request('/stats/dashboard', user.token)).status, 402);
    const renewal = await request('/billing/checkout', user.token, 'POST', { plano: 'mensal' });
    assert.equal(renewal.data.total_centavos, 2990);
    assert.equal(
      (
        await request('/billing/checkout/' + renewal.data.id + '/pay', user.token, 'POST', {
          metodo: 'cartao',
        })
      ).status,
      200
    );
    assert.equal((await request('/stats/dashboard', user.token)).status, 200);
  });
};
