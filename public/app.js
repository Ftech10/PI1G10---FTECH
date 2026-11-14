let currentPage = 'inicio';
let selectedWorkoutDay = null;
let workoutUpdated = false;
const $ = (id) => document.getElementById(id);
const API = '/api',
  app = document.querySelector('#app'),
  modalRoot = document.querySelector('#modal-root');
const labels = { aluno: 'Aluno', personal: 'Professor de Educação Física', admin: 'Administrador' };
const groups = [
  'Peito',
  'Costas',
  'Pernas',
  'Ombros',
  'Bíceps',
  'Tríceps',
  'Abdômen',
  'Glúteos',
  'Cardio',
  'Corpo inteiro',
  'Outro',
];
function session() {
  try {
    const u = JSON.parse(localStorage.getItem('fithtech_session') || 'null');
    return u &&
      typeof u.name === 'string' &&
      typeof u.email === 'string' &&
      ['aluno', 'personal', 'admin'].includes(u.role)
      ? u
      : null;
  } catch {
    return null;
  }
}
async function api(path, opt = {}) {
  const h = { 'Content-Type': 'application/json', ...(opt.headers || {}) },
    t = localStorage.getItem('fithtech_token');
  if (t) h.Authorization = `Bearer ${t}`;
  const r = await fetch(API + path, { signal: AbortSignal.timeout(15000), ...opt, headers: h });
  let d = {};
  try {
    d = await r.json();
  } catch {}
  if (r.status === 401 && path != '/auth/login') {
    logout('Sua sessão expirou. Entre novamente.');
    throw Error('Sua sessão expirou. Entre novamente.');
  }
  if (r.status === 402 && session()) {
    await checkoutView(session());
    throw Error('Escolha seu plano para continuar.');
  }
  if (!r.ok) throw Error(d.message || 'Não foi possível concluir a operação.');
  return d;
}
function safeVideo(value) {
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password
      ? url.href
      : '';
  } catch {
    return '';
  }
}
function esc(v = '') {
  return String(v).replace(
    /[&<>'"]/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[c]
  );
}
function toast(m) {
  let e = document.createElement('div');
  e.className = 'toast';
  e.setAttribute('role', 'status');
  e.textContent = m;
  document.body.append(e);
  setTimeout(() => e.remove(), 3200);
}
let modalReturnFocus = null;
function closeModal() {
  stopRest();
  modalRoot.innerHTML = '';
  const shouldRefresh = workoutUpdated;
  workoutUpdated = false;
  if (shouldRefresh && session()) shell(session(), currentPage);
  if (modalReturnFocus?.isConnected) modalReturnFocus.focus();
}
function logout(message = 'Você saiu da sua conta.') {
  localStorage.removeItem('fithtech_token');
  localStorage.removeItem('fithtech_session');
  closeModal();
  landingView();
  toast(message);
}
function landingView() {
  app.innerHTML = `<div class="landing">
    <header class="public-header"><button class="logo-button" data-action="landing" aria-label="FTECH início"><img src="assets/ftech_logo.png" alt="FTECH"></button><nav><a href="#como-funciona">Como funciona</a><a href="#para-quem">Para quem</a><a href="#planos">Planos</a><button class="btn ghost" data-action="login">Entrar</button><button class="btn primary" data-action="register">Criar conta</button></nav></header>
    <section class="landing-hero"><div class="hero-copy"><span class="eyebrow">SEU PLANO. SUA ROTINA. SEUS REGISTROS.</span><h1>Seu próximo treino.<br><em>Sem dúvidas.</em></h1><p>Saiba o que treinar, consulte as orientações do professor e registre o que você fez. Uma semana organizada, em um só lugar.</p><div class="hero-actions"><button class="btn primary big-btn" data-action="register">Começar minha rotina</button><button class="btn ghost big-btn" data-action="login">Já tenho uma conta</button></div><div class="trust-row"><span>✓ Agenda semanal</span><span>✓ Orientações por exercício</span><span>✓ Histórico de cargas</span></div></div><div class="hero-media"><img src="assets/treino_realista.png" alt="Ambiente de treinamento"><div class="hero-example"><small>EXEMPLO DE ORGANIZAÇÃO</small><div><b>Treino A · membros superiores</b><span>Seg · Qui</span></div><p>Séries, repetições, descanso e orientação.<br>Um plano fácil de consultar.</p></div></div></section>
    <section class="landing-section problem-section"><div class="landing-heading"><span class="eyebrow">MENOS INFORMAÇÃO ESPALHADA</span><h2>O treino não precisa se perder nas mensagens.</h2><p>O FTECH reúne o plano do professor e os registros do aluno para facilitar o acompanhamento da rotina.</p></div><div class="sport-grid"><button class="sport-card" data-action="info" data-info="0"><span aria-hidden="true">▦</span><h3>Uma agenda clara</h3><p>Consulte o que foi previsto para cada dia da semana.</p><b>Como funciona →</b></button><button class="sport-card" data-action="info" data-info="1"><span aria-hidden="true">≡</span><h3>Orientação à mão</h3><p>Séries, repetições, pausa e observações do professor.</p><b>Como funciona →</b></button><button class="sport-card" data-action="info" data-info="2"><span aria-hidden="true">✓</span><h3>Registro da rotina</h3><p>Marque o que concluiu e mantenha os dias anteriores.</p><b>Como funciona →</b></button><button class="sport-card" data-action="info" data-info="3"><span aria-hidden="true">↗</span><h3>Cargas no histórico</h3><p>Informe a carga usada e consulte seus registros ao longo do tempo.</p><b>Como funciona →</b></button></div></section>
    <section class="landing-section steps" id="como-funciona"><div class="landing-heading"><span class="eyebrow">DO CADASTRO AO TREINO</span><h2>Três passos para conectar a rotina.</h2></div><div class="step-grid"><article><i>01</i><h3>Crie sua conta e faça o vínculo</h3><p>Cadastre-se como aluno ou professor, escolha o plano e confirme o pagamento simulado. O administrador conecta os perfis para iniciar o acompanhamento.</p></article><article><i>02</i><h3>Receba um plano organizado</h3><p>O professor escolhe os dias e define exercícios, séries, repetições, descanso e orientações.</p></article><article><i>03</i><h3>Treine e mantenha os registros</h3><p>O aluno marca as conclusões e pode informar a carga usada. Ambos consultam o histórico.</p></article></div></section>
    <section class="landing-section community" id="para-quem" aria-labelledby="community-title"><div class="landing-heading"><span class="eyebrow">ALUNO E PROFESSOR CONECTADOS</span><h2 id="community-title">Cada pessoa tem seu papel.</h2><p>Uma rotina organizada para quem treina e para quem acompanha.</p></div><div class="community-grid"><article class="community-card"><img src="assets/professor-demo.jpg" alt="Personagem de professor gerado por IA" loading="lazy" width="720" height="960"><div><span class="eyebrow">PROFESSOR</span><h3>Planeje. Oriente. Acompanhe.</h3><p>Crie planos, organize a semana e consulte o que seus alunos registraram.</p><small>Personagem ilustrativo gerado por IA</small></div></article><article class="community-card"><img src="assets/aluno-demo.jpg" alt="Personagem de aluno gerado por IA" loading="lazy" width="720" height="960"><div><span class="eyebrow">ALUNO</span><h3>Consulte. Treine. Registre.</h3><p>Abra o treino do dia, consulte a orientação e mantenha seu histórico.</p><small>Personagem ilustrativo gerado por IA</small></div></article></div></section>
    <section class="landing-section pricing-section" id="planos"><div class="landing-heading"><span class="eyebrow">ESCOLHA O SEU PERÍODO</span><h2>Dois planos. A mesma rotina organizada.</h2><p>R$ 29,90 por mês ou R$ 299,00 por ano. Pagamento fictício para demonstrar a liberação de acesso.</p></div><div id="public-pricing"><p class="muted">Carregando planos...</p></div></section>
    <section class="landing-section partnership-section"><span class="eyebrow">ESPAÇO PARA NOVAS CONEXÕES</span><h2>Uma ideia que também pode crescer com parceiros.</h2><p>Área demonstrativa para apresentar futuras parcerias com academias e profissionais. O cupom fictício <b>PARCERIA10</b> permite testar 10% de desconto no checkout, sem vínculo com empresas reais.</p></section>
    <section class="landing-section faq-section"><div class="landing-heading"><span class="eyebrow">ANTES DE COMEÇAR</span><h2>Como o FTECH entra na sua rotina?</h2></div><div class="faq-list"><details><summary>O que acontece depois do cadastro?</summary><p>Após escolher um plano e concluir a simulação, você pode completar seu perfil. Para começar o acompanhamento, informe seu e-mail ao administrador para que ele vincule aluno e professor. Depois, o professor cria o plano.</p></details><details><summary>O que consigo acompanhar?</summary><p>Os dias com atividade, os exercícios concluídos e as cargas que você informar. Os registros ajudam a conversar com o professor sobre sua rotina.</p></details><details><summary>Preciso informar carga em todo exercício?</summary><p>Não. O campo é opcional, inclusive para exercícios com peso corporal. Registre em kg e use o mesmo critério ao comparar execuções do mesmo exercício.</p></details><details><summary>Quem prepara e ajusta meu treino?</summary><p>O professor vinculado à sua conta. O FTECH organiza a prescrição e os registros; as orientações e os ajustes do plano vêm do profissional.</p></details></div></section>
    <section class="landing-cta"><img src="assets/ftech_icon.png" alt=""><div><span class="eyebrow">UM LUGAR PARA SUA ROTINA</span><h2>Comece pelo seu próximo treino.</h2></div><button class="btn primary big-btn" data-action="register">Criar minha conta</button></section>
    <footer class="public-footer"><img src="assets/ftech_logo.png" alt="FTECH"><span>Projeto Integrador II · Fatec Taquaritinga · 2026</span></footer>
  </div>`;
  loadPublicPlans();
}

function infoModal(title, headline, text, icon) {
  modalRoot.innerHTML = `<div class="backdrop"><div class="dialog info-dialog"><button class="icon info-close" data-action="close" aria-label="Fechar janela">×</button><div class="info-symbol">${icon}</div><span class="eyebrow">FTECH EXPERIENCE</span><h2>${esc(title)}</h2><h3>${esc(headline)}</h3><p>${esc(text)}</p><button class="btn primary wide" data-action="register">Começar agora</button></div></div>`;
}
function loginView() {
  modalRoot.innerHTML = `<div class="backdrop auth-backdrop"><div class="auth-dialog"><button class="icon auth-close" data-action="close" aria-label="Fechar janela">×</button><section class="auth-message"><img src="assets/ftech_logo.png" alt="FTECH"><span class="eyebrow">SUA ROTINA CONTINUA AQUI</span><h2>Seu plano.<br><em>Seu próximo passo.</em></h2><p>Entre para consultar a agenda e manter seus registros com o professor.</p></section><form class="auth-card modern" id="loginForm"><div class="mini-logo"><img src="assets/ftech_icon.png" alt=""></div><h2>Bem-vindo de volta</h2><p>Acesse sua conta FTECH.</p><label>E-mail<input id="email" type="email" autocomplete="username" maxlength="160" required placeholder="seu@email.com"></label><label>Senha<div class="password-wrap"><input id="password" type="password" autocomplete="current-password" required placeholder="Sua senha"><button type="button" class="show-pass" id="showPassword" aria-pressed="false">Mostrar</button></div></label><p id="login-error" class="form-error" role="alert"></p><button class="btn primary wide" id="loginButton">Entrar no FTECH</button><p class="form-hint">Se o seu plano ainda não foi confirmado, você continuará na etapa de pagamento simulado.</p><button type="button" class="link-btn" id="goRegister">Ainda não tenho uma conta</button></form></div></div>`;
  const form = $('loginForm'),
    button = $('loginButton'),
    email = $('email'),
    password = $('password'),
    show = $('showPassword'),
    error = $('login-error');
  show.onclick = () => {
    password.type = password.type === 'password' ? 'text' : 'password';
    show.textContent = password.type === 'password' ? 'Mostrar' : 'Ocultar';
    show.setAttribute('aria-pressed', String(password.type === 'text'));
  };
  form.onsubmit = async (event) => {
    event.preventDefault();
    if (button.disabled) return;
    button.disabled = true;
    button.textContent = 'Verificando acesso...';
    error.textContent = '';
    try {
      const result = await api('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: email.value.trim(), password: password.value }),
      });
      localStorage.setItem('fithtech_token', result.token);
      localStorage.setItem('fithtech_session', JSON.stringify(result.user));
      closeModal();
      await enterAccount(result.user);
    } catch (failure) {
      error.textContent = failure.message;
      button.disabled = false;
      button.textContent = 'Entrar no FTECH';
    }
  };
  $('goRegister').onclick = registerView;
}
function registerView() {
  modalRoot.innerHTML = `<div class="backdrop auth-backdrop"><div class="auth-dialog"><button class="icon auth-close" data-action="close" aria-label="Fechar janela">×</button><section class="auth-message register-message"><img src="assets/ftech_logo.png" alt="FTECH"><span class="eyebrow">COMECE EM TRÊS PASSOS</span><h2>Uma conta.<br><em>Uma rotina organizada.</em></h2><p>Crie sua conta, escolha o plano e confirme a simulação para liberar o acesso. Depois, o administrador conecta aluno e professor.</p><div class="message-cycle"><b>1 · Cadastro</b><span>→</span><b>2 · Plano e simulação</b><span>→</span><b>3 · Painel liberado</b></div></section><form class="auth-card modern" id="reg"><div class="mini-logo"><img src="assets/ftech_icon.png" alt=""></div><h2>Crie sua conta</h2><label>Nome completo<input id="rn" autocomplete="name" required minlength="3" maxlength="120" placeholder="Como você se chama?"></label><label>E-mail<input id="re" type="email" autocomplete="username" required maxlength="160" placeholder="seu@email.com"></label><label>Como você usará o FTECH?<select id="rr"><option value="aluno">Quero treinar · aluno</option><option value="personal">Quero orientar · professor</option></select></label><label>Crie uma senha<input id="rp" type="password" autocomplete="new-password" minlength="8" required aria-describedby="password-rules"></label><label>Confirme a senha<input id="rconfirm" type="password" autocomplete="new-password" minlength="8" required></label><button class="link-btn password-reveal" id="show-registration-password" type="button" aria-pressed="false">Mostrar senhas</button><ul class="password-checks" id="password-rules"><li data-rule="length">○ Pelo menos 8 caracteres</li><li data-rule="bytes">○ Tamanho de senha aceito</li><li data-rule="match">○ Confirmação igual à senha</li></ul><p id="registration-error" class="form-error" role="alert"></p><button class="btn primary wide" id="regButton">Criar conta e escolher plano</button><p class="form-hint">Na próxima etapa, os planos e o cupom são demonstrativos. Nenhuma cobrança real será feita.</p><button type="button" class="link-btn" id="back">Já tenho uma conta</button></form></div></div>`;
  const form = $('reg'),
    password = $('rp'),
    confirmation = $('rconfirm'),
    button = $('regButton'),
    error = $('registration-error'),
    show = $('show-registration-password');
  const checks = () => {
    const bytes = new TextEncoder().encode(password.value).length;
    const rules = {
      length: password.value.length >= 8,
      bytes: bytes > 0 && bytes <= 72,
      match: confirmation.value.length > 0 && confirmation.value === password.value,
    };
    const texts = {
      length: 'Pelo menos 8 caracteres',
      bytes: 'Tamanho de senha aceito',
      match: 'Confirmação igual à senha',
    };
    for (const [rule, passed] of Object.entries(rules)) {
      const item = form.querySelector('[data-rule="' + rule + '"]');
      item.classList.toggle('passed', passed);
      item.textContent = (passed ? '✓ ' : '○ ') + texts[rule];
    }
    confirmation.setCustomValidity(
      confirmation.value && confirmation.value !== password.value
        ? 'As senhas precisam ser iguais.'
        : ''
    );
    password.setCustomValidity(
      bytes > 72 ? 'Esta senha está muito longa. Use uma senha mais curta.' : ''
    );
  };
  password.addEventListener('input', checks);
  confirmation.addEventListener('input', checks);
  show.onclick = () => {
    const visible = password.type === 'password';
    password.type = confirmation.type = visible ? 'text' : 'password';
    show.textContent = visible ? 'Ocultar senhas' : 'Mostrar senhas';
    show.setAttribute('aria-pressed', String(visible));
  };
  form.onsubmit = async (event) => {
    event.preventDefault();
    checks();
    if (!form.reportValidity() || button.disabled) return;
    button.disabled = true;
    button.textContent = 'Criando sua conta...';
    error.textContent = '';
    try {
      const result = await api('/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          nome: $('rn').value.trim(),
          email: $('re').value.trim(),
          password: password.value,
          perfil: $('rr').value,
        }),
      });
      localStorage.setItem('fithtech_token', result.token);
      localStorage.setItem('fithtech_session', JSON.stringify(result.user));
      closeModal();
      await enterAccount(result.user);
    } catch (failure) {
      error.textContent = failure.message;
      button.disabled = false;
      button.textContent = 'Criar conta e escolher plano';
    }
  };
  $('back').onclick = loginView;
}

