const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const v = require('../lib/validation');
const valid = () => ({
  nome: 'Treino A',
  foco: 'Força geral',
  dias_semana: 3,
  exercicios: [
    { nome: 'Supino', series: 3, repeticoes: '12', video_url: 'https://example.com/video' },
  ],
});
test('nomes com apóstrofos são dados válidos', () =>
  assert.equal(v.text("João D'Ávila", 'Nome', 3), "João D'Ávila"));
test('valida e normaliza e-mail', () => {
  assert.equal(v.email('  ALUNO@EXAMPLE.COM '), 'aluno@example.com');
  for (const value of ['invalido', 'a b@c.com', {}, null]) assert.throws(() => v.email(value));
});
test('valida senha e limite real do bcrypt em UTF-8', () => {
  assert.equal(v.password('UmaSenha!123'), 'UmaSenha!123');
  for (const value of ['123456', 'a'.repeat(73), 'á'.repeat(37), {}])
    assert.throws(() => v.password(value));
});
test('dias e séries devem ser inteiros dentro dos limites', () => {
  for (const value of [-1, 0, 8, 2.5, {}, true, '']) {
    const w = valid();
    w.dias_semana = value;
    assert.throws(() => v.workout(w));
  }
  for (const value of [-1, 0, 51, 1.2]) {
    const w = valid();
    w.exercicios[0].series = value;
    assert.throws(() => v.workout(w));
  }
  assert.equal(v.workout(valid()).dias_semana, 3);
});
test('recusa protocolos executáveis e URLs com credenciais', () => {
  for (const value of [
    'javascript:alert(1)',
    'data:text/html,test',
    'https://user:pass@example.com',
    '/video',
    'ftp://example.com',
  ]) {
    const w = valid();
    w.exercicios[0].video_url = value;
    assert.throws(() => v.workout(w));
  }
});
test('recusa listas vazias, exercícios incompletos e IDs duplicados', () => {
  for (const exercises of [
    [],
    null,
    'abc',
    [{}],
    [{ nome: '' }],
    [
      { id: 1, nome: 'Supino' },
      { id: 1, nome: 'Remada' },
    ],
  ]) {
    const w = valid();
    w.exercicios = exercises;
    assert.throws(() => v.workout(w));
  }
});
test('HTML dinâmico não usa manipuladores de evento inline nem eval', () => {
  const source = fs.readFileSync(path.join(__dirname, '../public/app.js'), 'utf8');
  assert.doesNotMatch(source, /\bon(?:click|error|load)\s*=\s*["']/i);
  assert.doesNotMatch(source, /\beval\s*\(|new Function\s*\(/);
});
const { validateDays, readDays } = require('../lib/schedule');
const { quote, plans } = require('../lib/plans');
test('agenda aceita apenas dias únicos entre domingo e sábado', () => {
  assert.deepEqual(validateDays([5, 1, 3]), [1, 3, 5]);
  assert.deepEqual(readDays(null), []);
  for (const days of [[1, 1], [-1], [7], [true], '[1]']) assert.throws(() => validateDays(days));
});
test('carga opcional preserva zero e valida casas decimais', () => {
  assert.equal(v.load(''), null);
  assert.equal(v.load(0), 0);
  assert.equal(v.load('22,5'), 22.5);
  for (const value of [-1, 2001, NaN, Infinity, true, '2.555', 'abc'])
    assert.throws(() => v.load(value));
});
test('preços e cupom são calculados no servidor em centavos', () => {
  assert.equal(quote('mensal').total_centavos, 2990);
  assert.equal(quote('anual').total_centavos, 29900);
  assert.equal(quote('mensal', ' parceria10 ').total_centavos, 2691);
  assert.equal(quote('anual', 'PARCERIA10').total_centavos, 26910);
  assert.equal(plans.find((p) => p.id === 'anual').economia_centavos, 5980);
  assert.throws(() => quote('gratis'));
  assert.throws(() => quote('anual', 'INVALIDO'));
});
