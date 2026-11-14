const router = require('../lib/router')();
const db = require('../db');
const auth = require('../middleware/auth');
const v = require('../lib/validation');
const { plans, quote } = require('../lib/plans');
const { randomUUID } = require('crypto');
router.get('/plans', (req, res) =>
  res.json({ planos: plans, simulado: true, cupom_demo: 'PARCERIA10' })
);
router.get('/status', auth, async (req, res) => {
  const [[user]] = await db.query('SELECT acesso_legado FROM usuarios WHERE id=?', [req.user.id]);
  const [[active]] = await db.query(
    `SELECT * FROM assinaturas WHERE usuario_id=? AND status='pago' AND valido_ate>NOW() ORDER BY valido_ate DESC LIMIT 1`,
    [req.user.id]
  );
  const [history] = await db.query(
    `SELECT id,plano,cupom,total_centavos,status,metodo,pago_em,valido_ate FROM assinaturas WHERE usuario_id=? AND status='pago' ORDER BY pago_em DESC LIMIT 6`,
    [req.user.id]
  );
  res.json({
    ativo: req.user.role === 'admin' || !!user.acesso_legado || !!active,
    administrador: req.user.role === 'admin',
    acesso_legado: !!user.acesso_legado,
    assinatura: active || null,
    historico: history,
    planos: plans,
    simulado: true,
  });
});
router.post('/quote', auth, (req, res) => res.json(quote(req.body.plano, req.body.cupom)));
router.post('/checkout', auth, async (req, res) => {
  if (req.user.role === 'admin') v.fail('Administradores não precisam de assinatura.');
  const result = quote(req.body.plano, req.body.cupom),
    id = randomUUID();
  await db.query(
    `INSERT INTO assinaturas(id,usuario_id,plano,cupom,subtotal_centavos,desconto_centavos,total_centavos) VALUES(?,?,?,?,?,?,?)`,
    [
      id,
      req.user.id,
      result.plano,
      result.cupom,
      result.subtotal_centavos,
      result.desconto_centavos,
      result.total_centavos,
    ]
  );
  res.status(201).json({ id, ...result });
});
router.post('/checkout/:id/pay', auth, async (req, res) => {
  if (!/^[a-f0-9-]{36}$/i.test(req.params.id)) v.fail('Pedido inválido.');
  if (!['pix', 'cartao'].includes(req.body.metodo))
    v.fail('Selecione Pix de demonstração ou cartão de demonstração.');
  const c = await db.getConnection();
  try {
    await c.beginTransaction();
    await c.query('SELECT id FROM usuarios WHERE id=? FOR UPDATE', [req.user.id]);
    const [[order]] = await c.query(
      'SELECT * FROM assinaturas WHERE id=? AND usuario_id=? FOR UPDATE',
      [req.params.id, req.user.id]
    );
    if (!order) v.fail('Pedido não encontrado.', 404);
    if (order.status !== 'pago') {
      const [[remaining]] = await c.query(
        "SELECT GREATEST(COALESCE(MAX(valido_ate),NOW()),NOW()) inicio FROM assinaturas WHERE usuario_id=? AND status='pago'",
        [req.user.id]
      );
      const months = order.plano === 'anual' ? 12 : 1;
      await c.query(
        "UPDATE assinaturas SET status='pago',metodo=?,pago_em=NOW(),valido_ate=DATE_ADD(?,INTERVAL ? MONTH) WHERE id=?",
        [req.body.metodo, remaining.inicio, months, order.id]
      );
      await c.query('UPDATE usuarios SET acesso_legado=0 WHERE id=?', [req.user.id]);
    }
    const [[paid]] = await c.query(
      'SELECT id,plano,total_centavos,pago_em,valido_ate,metodo FROM assinaturas WHERE id=?',
      [order.id]
    );
    await c.commit();
    res.json({
      message: 'Pagamento simulado aprovado. Seu acesso está liberado.',
      simulado: true,
      assinatura: paid,
    });
  } catch (error) {
    await c.rollback();
    throw error;
  } finally {
    c.release();
  }
});
module.exports = router;