function menu(role) {
  return role === 'aluno'
    ? [
        ['inicio', 'Visão geral', '⌂'],
        ['treinos', 'Meu plano', '▣'],
        ['progresso', 'Meu progresso', '↗'],
        ['personal', 'Meu professor', '◎'],
        ['perfil', 'Meu perfil', '○'],
        ['assinatura', 'Assinatura', '◈'],
      ]
    : role === 'personal'
      ? [
          ['inicio', 'Visão geral', '⌂'],
          ['alunos', 'Meus alunos', '◎'],
          ['treinos', 'Gerenciar treinos', '▣'],
          ['evolucao', 'Evolução', '↗'],
          ['perfil', 'Meu perfil', '○'],
          ['assinatura', 'Assinatura', '◈'],
        ]
      : [
          ['inicio', 'Visão geral', '⌂'],
          ['usuarios', 'Usuários', '◎'],
          ['vinculos', 'Vínculos', '⇄'],
          ['perfil', 'Meu perfil', '○'],
        ];
}
const titles = {
  inicio: 'Visão geral',
  assinatura: 'Assinatura',
  treinos: 'Meu plano',
  progresso: 'Meu progresso',
  personal: 'Meu professor',
  perfil: 'Meu perfil',
  alunos: 'Meus alunos',
  evolucao: 'Evolução dos alunos',
  usuarios: 'Usuários',
  vinculos: 'Vínculos aluno-professor',
};
function shell(u, page) {
  app.innerHTML = `<div class="layout"><aside><div><div class="app-logo"><img src="assets/ftech_logo.png" alt="FTECH"></div><div class="role">${labels[u.role]}</div></div><nav>${menu(
    u.role
  )
    .map(
      ([id, l, ic]) =>
        `<button data-page="${id}" class="${page === id ? 'active' : ''}"><i>${ic}</i>${l}</button>`
    )
    .join(
      ''
    )}</nav><div class="aside-user">${avatar(u.role)}<div><b>${esc(u.name)}</b><small>${esc(u.email)}</small></div></div></aside><main><header><div><span class="hello">Olá, ${esc(u.name.split(' ')[0])}</span><h1>${titles[page] || 'FTECH'}</h1></div><button class="btn ghost" id="logout">Sair</button></header><div id="page" class="page"><div class="loader">Carregando...</div></div></main></div>`;
  document
    .querySelectorAll('aside [data-page]')
    .forEach((b) => (b.onclick = () => shell(u, b.dataset.page)));
  document.querySelector('#logout').onclick = () => logout();
  currentPage = page;
  render(u, page);
}
function metric(label, value, sub = '') {
  return `<article class="metric"><span>${label}</span><strong>${value}</strong><small>${sub}</small></article>`;
}
async function render(u, p) {
  const target = document.querySelector('#page');
  try {
    if (p === 'assinatura') return await subscriptionView(u);
    if (p === 'inicio') return await dashboard(u);
    if (p === 'treinos') return await (u.role === 'aluno' ? studentWorkouts() : trainerWorkouts());
    if (p === 'progresso') return await progress();
    if (p === 'personal') return await trainerProfile();
    if (p === 'alunos') return await students();
    if (p === 'evolucao') return await evolution();
    if (p === 'usuarios') return await adminUsers();
    if (p === 'vinculos') return await relationships();
    if (p === 'perfil') return await profile(u);
  } catch (e) {
    if (!target?.isConnected) return;
    target.innerHTML = `<section class="panel"><h3>Não foi possível carregar</h3><p>${esc(e.message)}</p><button class="btn primary" data-action="retry">Tentar novamente</button></section>`;
  }
}
async function dashboard(u) {
  const el = document.querySelector('#page');
  const s = await api('/stats/dashboard');
  if (u.role === 'aluno') {
    const ws = await api('/workouts/mine');
    const today = ws.filter((w) => w.agendado_hoje);
    const date = new Date(s.hoje + 'T12:00:00').toLocaleDateString('pt-BR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
    el.innerHTML = `${demoBanner(s.demonstracao)}<div class="daily-heading"><div><span class="eyebrow">SUA ROTINA, COM CLAREZA</span><h2>O que vamos treinar hoje?</h2><p>${esc(date)}${s.professor ? ' · Com ' + esc(s.professor.nome) : ''}</p></div>${s.objetivo ? `<span class="goal-tag">Seu objetivo: ${esc(s.objetivo)}</span>` : ''}</div>${onboarding(s)}<div class="metrics">${metric('Treinos de hoje', s.treinos_hoje, 'na sua agenda')}${metric('Conclusão de hoje', s.percentual + '%', s.exercicios_hoje ? `${s.concluidos} de ${s.exercicios_hoje} exercícios previstos` : 'nenhum exercício agendado')}${metric('Dias com atividade', s.dias_ativos_semana + ' / 7', 'nos últimos sete dias')}</div><section class="panel weekly-panel"><div class="section-title"><div><span class="eyebrow">SEU PLANEJAMENTO</span><h2>Uma semana de cada vez.</h2></div><button class="btn ghost small" data-action="open-day" data-day="all">Plano completo</button></div>${weekView(ws, s.dia_semana)}</section><div class="today-grid"><div>${today.length ? today.map((w) => workoutCard(w, true)).join('') : emptyState(s.treinos ? 'Hoje está livre na sua agenda.' : 'Seu primeiro treino está a caminho.', s.treinos ? 'Nenhum treino foi agendado para hoje. Confira os próximos dias ou combine os dias com seu professor.' : s.professor ? 'Seu professor já está vinculado e poderá preparar seu plano. Enquanto isso, complete seu objetivo no perfil.' : 'Informe seu e-mail de cadastro ao administrador para que ele vincule você ao professor.', s.treinos ? '<button class="btn ghost" data-action="open-day" data-day="all">Consultar meu plano</button>' : '')}${s.sem_agenda ? `<div class="notice"><b>${s.sem_agenda} treino(s) sem dias definidos</b><p>Os exercícios continuam disponíveis. Peça ao professor para organizar os dias da semana.</p><button class="btn ghost small" data-action="open-day" data-day="all">Ver meus treinos</button></div>` : ''}<section class="panel"><span class="eyebrow">SUA ATIVIDADE RECENTE</span><h2>Últimos registros</h2><div class="timeline">${historyRows(s.ultimas_atividades || [], 3)}</div></section></div><section class="panel daily-progress"><span class="eyebrow">PASSO A PASSO</span><h2>${s.exercicios_hoje && s.percentual === 100 ? 'Agenda de hoje concluída!' : 'Seu registro de hoje'}</h2><div class="progress-ring" style="--p:${s.percentual}"><div><strong>${s.percentual}%</strong><small>do previsto</small></div></div><p>${s.exercicios_hoje ? 'Conclua os exercícios da agenda para acompanhar sua rotina.' : 'O percentual começa quando há exercícios agendados para hoje.'}</p><button class="btn ghost wide" data-action="navigate" data-page="progresso">Ver histórico e cargas</button></section></div>`;
  } else if (u.role === 'personal') {
    const [ss, ws] = await Promise.all([api('/relationships/students'), api('/workouts/mine')]);
    const pending = ss.filter((student) => !ws.some((w) => w.aluno_id === student.id));
    el.innerHTML = `${demoBanner(s.demonstracao)}<div class="daily-heading"><div><span class="eyebrow">PAINEL DO PROFESSOR</span><h2>Um plano claro para cada aluno.</h2><p>Organize os dias, oriente a execução e acompanhe os registros.</p></div></div><div class="metrics">${metric('Alunos vinculados', s.alunos)}${metric('Treinos ativos', s.treinos)}${metric('Aguardando plano', s.alunos_sem_treino, 'alunos sem treino ativo')}${metric('Conclusões registradas', s.conclusoes)}</div>${
      ss.length
        ? `<section class="panel"><div class="section-title"><div><span class="eyebrow">PRÓXIMAS AÇÕES</span><h2>${pending.length ? 'Estes alunos aguardam seu plano.' : 'Seus alunos já têm um plano.'}</h2></div><button class="btn ghost small" data-action="navigate" data-page="alunos">Ver todos</button></div>${(pending.length
            ? pending
            : ss
          )
            .slice(0, 4)
            .map(
              (student) =>
                `<div class="action-row"><div><b>${esc(student.nome)}</b><p>${esc(student.objetivo || 'Objetivo ainda não informado no perfil.')}</p></div><button class="btn primary small" data-action="new-workout" data-id="${student.id}" data-name="${esc(student.nome)}">Criar treino</button></div>`
            )
            .join('')}</section>`
        : emptyState(
            'Seu primeiro aluno começa pelo vínculo.',
            'Informe seu e-mail de cadastro ao administrador. Depois do vínculo, o aluno aparecerá aqui e você poderá criar o primeiro treino.'
          )
    }<section class="panel feature-note"><div><span class="eyebrow">ACOMPANHAMENTO</span><h2>Veja a rotina além da prescrição.</h2><p>Consulte os dias de atividade e as cargas que cada aluno registrou nos exercícios.</p></div><button class="btn ghost" data-action="navigate" data-page="evolucao">Acompanhar alunos</button></section>`;
  } else {
    const [options, links] = await Promise.all([
      api('/relationships/options'),
      api('/relationships/all'),
    ]);
    const pending = options.alunos.filter(
      (student) => !links.some((link) => link.aluno_id === student.id && link.ativo)
    );
    el.innerHTML = `${demoBanner(s.demonstracao)}<div class="daily-heading"><div><span class="eyebrow">ADMINISTRAÇÃO</span><h2>Conecte quem orienta a quem treina.</h2><p>Gerencie as contas e mantenha cada aluno vinculado ao seu professor.</p></div></div><div class="metrics">${metric('Usuários ativos', s.usuarios)}${metric('Alunos', s.alunos)}${metric('Professores', s.personais)}${metric('Aguardando vínculo', s.alunos_sem_professor)}</div><section class="panel"><div class="section-title"><div><span class="eyebrow">COMEÇAR O ACOMPANHAMENTO</span><h2>Alunos sem professor</h2></div><button class="btn ghost small" data-action="navigate" data-page="vinculos">Gerenciar vínculos</button></div>${
      pending.length
        ? pending
            .slice(0, 8)
            .map(
              (student) =>
                `<div class="action-row"><b>${esc(student.nome)}</b><button class="btn primary small" data-action="new-link" data-student="${student.id}">Vincular professor</button></div>`
            )
            .join('')
        : '<p class="muted">Todos os alunos ativos já estão vinculados a um professor.</p>'
    }${!options.personais.length ? '<p class="notice">Ainda não há professores ativos. Cadastre um professor em Usuários antes de criar o vínculo.</p>' : ''}</section>`;
    window._linkOptions = options;
  }
}

async function students() {
  const el = document.querySelector('#page');
  const ss = await api('/relationships/students'),
    ws = await api('/workouts/mine');
  let prog = {};
  for (const s of ss) prog[s.id] = await api('/progress/mine?aluno_id=' + s.id);
  el.innerHTML = `<div class="section-title"><div><span class="eyebrow">ACOMPANHAMENTO</span><h2>${ss.length} aluno(s) vinculado(s)</h2></div></div>${
    ss
      .map((s) => {
        let sw = ws.filter((w) => w.aluno_id === s.id);
        return `<section class="panel student"><div class="student-top"><img class="person-avatar lg" src="assets/aluno-demo.jpg" alt="Avatar ilustrativo de aluno gerado por IA" title="Imagem ilustrativa gerada por IA"><div><h3>${esc(s.nome)}</h3><p>${esc(s.email)}</p><small class="muted">${esc(s.objetivo || 'Objetivo ainda não informado.')}</small></div><div class="student-kpis"><span><b>${sw.length}</b> treinos</span><span><b>${prog[s.id].length}</b> conclusões</span></div><button class="btn primary" data-action="new-workout" data-id="${s.id}" data-name="${esc(s.nome)}">+ Criar treino</button></div>${sw.map((w) => `<div class="mini-workout"><div><b>${esc(w.nome)}</b><small>${esc(w.foco)} • ${w.exercicios.length} exercícios</small></div><span>${esc(scheduleLabel(w))}</span></div>`).join('')}</section>`;
      })
      .join('') || '<section class="panel empty">Nenhum aluno vinculado.</section>'
  }`;
}
function exerciseRow(e = {}) {
  return `<div class="exercise-editor"><input type="hidden" data-f="id" value="${e.id || ''}"><label class="exercise-name">Exercício<input data-f="nome" maxlength="120" value="${esc(e.nome || '')}" placeholder="Ex.: Supino reto"></label><label>Grupo<select data-f="grupo_muscular">${groups.map((g) => `<option ${e.grupo_muscular === g ? 'selected' : ''}>${g}</option>`).join('')}</select></label><label>Séries<input data-f="series" type="number" min="1" max="50" value="${e.series || 3}"></label><label>Repetições<input data-f="repeticoes" maxlength="30" value="${esc(e.repeticoes || '12')}"></label><label>Descanso (s)<input data-f="descanso_seg" type="number" min="0" max="600" value="${e.descanso_seg ?? 60}"></label><label class="exercise-video">Vídeo (opcional)<input data-f="video_url" value="${esc(e.video_url || '')}" maxlength="500" placeholder="https://..."></label><label class="exercise-notes">Orientações do professor<textarea data-f="observacoes" maxlength="500" placeholder="Ex.: movimento controlado; ajuste o banco antes de começar.">${esc(e.observacoes || '')}</textarea></label><button type="button" class="icon danger" data-action="remove-exercise" aria-label="Remover exercício">×</button></div>`;
}
function workoutModal(alunoId, nome, w = null) {
  modalRoot.innerHTML = `<div class="backdrop" data-dismiss="true"><div class="dialog"><div class="dialog-head"><div><span class="eyebrow">${w ? 'EDITAR' : 'NOVO'} TREINO</span><h2>${w ? esc(w.nome) : 'Treino para ' + esc(nome)}</h2></div><button class="icon" data-action="close" aria-label="Fechar janela">×</button></div><div class="form-grid"><label>Nome do treino<input id="wn" maxlength="120" value="${esc(w?.nome || '')}" placeholder="Ex.: Treino A · membros superiores"></label><label>Objetivo / foco<input id="wf" maxlength="180" value="${esc(w?.foco || '')}" placeholder="Ex.: força e condicionamento"></label><label>Frequência desejada<input id="wd" type="number" min="1" max="7" value="${w?.dias_semana || 3}"></label></div><fieldset class="schedule-editor"><legend>Em quais dias este treino acontece?</legend><p>Marque os dias para aparecer na agenda do aluno. Sem seleção, o treino ficará disponível com os dias a combinar.</p><div class="day-options">${weekdays.map((day) => `<label><input type="checkbox" data-workout-day value="${day.id}" ${w?.dias_treino?.includes(day.id) ? 'checked' : ''}><span>${day.short}</span></label>`).join('')}</div><small id="schedule-summary"></small></fieldset><div class="subhead"><h3>Exercícios e orientações</h3><button class="btn ghost small" id="addEx">+ Adicionar</button></div><div id="rows">${(w?.exercicios?.length ? w.exercicios : [{}]).map(exerciseRow).join('')}</div><div class="dialog-actions"><button class="btn ghost" data-action="close">Cancelar</button><button class="btn primary" id="saveW">Salvar treino</button></div></div></div>`;
  const [addEx, rows, saveW, frequency] = ['addEx', 'rows', 'saveW', 'wd'].map($);
  const updateSchedule = () => {
    const n = document.querySelectorAll('[data-workout-day]:checked').length;
    frequency.disabled = n > 0;
    if (n) frequency.value = n;
    $('schedule-summary').textContent = n
      ? `${n} dia(s) selecionado(s). A frequência acompanha a agenda.`
      : 'Nenhum dia definido. Combine os dias com o aluno.';
  };
  document
    .querySelectorAll('[data-workout-day]')
    .forEach((input) => input.addEventListener('change', updateSchedule));
  updateSchedule();
  addEx.onclick = () => rows.insertAdjacentHTML('beforeend', exerciseRow());
  saveW.onclick = () => saveWorkout(alunoId, w?.id);
}

async function saveWorkout(alunoId, id) {
  const [wn, wf, wd] = ['wn', 'wf', 'wd'].map($);
  const button = document.querySelector('#saveW');
  if (button.disabled) return;
  button.disabled = true;
  const ex = [...document.querySelectorAll('.exercise-editor')]
    .map((r) =>
      Object.fromEntries(
        [...r.querySelectorAll('[data-f]')].map((i) => [i.dataset.f, i.value.trim()])
      )
    )
    .filter((x) => x.nome);
  try {
    await api(id ? '/workouts/' + id : '/workouts', {
      method: id ? 'PUT' : 'POST',
      body: JSON.stringify({
        aluno_id: alunoId,
        nome: wn.value.trim(),
        foco: wf.value.trim(),
        dias_semana: +wd.value,
        dias_treino: [...document.querySelectorAll('[data-workout-day]:checked')].map((input) =>
          Number(input.value)
        ),
        exercicios: ex,
      }),
    });
    closeModal();
    toast(id ? 'Treino atualizado.' : 'Treino criado.');
    shell(session(), id ? 'treinos' : 'alunos');
  } catch (e) {
    toast(e.message);
  } finally {
    if (button.isConnected) button.disabled = false;
  }
}
async function trainerWorkouts() {
  const el = document.querySelector('#page');
  const ws = await api('/workouts/mine');
  el.innerHTML = `<div class="section-title"><div><span class="eyebrow">BIBLIOTECA</span><h2>Treinos ativos</h2><p>Edite a prescrição sem perder o histórico dos exercícios mantidos.</p></div></div>${ws.map((w) => `<section class="panel workout"><div class="workout-head"><div><span class="eyebrow">${esc(w.aluno_nome)}</span><h3>${esc(w.nome)}</h3><p>${esc(w.foco)} • ${esc(scheduleLabel(w))}</p></div><div><button class="btn ghost" data-action="edit-workout" data-id="${w.id}">Editar</button> <button class="btn danger" data-action="archive-workout" data-id="${w.id}">Arquivar</button></div></div><div class="exercise-list">${w.exercicios.map((e) => `<div><span><b>${esc(e.nome)}</b><small>${esc(e.grupo_muscular || 'Geral')}</small></span><span><b>${e.series} × ${esc(e.repeticoes)}</b><small>${e.descanso_seg} s de descanso</small></span></div>`).join('') || '<p class="muted">Sem exercícios.</p>'}</div></section>`).join('') || '<section class="panel empty">Nenhum treino ativo.</section>'}`;
}
async function editWorkout(id) {
  const w = await api('/workouts/' + id);
  workoutModal(w.aluno_id, '', w);
}
async function archiveWorkout(id) {
  if (!confirm('Arquivar este treino? Ele deixará de aparecer para o aluno.')) return;
  try {
    await api('/workouts/' + id, { method: 'DELETE' });
    toast('Treino arquivado.');
    await trainerWorkouts();
  } catch (e) {
    toast(e.message);
  }
}
async function studentWorkouts() {
  const el = document.querySelector('#page');
  const [ws, s] = await Promise.all([api('/workouts/mine'), api('/stats/dashboard')]);
  const selected = selectedWorkoutDay ?? s.dia_semana;
  const current =
    selected === 'all'
      ? ws.filter((w) => w.dias_treino.length)
      : ws.filter((w) => w.dias_treino.includes(selected));
  const unplanned = ws.filter((w) => !w.dias_treino.length);
  el.innerHTML = `<div class="section-title"><div><span class="eyebrow">MEU PLANO</span><h2>Seu treino tem dia e orientação.</h2><p>Consulte a semana e abra cada treino para ver os exercícios.</p></div><button class="btn ghost small" data-action="open-day" data-day="all">Plano completo</button></div>${ws.length ? `<section class="panel weekly-panel">${weekView(ws, s.dia_semana, selected)}</section><h3 class="plan-section-title">${selected === 'all' ? 'Todos os treinos agendados' : weekdays.find((d) => d.id === selected).name + (selected === s.dia_semana ? ' · Hoje' : '')}</h3>${current.length ? current.map((w) => workoutCard(w, w.agendado_hoje)).join('') : emptyState('Nenhum treino previsto neste dia.', 'Consulte outro dia da semana ou combine a organização da agenda com seu professor.')}${unplanned.length ? `<h3 class="plan-section-title">Dias a combinar</h3><p class="muted">Estes treinos ainda não têm dias definidos. Continuam disponíveis para consulta e registro.</p>${unplanned.map((w) => workoutCard(w)).join('')}` : ''}` : emptyState('Você ainda não recebeu um treino.', s.professor ? 'Seu professor já foi vinculado. Aguarde a preparação do plano e aproveite para informar seu objetivo.' : 'Informe seu e-mail de cadastro ao administrador para ser vinculado ao professor.', '<button class="btn ghost" data-action="navigate" data-page="perfil">Completar meu perfil</button>')}`;
}
async function openStudentWorkout(id) {
  const w = await api('/workouts/' + id);
  stopRest();
  modalRoot.innerHTML = `<div class="backdrop"><div class="dialog workout-dialog"><div class="dialog-head"><div><span class="eyebrow">${w.agendado_hoje ? 'TREINO DE HOJE' : 'MEU PLANO'}</span><h2>${esc(w.nome)}</h2><p>${esc(w.foco)} · ${esc(scheduleLabel(w))}</p></div><button class="icon" data-action="close" aria-label="Fechar janela">×</button></div>${!w.agendado_hoje ? '<div class="notice">Este treino não está na agenda de hoje. Você pode consultá-lo e registrar uma execução extra; ela ficará no histórico, sem alterar o percentual dos treinos previstos para hoje.</div>' : ''}<p class="muted">A carga usada é opcional. Informe o valor em kg de forma consistente entre os registros.</p><div class="student-exercises">${w.exercicios.map((e, index) => `<article class="exercise-prescription ${e.concluido ? 'completed' : ''}"><div class="prescription-head"><span class="exercise-index">${String(index + 1).padStart(2, '0')}</span><div><h3>${esc(e.nome)}</h3><p>${esc(e.grupo_muscular || 'Exercício do plano')}</p></div>${e.concluido ? '<span class="pill">Registrado hoje</span>' : ''}</div><div class="prescription-values"><span>Séries<b>${e.series}</b></span><span>Repetições<b>${esc(e.repeticoes)}</b></span><span>Descanso<b>${e.descanso_seg ? e.descanso_seg + ' s' : 'Sem pausa'}</b></span></div>${e.observacoes ? `<div class="trainer-guidance"><b>Orientação do professor</b><p>${esc(e.observacoes)}</p></div>` : ''}<div class="prescription-actions"><label>Carga usada (kg)<input id="load-${e.id}" type="number" min="0" max="2000" step="0.01" inputmode="decimal" value="${e.carga_hoje !== null ? Number(e.carga_hoje) : ''}" placeholder="Opcional" ${e.concluido ? 'disabled' : ''}></label><div class="exercise-buttons">${safeVideo(e.video_url) ? `<a class="btn ghost small" target="_blank" rel="noopener noreferrer" href="${esc(safeVideo(e.video_url))}">Ver vídeo</a>` : ''}${e.descanso_seg ? `<button class="btn ghost small" data-action="rest" data-seconds="${e.descanso_seg}">Iniciar descanso</button>` : ''}<button class="btn ${e.concluido ? 'success' : 'primary'} small" data-action="complete" data-id="${e.id}" data-workout="${id}" data-done="${e.concluido ? 1 : 0}">${e.concluido ? '✓ Feito hoje' : 'Concluir hoje'}</button></div></div><div class="rest-status" role="status" aria-live="polite"></div></article>`).join('')}</div></div></div>`;
}

async function toggleComplete(eid, wid, done) {
  try {
    await api('/progress/complete' + (done ? '/' + eid : ''), {
      method: done ? 'DELETE' : 'POST',
      body: done
        ? undefined
        : JSON.stringify({ exercicio_id: eid, carga_kg: $('load-' + eid)?.value ?? '' }),
    });
    workoutUpdated = true;
    toast(done ? 'Conclusão de hoje desmarcada.' : 'Exercício concluído hoje!');
    await openStudentWorkout(wid);
  } catch (e) {
    toast(e.message);
  }
}
async function progress() {
  const el = document.querySelector('#page');
  const [p, s] = await Promise.all([api('/progress/mine'), api('/stats/dashboard')]);
  const byMonth = {};
  const date = new Date(s.hoje.slice(0, 7) + '-01T12:00:00Z');
  for (let i = 5; i >= 0; i--) {
    const d = new Date(date);
    d.setUTCMonth(d.getUTCMonth() - i);
    byMonth[`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`] = 0;
  }
  (s.meses || []).forEach((x) => {
    if (x.mes in byMonth) byMonth[x.mes] = x.total;
  });
  const vals = Object.entries(byMonth),
    max = Math.max(1, ...vals.map((x) => x[1]));
  el.innerHTML = `${demoBanner(s.demonstracao)}<div class="daily-heading"><div><span class="eyebrow">CONSTÂNCIA E REGISTROS</span><h2>Veja o caminho que você registrou.</h2><p>Consulte os dias com atividade e as cargas informadas nos exercícios.</p></div></div><div class="metrics">${metric('Dias com atividade', s.dias_ativos_semana + ' / 7', 'nos últimos sete dias')}${metric('Histórico total', s.historico_total, 'exercícios concluídos')}${metric('Agenda de hoje', s.percentual + '%', `${s.concluidos} de ${s.exercicios_hoje} exercícios previstos`)}</div><div id="load-history-root"></div><div class="two"><section class="panel"><span class="eyebrow">ÚLTIMAS CONCLUSÕES</span><h2>Seu histórico</h2><div class="timeline">${historyRows(p)}</div></section><section class="panel"><span class="eyebrow">ATIVIDADE</span><h2>Conclusões por mês</h2><div class="bars">${vals.map(([m, value]) => `<div><b>${value}</b><span style="height:${value ? Math.max(8, (value / max) * 100) : 0}%"></span><small>${m.slice(5)}/${m.slice(2, 4)}</small></div>`).join('')}</div></section></div>`;
  el.querySelector('#load-history-root').append(loadHistory(p));
}
async function evolution() {
  const el = document.querySelector('#page');
  const students = await api('/relationships/students');
  el.innerHTML =
    '<div class="section-title"><div><span class="eyebrow">ACOMPANHAMENTO</span><h2>Da orientação ao registro.</h2><p>Consulte as atividades e as cargas informadas pelos seus alunos.</p></div></div>';
  if (!students.length) {
    el.insertAdjacentHTML(
      'beforeend',
      emptyState(
        'Ainda não há alunos vinculados.',
        'Peça ao administrador para vincular os alunos ao seu cadastro.'
      )
    );
    return;
  }
  const histories = await Promise.all(
    students.map((student) => api('/progress/mine?aluno_id=' + student.id))
  );
  students.forEach((student, index) => {
    const p = histories[index];
    const section = document.createElement('section');
    section.className = 'panel student-history';
    section.innerHTML = `<div class="workout-head"><div><h2>${esc(student.nome)}</h2><p>${esc(student.objetivo || 'Objetivo ainda não informado.')} · ${p.length} conclusão(ões)</p></div><span class="pill">Acompanhamento ativo</span></div><div class="timeline compact">${historyRows(p, 6)}</div>`;
    section.append(loadHistory(p));
    el.append(section);
  });
}

async function trainerProfile() {
  const el = document.querySelector('#page');
  const t = await api('/relationships/trainer');
  el.innerHTML = t
    ? `<section class="panel trainer-card"><figure class="person-portrait"><img src="assets/professor-demo.jpg" alt="Personagem ilustrativo de um professor, gerado por IA"><figcaption>Imagem ilustrativa gerada por IA</figcaption></figure><div><span class="eyebrow">SEU PROFESSOR</span><h2>${esc(t.nome)}</h2><h4>Professor de Educação Física</h4><p>${esc(t.bio || 'Este professor ainda não adicionou uma apresentação ao perfil.')}</p><small>${esc(t.email)}</small></div></section>`
    : '<section class="panel empty">Seu vínculo com o professor ainda está pendente. Informe seu e-mail de cadastro ao administrador da academia ou do projeto para iniciar o acompanhamento.</section>';
}
async function profile(u) {
  const el = document.querySelector('#page');
  const me = await api('/users/me');
  el.innerHTML = `<section class="panel profile-identity">${avatar(u.role, 'lg')}<div><h2>${esc(me.nome)}</h2><p>${labels[u.role]}${u.role === 'admin' ? '' : ' · Avatar ilustrativo gerado por IA'}</p></div></section><div class="two profile-grid"><section class="panel"><span class="eyebrow">DADOS PESSOAIS</span><h2>Editar perfil</h2><form id="pf"><label>Nome<input id="pn" value="${esc(me.nome)}"></label><label>E-mail<input value="${esc(me.email)}" disabled></label><label>Telefone<input id="pt" value="${esc(me.telefone || '')}" placeholder="(00) 00000-0000"></label><label>Seu objetivo<input id="po" maxlength="180" value="${esc(me.objetivo || '')}" placeholder="Ex.: criar uma rotina de três treinos por semana"></label><label>Sobre você<textarea id="pb" maxlength="500" placeholder="Conte um pouco sobre seu perfil...">${esc(me.bio || '')}</textarea></label><button class="btn primary">Salvar perfil</button></form></section><section class="panel"><span class="eyebrow">SEGURANÇA</span><h2>Alterar senha</h2><form id="pw"><label>Senha atual<input id="pc" type="password" required></label><label>Nova senha<input id="pnew" type="password" minlength="8" required></label><label>Confirmar nova senha<input id="pconf" type="password" minlength="8" required></label><button class="btn primary">Alterar senha</button></form></section></div>`;
  const [pf, pn, pt, pb, pw, pc, pnew, pconf] = [
    'pf',
    'pn',
    'pt',
    'pb',
    'pw',
    'pc',
    'pnew',
    'pconf',
  ].map($);
  pf.onsubmit = async (e) => {
    e.preventDefault();
    try {
      await api('/users/me', {
        method: 'PUT',
        body: JSON.stringify({
          nome: pn.value,
          telefone: pt.value,
          bio: pb.value,
          objetivo: $('po')?.value || '',
        }),
      });
      u.name = pn.value.trim();
      localStorage.setItem('fithtech_session', JSON.stringify(u));
      toast('Perfil atualizado.');
      shell(u, 'perfil');
    } catch (x) {
      toast(x.message);
    }
  };
  pw.onsubmit = async (e) => {
    e.preventDefault();
    if (pnew.value !== pconf.value) return toast('As novas senhas não coincidem.');
    try {
      let r = await api('/auth/password', {
        method: 'PUT',
        body: JSON.stringify({ currentPassword: pc.value, newPassword: pnew.value }),
      });
      logout(r.message);
    } catch (x) {
      toast(x.message);
    }
  };
}
async function adminUsers() {
  const el = document.querySelector('#page');
  const us = await api('/users');
  el.innerHTML = `<div class="section-title"><div><span class="eyebrow">ADMINISTRAÇÃO</span><h2>Contas da plataforma</h2></div><button class="btn primary" data-action="new-user">+ Novo usuário</button></div><section class="panel table"><div class="tr head"><span>Usuário</span><span>Perfil</span><span>Status</span><span>Ação</span></div>${us.map((x) => `<div class="tr"><span><b>${esc(x.nome)}</b><small>${esc(x.email)}</small></span><span>${labels[x.perfil]}</span><span class="${x.ativo ? 'ok' : 'off'}">● ${x.ativo ? 'Ativo' : 'Inativo'}</span><span><button class="btn ghost small" data-action="status" data-id="${x.id}" data-active="${x.ativo ? 0 : 1}">${x.ativo ? 'Desativar' : 'Ativar'}</button></span></div>`).join('')}</section>`;
}
function newUserModal() {
  modalRoot.innerHTML = `<div class="backdrop"><div class="dialog narrow"><div class="dialog-head"><div><span class="eyebrow">ADMIN</span><h2>Novo usuário</h2></div><button class="icon" data-action="close" aria-label="Fechar janela">×</button></div><label>Nome<input id="an"></label><label>E-mail<input id="ae" type="email"></label><label>Perfil<select id="ar"><option value="aluno">Aluno</option><option value="personal">Professor</option><option value="admin">Administrador</option></select></label><label>Senha inicial<input id="ap" type="password" placeholder="Pelo menos 8 caracteres" minlength="8" autocomplete="new-password"></label><div class="dialog-actions"><button class="btn primary" id="as">Criar usuário</button></div></div></div>`;
  const [as, an, ae, ar, ap] = ['as', 'an', 'ae', 'ar', 'ap'].map($);
  as.onclick = async () => {
    try {
      await api('/users', {
        method: 'POST',
        body: JSON.stringify({
          nome: an.value,
          email: ae.value,
          perfil: ar.value,
          password: ap.value,
        }),
      });
      closeModal();
      toast('Usuário criado.');
      await adminUsers();
    } catch (e) {
      toast(e.message);
    }
  };
}
async function toggleUser(id, ativo) {
  try {
    await api('/users/' + id + '/status', {
      method: 'PATCH',
      body: JSON.stringify({ ativo: !!ativo }),
    });
    toast('Status atualizado.');
    await adminUsers();
  } catch (e) {
    toast(e.message);
  }
}
async function relationships() {
  const el = document.querySelector('#page');
  const [rs, o] = await Promise.all([api('/relationships/all'), api('/relationships/options')]);
  el.innerHTML = `<div class="section-title"><div><span class="eyebrow">RELACIONAMENTOS</span><h2>Aluno ↔ Professor</h2><p>Defina quem acompanha cada aluno.</p></div><button class="btn primary" data-action="new-link">+ Novo vínculo</button></div><section class="panel table"><div class="tr head"><span>Aluno</span><span>Professor</span><span>Status</span><span>Ação</span></div>${rs.map((r) => `<div class="tr"><span><b>${esc(r.aluno_nome)}</b></span><span>${esc(r.personal_nome)}</span><span class="${r.ativo ? 'ok' : 'off'}">● ${r.ativo ? 'Ativo' : 'Inativo'}</span><span>${r.ativo ? `<button class="btn ghost small" data-action="unlink" data-id="${r.id}">Desvincular</button>` : ''}</span></div>`).join('')}</section>`;
  window._linkOptions = o;
}
function linkModal(alunoId = null) {
  let o = window._linkOptions;
  modalRoot.innerHTML = `<div class="backdrop"><div class="dialog narrow"><div class="dialog-head"><h2>Novo vínculo</h2><button class="icon" data-action="close" aria-label="Fechar janela">×</button></div><label>Aluno<select id="la">${o.alunos.map((x) => `<option value="${x.id}">${esc(x.nome)}</option>`).join('')}</select></label><label>Professor<select id="lp">${o.personais.map((x) => `<option value="${x.id}">${esc(x.nome)}</option>`).join('')}</select></label><div class="dialog-actions"><button class="btn primary" id="ls">Vincular</button></div></div></div>`;
  const [ls, la, lp] = ['ls', 'la', 'lp'].map($);
  if (alunoId) $('la').value = String(alunoId);
  ls.disabled = !o.alunos.length || !o.personais.length;
  ls.onclick = async () => {
    try {
      await api('/relationships', {
        method: 'POST',
        body: JSON.stringify({ aluno_id: +la.value, personal_id: +lp.value }),
      });
      closeModal();
      toast('Vínculo atualizado.');
      await relationships();
    } catch (e) {
      toast(e.message);
    }
  };
}
async function unlink(id) {
  if (!confirm('Desvincular este aluno do professor?')) return;
  await api('/relationships/' + id, { method: 'DELETE' });
  toast('Vínculo desativado.');
  await relationships();
}

function avatar(role, size = '') {
  if (role === 'admin') return `<div class="avatar ${size}" aria-label="Administrador">AD</div>`;
  const src = role === 'personal' ? 'professor-demo.jpg' : 'aluno-demo.jpg';
  return `<img class="person-avatar ${size}" src="assets/${src}" alt="Avatar ilustrativo gerado por IA" title="Imagem ilustrativa gerada por IA">`;
}
const information = [
  [
    'Agenda semanal',
    'Saiba o que foi previsto para cada dia.',
    'O professor escolhe os dias do treino. O aluno consulta a semana e abre o plano com os exercícios.',
    '▦',
  ],
  [
    'Orientações por exercício',
    'Uma prescrição fácil de consultar.',
    'Confira séries, repetições, tempo de descanso e observações. O professor também pode indicar um vídeo.',
    '≡',
  ],
  [
    'Histórico de atividades',
    'Cada dia mantém seu registro.',
    'Conclua exercícios e consulte os dias com atividade. Desmarcar uma execução de hoje não apaga os dias anteriores.',
    '✓',
  ],
  [
    'Cargas registradas',
    'Compare seus próprios registros.',
    'Informe opcionalmente a carga em kg usada no exercício e consulte o histórico. O professor também pode acompanhar.',
    '↗',
  ],
];
document.addEventListener('click', async (event) => {
  const dismiss = event.target.closest('[data-dismiss]');
  if (dismiss && event.target === dismiss) {
    closeModal();
    return;
  }
  const button = event.target.closest('[data-action]');
  if (!button) return;
  const d = button.dataset;
  try {
    if (d.action === 'landing') return landingView();
    if (d.action === 'login') return loginView();
    if (d.action === 'register') {
      if (d.plan) preferredBillingPlan = d.plan;
      closeModal();
      return registerView();
    }
    if (d.action === 'close') return closeModal();
    if (d.action === 'info') return infoModal(...information[Number(d.info)]);
    if (d.action === 'navigate') return shell(session(), d.page);
    if (d.action === 'retry') return shell(session(), currentPage);
    if (d.action === 'new-workout') return workoutModal(Number(d.id), d.name);
    if (d.action === 'remove-exercise') return button.closest('.exercise-editor').remove();
    if (d.action === 'edit-workout') return await editWorkout(Number(d.id));
    if (d.action === 'archive-workout') return await archiveWorkout(Number(d.id));
    if (d.action === 'open-workout') return await openStudentWorkout(Number(d.id));
    if (d.action === 'complete') {
      button.disabled = true;
      try {
        return await toggleComplete(Number(d.id), Number(d.workout), Number(d.done));
      } finally {
        if (button.isConnected) button.disabled = false;
      }
    }
    if (d.action === 'new-user') return newUserModal();
    if (d.action === 'status') return await toggleUser(Number(d.id), Number(d.active));
    if (d.action === 'new-link') return linkModal(Number(d.student) || null);
    if (d.action === 'open-day') {
      selectedWorkoutDay = d.day === 'all' ? 'all' : Number(d.day);
      return shell(session(), 'treinos');
    }
    if (d.action === 'rest') return startRest(Number(d.seconds), button);
    if (d.action === 'unlink') return await unlink(Number(d.id));
  } catch (error) {
    toast(error.message);
  }
});
// Dialog semantics, keyboard dismissal, focus trapping and focus restoration.
new MutationObserver(() => {
  const dialog = modalRoot.querySelector('.dialog,.auth-dialog');
  if (!dialog) return;
  dialog.setAttribute('role', 'dialog');
  dialog.setAttribute('aria-modal', 'true');
  dialog.setAttribute('aria-label', dialog.querySelector('h2')?.textContent || 'Janela FTECH');
  if (!dialog.dataset.focusReady) {
    dialog.dataset.focusReady = '1';
    modalReturnFocus = document.activeElement;
    dialog.querySelector('input,select,button,a[href]')?.focus();
  }
}).observe(modalRoot, { childList: true });
document.addEventListener('keydown', (event) => {
  const dialog = modalRoot.querySelector('[role="dialog"]');
  if (!dialog) return;
  if (event.key === 'Escape') {
    event.preventDefault();
    closeModal();
  }
  if (event.key === 'Tab') {
    const items = [
      ...dialog.querySelectorAll(
        'button:not(:disabled),input:not(:disabled),select,textarea,a[href]'
      ),
    ].filter((e) => e.getClientRects().length);
    const first = items[0],
      last = items.at(-1);
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first?.focus();
    }
  }
});

const u = session();
u && localStorage.getItem('fithtech_token') ? resumeAccount(u) : landingView();
