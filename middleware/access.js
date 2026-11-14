const db = require('../db');
module.exports = async function access(req, res, next) {
  if (req.user.role === 'admin') return next();
  const [[row]] = await db.query(
    `SELECT u.acesso_legado OR EXISTS(SELECT 1 FROM assinaturas a WHERE a.usuario_id=u.id AND a.status='pago' AND a.valido_ate>NOW()) ativo FROM usuarios u WHERE u.id=?`,
    [req.user.id]
  );
  if (!row?.ativo)
    return res.status(402).json({
      code: 'PAYMENT_REQUIRED',
      message: 'Escolha um plano e conclua o pagamento simulado para liberar o painel.',
    });
  next();
};
