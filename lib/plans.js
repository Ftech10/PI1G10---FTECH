const { fail } = require('./validation');
const monthly = 2990;
const annual = 29900;
const plans = [
  {
    id: 'mensal',
    nome: 'Mensal',
    meses: 1,
    preco_centavos: monthly,
    referencia_centavos: monthly,
    desconto_anual: 0,
  },
  {
    id: 'anual',
    nome: 'Anual',
    meses: 12,
    preco_centavos: annual,
    referencia_centavos: monthly * 12,
    desconto_anual: 16.67,
    economia_centavos: monthly * 12 - annual,
  },
];
function quote(planId, coupon = '') {
  const plan = plans.find((p) => p.id === planId);
  if (!plan) fail('Selecione o plano mensal ou anual.');
  if (typeof coupon !== 'string' || coupon.length > 40) fail('Cupom inválido.');
  const code = coupon.trim().toUpperCase();
  if (code && code !== 'PARCERIA10')
    fail('Cupom não encontrado. Para a demonstração, use PARCERIA10.');
  const total = code ? Math.round(plan.preco_centavos * 0.9) : plan.preco_centavos;
  return {
    plano: plan.id,
    nome: plan.nome,
    meses: plan.meses,
    subtotal_centavos: plan.preco_centavos,
    desconto_centavos: plan.preco_centavos - total,
    total_centavos: total,
    cupom: code || null,
    desconto_anual: plan.desconto_anual,
    economia_centavos: plan.economia_centavos || 0,
    simulado: true,
  };
}
module.exports = { plans, quote };
