function fail(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  throw error;
}
function text(value, label, min = 0, max = 120) {
  if (typeof value !== 'string') fail(`${label} inválido.`);
  const result = value.trim();
  if (result.length < min || result.length > max)
    fail(`${label}: informe de ${min} a ${max} caracteres.`);
  return result;
}
function integer(value, label, min = 1, max = 2147483647) {
  if (!['number', 'string'].includes(typeof value) || String(value).trim() === '')
    fail(`${label} inválido.`);
  const result = Number(value);
  if (!Number.isSafeInteger(result) || result < min || result > max)
    fail(`${label}: informe um inteiro entre ${min} e ${max}.`);
  return result;
}
function password(value) {
  if (typeof value !== 'string' || value.length < 8 || Buffer.byteLength(value, 'utf8') > 72)
    fail('A senha deve ter pelo menos 8 caracteres e no máximo 72 bytes.');
  return value;
}
function email(value) {
  const result = text(value, 'E-mail', 3, 160).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(result)) fail('Informe um e-mail válido.');
  return result;
}
function videoURL(value) {
  const result = text(value ?? '', 'URL do vídeo', 0, 500);
  if (!result) return '';
  let url;
  try {
    url = new URL(result);
  } catch {
    fail('Informe uma URL válida para o vídeo.');
  }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password)
    fail('O vídeo deve usar HTTP ou HTTPS sem credenciais.');
  return url.href;
}
function workout(body) {
  if (!Array.isArray(body.exercicios) || body.exercicios.length < 1 || body.exercicios.length > 100)
    fail('Informe de 1 a 100 exercícios.');
  const ids = new Set();
  return {
    nome: text(body.nome, 'Nome do treino', 3, 120),
    foco: text(body.foco, 'Objetivo', 3, 180),
    dias_semana: integer(body.dias_semana ?? 3, 'Dias por semana', 1, 7),
    exercicios: body.exercicios.map((e) => {
      if (!e || typeof e !== 'object') fail('Exercício inválido.');
      const id = e.id === undefined || e.id === '' ? null : integer(e.id, 'Exercício');
      if (id && ids.has(id)) fail('O mesmo exercício foi enviado duas vezes.');
      if (id) ids.add(id);
      return {
        id,
        nome: text(e.nome, 'Nome do exercício', 2, 120),
        grupo_muscular: text(e.grupo_muscular ?? '', 'Grupo muscular', 0, 80),
        series: integer(e.series ?? 3, 'Séries', 1, 50),
        repeticoes: text(e.repeticoes ?? '12', 'Repetições', 1, 30),
        video_url: videoURL(e.video_url),
        descanso_seg: integer(e.descanso_seg ?? 60, 'Descanso em segundos', 0, 600),
        observacoes: text(e.observacoes ?? '', 'Orientações', 0, 500),
      };
    }),
  };
}
function load(value) {
  if (value === undefined || value === null || value === '') return null;
  if (
    !['string', 'number'].includes(typeof value) ||
    !/^\d+(?:[.,]\d{1,2})?$/.test(String(value).trim())
  )
    fail('Informe uma carga válida em kg, com até duas casas decimais.');
  const number = Number(String(value).replace(',', '.'));
  if (!Number.isFinite(number) || number < 0 || number > 2000)
    fail('A carga deve estar entre 0 e 2000 kg.');
  return number;
}
module.exports = { fail, text, integer, password, email, workout, load };
