/* Apresentação independente. Não substitui o app.js da V6. */
(() => {
  'use strict';
  const seenKey = 'ftech_sports_welcome_v61';
  let dismissed = false;
  let scheduled = false;
  function hasSession() {
    try {
      return typeof window.session === 'function' && window.session() !== null;
    } catch {
      return false;
    }
  }
  function openWelcome(force = false) {
    if (document.querySelector('dialog.sports-welcome')) return;
    let seen = dismissed;
    try {
      seen = seen || sessionStorage.getItem(seenKey) === 'seen';
    } catch {}
    if (!force && seen) return;
    const original = document
      .getElementById('ftech-welcome-template')
      ?.content.querySelector('dialog');
    if (!original) return;
    const dialog = original.cloneNode(true);
    const previousFocus = document.activeElement;
    const login = dialog.querySelector('[data-welcome-login]');
    if (hasSession()) login.textContent = 'Continuar no FTECH';
    document.body.append(dialog);
    let finished = false;
    function finish() {
      if (finished) return;
      finished = true;
      dismissed = true;
      try {
        sessionStorage.setItem(seenKey, 'seen');
      } catch {}
      dialog.remove();
      if (previousFocus?.isConnected && previousFocus !== document.body) previousFocus.focus();
      else
        document
          .querySelector('.public-header [data-action="login"]')
          ?.focus({ preventScroll: true });
    }
    function dismiss() {
      dialog.close();
      finish();
    }
    dialog.addEventListener('close', finish, { once: true });
    dialog.addEventListener('cancel', (event) => {
      event.preventDefault();
      dismiss();
    });
    dialog
      .querySelectorAll('[data-welcome-close]')
      .forEach((button) => button.addEventListener('click', dismiss));
    login.addEventListener('click', () => {
      dismiss();
      if (!hasSession() && typeof window.loginView === 'function') window.loginView();
    });
    dialog.addEventListener('click', (event) => {
      const rect = dialog.getBoundingClientRect();
      if (
        event.target === dialog &&
        (event.clientX < rect.left ||
          event.clientX > rect.right ||
          event.clientY < rect.top ||
          event.clientY > rect.bottom)
      )
        dismiss();
    });
    dialog.showModal();
    dialog.querySelector('[data-welcome-close]').focus({ preventScroll: true });
  }
  function enhance() {
    scheduled = false;
    const root = document.getElementById('app');
    if (!root) return;
    const hero = root.querySelector('.landing-hero');
    if (hero && !hero.dataset.sportsEnhanced) {
      hero.dataset.sportsEnhanced = 'true';
      const title = hero.querySelector('h1');
      if (title) {
        const emphasis = document.createElement('em');
        emphasis.textContent = 'Entre no jogo.';
        title.replaceChildren(
          document.createTextNode('Prepare seu treino.'),
          document.createElement('br'),
          emphasis
        );
      }
      const eyebrow = hero.querySelector('.eyebrow');
      if (eyebrow) eyebrow.textContent = 'FUTEBOL. FORÇA. CONSTÂNCIA.';
      const description = hero.querySelector('.hero-copy > p');
      if (description)
        description.textContent =
          'Do campo ao treino intenso, organize sua semana com o professor e acompanhe cada atividade registrada.';
      const image = hero.querySelector('.hero-media > img');
      if (image) {
        image.src = 'assets/banner-futebol-treino.webp';
        image.alt =
          'Arte gerada por IA com futebol e treino com cordas em uma composição esportiva.';
        image.width = 1672;
        image.height = 941;
      }
      const replay = document.createElement('button');
      replay.type = 'button';
      replay.className = 'sports-replay';
      replay.dataset.action = 'show-welcome';
      replay.textContent = 'Ver apresentação de abertura';
      hero.querySelector('.hero-actions')?.append(replay);
      const example = hero.querySelector('.hero-example');
      if (example) {
        const kicker = example.querySelector('small');
        if (kicker) kicker.textContent = 'PLANEJE. TREINE. REGISTRE.';
        const label = example.querySelector('b');
        if (label) label.textContent = 'Sua rotina em um só lugar.';
        const mark = example.querySelector('div > span');
        if (mark) mark.textContent = 'FTECH';
        const copy = example.querySelector('p');
        if (copy)
          copy.textContent = 'Consulte o plano, siga as orientações e mantenha seus registros.';
      }
    }
    const texts = new Map([
      ['O que vamos treinar hoje?', 'Seu treino de hoje.'],
      ['Uma semana de cada vez.', 'Sua semana, organizada.'],
      ['Veja o caminho que você registrou.', 'Sua rotina ao longo do tempo.'],
      ['Conecte quem orienta a quem treina.', 'Alunos e professores, conectados.'],
      ['Uma rotina começa com um plano.', 'Seu primeiro treino começa por aqui.'],
    ]);
    root.querySelectorAll('h2').forEach((heading) => {
      const text = texts.get(heading.textContent.trim());
      if (text) heading.textContent = text;
    });
  }
  function init() {
    enhance();
    const root = document.getElementById('app');
    if (root)
      new MutationObserver(() => {
        if (scheduled) return;
        scheduled = true;
        requestAnimationFrame(enhance);
      }).observe(root, { childList: true, subtree: true });
    document.addEventListener('click', (event) => {
      if (event.target.closest('[data-action="show-welcome"]')) openWelcome(true);
    });
    openWelcome();
  }
  if (document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
