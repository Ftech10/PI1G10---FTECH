const weekdays = [
  { id: 1, short: 'Seg', name: 'Segunda-feira' },
  { id: 2, short: 'Ter', name: 'Terça-feira' },
  { id: 3, short: 'Qua', name: 'Quarta-feira' },
  { id: 4, short: 'Qui', name: 'Quinta-feira' },
  { id: 5, short: 'Sex', name: 'Sexta-feira' },
  { id: 6, short: 'Sáb', name: 'Sábado' },
  { id: 0, short: 'Dom', name: 'Domingo' },
];
function kg(value) {
  return Number(value).toLocaleString('pt-BR', { maximumFractionDigits: 2 }) + ' kg';
}
function shortDate(value) {
  return new Date(value.slice(0, 10) + 'T12:00:00').toLocaleDateString('pt-BR');
}
function scheduleLabel(workout) {
  return workout.dias_treino?.length
    ? weekdays
        .filter((d) => workout.dias_treino.includes(d.id))
        .map((d) => d.short)
        .join(' · ')
    : 'Dias a combinar com o professor';
}
function demoBanner(enabled) {
  return enabled
    ? '<div class="demo-banner" role="note">Demonstração do FTECH · perfis e registros fictícios para apresentar o funcionamento.</div>'
    : '';
}
function emptyState(title, text, action = '') {
  return `<section class="panel empty-state"><span class="empty-symbol" aria-hidden="true">◇</span><h2>${esc(title)}</h2><p>${esc(text)}</p>${action}</section>`;
}
function weekView(workouts, today, selected = today) {
  return `<div class="week-strip" aria-label="Agenda semanal">${weekdays
    .map((d) => {
      const count = workouts.filter((w) => w.dias_treino?.includes(d.id)).length;
      return `<button class="week-day ${selected === d.id ? 'selected' : ''} ${today === d.id ? 'today' : ''}" data-action="open-day" data-day="${d.id}" aria-pressed="${selected === d.id}" aria-label="${d.name}: ${count} treino(s)"><span>${d.short}</span><b>${count ? String(count).padStart(2, '0') : '—'}</b><small>${today === d.id ? 'Hoje' : count ? 'treino' : 'livre'}</small></button>`;
    })
    .join('')}</div>`;
}
function onboarding(s) {
  const steps = [
    {
      done: !!s.objetivo,
      title: 'Conte seu objetivo',
      text: 'Ajude seu professor a entender o que você busca.',
      action:
        '<button class="btn ghost small" data-action="navigate" data-page="perfil">Editar meu perfil</button>',
    },
    {
      done: !!s.professor,
      title: 'Conecte-se ao professor',
      text: s.professor
        ? `Você está vinculado a ${s.professor.nome}.`
        : 'Informe seu e-mail de cadastro ao administrador da academia ou do projeto. Ele fará o vínculo.',
      action: '',
    },
    {
      done: s.treinos > 0,
      title: 'Receba seu primeiro treino',
      text: s.treinos
        ? 'Seu plano está disponível. Confira os dias e as orientações.'
        : 'Após o vínculo, seu professor poderá criar e organizar seu plano.',
      action: s.treinos
        ? '<button class="btn ghost small" data-action="navigate" data-page="treinos">Ver meu plano</button>'
        : '',
    },
  ];
  if (steps.every((step) => step.done)) return '';
  return `<section class="panel onboarding"><div class="section-title"><div><span class="eyebrow">SEUS PRIMEIROS PASSOS</span><h2>Uma rotina começa com um plano.</h2></div><span class="pill">${steps.filter((step) => step.done).length} de 3 etapas</span></div><ol class="onboarding-steps">${steps.map((step, index) => `<li class="${step.done ? 'done' : ''}"><span class="step-number">${step.done ? '✓' : index + 1}</span><div><h3>${esc(step.title)}</h3><p>${esc(step.text)}</p>${!step.done || index === 2 ? step.action : ''}</div></li>`).join('')}</ol></section>`;
}
function workoutCard(w, today = false) {
  return `<article class="panel workout ${today ? 'scheduled' : ''}"><div class="workout-head"><div><span class="eyebrow">${today ? 'NA SUA AGENDA DE HOJE' : esc(w.personal_nome || 'SEU PLANO')}</span><h2>${esc(w.nome)}</h2><p>${esc(w.foco)}</p><div class="chips"><span>${esc(scheduleLabel(w))}</span><span>${w.exercicios.length} exercícios</span></div></div><button class="btn primary" data-action="open-workout" data-id="${w.id}">Abrir treino</button></div></article>`;
}
function historyRows(records, limit = 10) {
  return (
    records
      .slice(0, limit)
      .map(
        (x) =>
          `<div><i></i><span><b>${esc(x.exercicio || 'Exercício removido')}</b><small>${esc(x.treino || 'Treino')} · ${shortDate(x.data_execucao)}${x.carga_kg !== null ? ' · ' + kg(x.carga_kg) : ''}</small></span></div>`
      )
      .join('') || '<p class="muted">As conclusões aparecerão aqui depois do primeiro treino.</p>'
  );
}
function loadHistory(records) {
  const loaded = records.filter((x) => x.carga_kg !== null && Number.isFinite(Number(x.carga_kg)));
  const groups = new Map();
  for (const item of loaded) {
    const key =
      item.exercicio_id !== null
        ? 'id:' + item.exercicio_id
        : 'snapshot:' + item.treino + ':' + item.exercicio;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(item);
  }
  const root = document.createElement('section');
  root.className = 'panel load-history';
  root.innerHTML = `<div class="section-title"><div><span class="eyebrow">SEUS REGISTROS</span><h2>Cargas por exercício</h2><p>Compare o que você registrou ao longo do tempo. A carga é opcional e não mede, sozinha, seu desempenho.</p></div></div>`;
  if (!groups.size) {
    root.insertAdjacentHTML(
      'beforeend',
      '<p class="empty-copy">Ao concluir um exercício, informe a carga usada para começar seu histórico. Exercícios sem carga também podem ser registrados.</p>'
    );
    return root;
  }
  const entries = [...groups.values()];
  root.insertAdjacentHTML(
    'beforeend',
    `<label class="load-filter">Exercício<select aria-label="Exercício para consultar cargas">${entries.map((items, i) => `<option value="${i}">${esc(items[0].exercicio)} — ${esc(items[0].treino)}</option>`).join('')}</select></label><div class="load-result"></div>`
  );
  const draw = () => {
    const points = [...entries[Number(root.querySelector('select').value)]]
      .sort((a, b) => a.data_execucao.localeCompare(b.data_execucao) || a.id - b.id)
      .slice(-12);
    const first = Number(points[0].carga_kg),
      last = Number(points.at(-1).carga_kg),
      max = Math.max(...points.map((x) => Number(x.carga_kg)));
    const min = Math.min(...points.map((x) => Number(x.carga_kg)));
    const range = max - min || 1;
    const line = points
      .map(
        (x, i) =>
          `${points.length > 1 ? 20 + (i / (points.length - 1)) * 560 : 300},${130 - ((Number(x.carga_kg) - min) / range) * 100}`
      )
      .join(' ');
    root.querySelector('.load-result').innerHTML =
      `<div class="load-summary"><span>Primeiro registro exibido<b>${kg(first)}</b></span><span>Último registro<b>${kg(last)}</b></span><span>Maior carga exibida<b>${kg(max)}</b></span></div><svg viewBox="0 0 600 160" role="img" aria-label="Cargas registradas em ordem cronológica"><path d="M20 140H580" stroke="#2a3546"/><polyline points="${line}" fill="none" stroke="#74a5ff" stroke-width="3"/>${line
        .split(' ')
        .map((pair) => {
          const [x, y] = pair.split(',');
          return `<circle cx="${x}" cy="${y}" r="5" fill="#8adfff"/>`;
        })
        .join(
          ''
        )}</svg><div class="load-table" role="list">${points.map((x) => `<div role="listitem"><span>${shortDate(x.data_execucao)}</span><strong>${kg(x.carga_kg)}</strong></div>`).join('')}</div>`;
  };
  root.querySelector('select').addEventListener('change', draw);
  draw();
  return root;
}
let restInterval = null;
let restStatus = null;
function stopRest(clearMessage = true) {
  clearInterval(restInterval);
  restInterval = null;
  if (clearMessage && restStatus?.isConnected) restStatus.textContent = '';
  restStatus = null;
}
function startRest(seconds, button) {
  stopRest();
  const root = button.closest('.exercise-prescription');
  const status = root.querySelector('.rest-status');
  restStatus = status;
  const deadline = Date.now() + seconds * 1000;
  const update = () => {
    if (!root.isConnected) {
      stopRest();
      return;
    }
    const remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
    status.textContent = remaining
      ? `Descanso: ${String(Math.floor(remaining / 60)).padStart(2, '0')}:${String(remaining % 60).padStart(2, '0')}`
      : 'Tempo de descanso concluído.';
    if (!remaining) stopRest(false);
  };
  update();
  restInterval = setInterval(update, 250);
}
