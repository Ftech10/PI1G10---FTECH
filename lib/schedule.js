const { fail, integer } = require('./validation');
function validateDays(value) {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value) || value.length > 7) fail('Selecione até sete dias da semana.');
  const days = value.map((day) => integer(day, 'Dia da semana', 0, 6));
  if (new Set(days).size !== days.length) fail('Os dias da semana não podem se repetir.');
  return days.sort((a, b) => a - b);
}
function readDays(value) {
  if (Array.isArray(value)) return value;
  try {
    return validateDays(JSON.parse(value || '[]'));
  } catch {
    return [];
  }
}
function presentWorkout(workout, today) {
  const days = readDays(workout.dias_treino);
  return { ...workout, dias_treino: days, agendado_hoje: days.includes(today) };
}
module.exports = { validateDays, readDays, presentWorkout };
