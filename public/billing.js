let preferredBillingPlan = 'mensal';
function money(cents) {
  return (Number(cents) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
function planCards(plans, selected = null) {
  return `<div class="pricing-grid">${plans.map((plan) => `<article class="price-card ${plan.id === 'anual' ? 'recommended' : ''} ${selected === plan.id ? 'chosen' : ''}">${plan.id === 'anual' ? '<span class="price-badge">Economize R$ 59,80 no ano</span>' : '<span class="price-badge subtle">Um mês de cada vez</span>'}<span class="eyebrow">PLANO ${esc(plan.nome).toUpperCase()}</span><h3>${money(plan.preco_centavos)}<small>/${plan.id === 'anual' ? 'ano' : 'mês'}</small></h3><p>${plan.id === 'anual' ? `Em vez de ${money(plan.referencia_centavos)} por 12 meses. Aproximadamente ${money(Math.round(plan.preco_centavos / 12))}/mês, em um pagamento anual.` : 'Um mês de acesso para organizar sua rotina. Sem renovação automática nesta demonstração.'}</p><ul><li>Agenda semanal de treinos</li><li>Orientações, descanso e registro de cargas</li><li>Histórico para aluno e professor</li></ul>${selected !== null ? `<button class="btn ${selected === plan.id ? 'primary' : 'ghost'} wide" data-select-plan="${plan.id}" type="button" aria-pressed="${selected === plan.id}">${selected === plan.id ? 'Plano selecionado' : 'Escolher ' + esc(plan.nome.toLowerCase())}</button>` : `<button class="btn ${plan.id === 'anual' ? 'primary' : 'ghost'} wide" data-action="register" data-plan="${plan.id}">Escolher ${esc(plan.nome.toLowerCase())}</button>`}</article>`).join('')}</div>`;
}
async function loadPublicPlans() {
  const root = document.querySelector('#public-pricing');
  if (!root) return;
  try {
    const data = await api('/billing/plans');
    if (root.isConnected)
      root.innerHTML =
        planCards(data.planos) +
        '<p class="pricing-note">Valores demonstrativos. Nenhuma cobrança real é realizada. As funcionalidades são as mesmas nos dois planos.</p>';
  } catch {
    if (root.isConnected)
      root.innerHTML = '<p class="muted">Os planos serão exibidos ao criar sua conta.</p>';
  }
}
async function enterAccount(user) {
  const status = await api('/billing/status');
  if (status.ativo) return shell(user, 'inicio');
  return checkoutView(user, status);
}
async function resumeAccount(user) {
  app.innerHTML = '<div class="loader">Verificando seu acesso...</div>';
  try {
    await enterAccount(user);
  } catch (error) {
    if (session()) {
      app.innerHTML = emptyState(
        'Não foi possível verificar seu acesso.',
        'Tente novamente para consultar sua assinatura.',
        '<button class="btn primary" data-action="resume-access">Tentar novamente</button><button class="btn ghost" data-action="billing-logout">Sair</button>'
      );
    }
  }
}
async function checkoutView(user, providedStatus = null) {
  closeModal();
  const status = providedStatus || (await api('/billing/status'));
  const plans = status.planos;
  let selected = preferredBillingPlan,
    coupon = '',
    quote = null,
    orderId = null,
    requestVersion = 0;
  app.innerHTML = `<div class="checkout-page"><header class="checkout-header"><img src="assets/ftech_logo.png" alt="FTECH"><div class="checkout-nav">${status.ativo ? '<button class="btn ghost small" data-action="enter-paid">Voltar ao painel</button>' : ''}<button class="btn ghost small" data-action="billing-logout">Sair da conta</button></div></header><main class="checkout-main"><div class="simulation-banner"><b>Pagamento de demonstração</b><span>Não há cobrança real. Não informe dados bancários ou de cartão.</span></div><ol class="checkout-steps"><li class="done">1 · Conta criada</li><li class="active">2 · Escolha seu plano</li><li>3 · Acesso liberado</li></ol><div class="landing-heading"><span class="eyebrow">OLÁ, ${esc(user.name.split(' ')[0])}</span><h1>Seu próximo passo é escolher um plano.</h1><p>Mensal ou anual: o mesmo FTECH para organizar seus treinos. O acesso é liberado após a confirmação simulada.</p></div><div id="checkout-plans"></div><div class="checkout-bottom"><section><details class="coupon-box"><summary>Tem um cupom de parceria?</summary><label>Cupom<input id="coupon-code" maxlength="40" autocomplete="off" placeholder="Digite seu cupom"></label><div class="coupon-actions"><button class="btn ghost small" id="apply-coupon" type="button">Aplicar cupom</button><button class="btn ghost small" id="remove-coupon" type="button">Remover</button></div><p class="muted">Parceria fictícia para a apresentação: use <b>PARCERIA10</b> para mais 10% de desconto sobre o plano escolhido.</p><p id="coupon-message" role="status"></p></details><fieldset class="payment-methods"><legend>Como deseja simular o pagamento?</legend><label><input type="radio" name="payment-method" value="pix" checked><span><b>Pix de demonstração</b><small>Sem código Pix e sem transferência.</small></span></label><label><input type="radio" name="payment-method" value="cartao"><span><b>Cartão de demonstração</b><small>Sem solicitar número, validade ou código de segurança.</small></span></label></fieldset></section><section class="panel order-summary"><span class="eyebrow">RESUMO DA SIMULAÇÃO</span><h2>Seu plano</h2><div id="quote-summary" aria-live="polite"></div><label class="simulation-consent"><input id="simulation-consent" type="checkbox"><span>Entendi que esta confirmação é fictícia e não realiza cobrança.</span></label><p id="checkout-error" class="form-error" role="alert"></p><button class="btn primary wide" id="pay-simulation" disabled>Simular pagamento e liberar acesso</button><small class="muted">Nenhuma renovação automática. Você poderá consultar o período de acesso na aba Assinatura.</small></section></div></main></div>`;
  const root = app.querySelector('.checkout-page');
  const renderPlans = () => {
    root.querySelector('#checkout-plans').innerHTML = planCards(plans, selected);
    root.querySelectorAll('[data-select-plan]').forEach(
      (button) =>
        (button.onclick = async () => {
          selected = button.dataset.selectPlan;
          preferredBillingPlan = selected;
          orderId = null;
          renderPlans();
          await updateQuote();
        })
    );
  };
  const updateQuote = async () => {
    const version = ++requestVersion;
    quote = null;
    root.querySelector('#pay-simulation').disabled = true;
    try {
      const result = await api('/billing/quote', {
        method: 'POST',
        body: JSON.stringify({ plano: selected, cupom: coupon }),
      });
      if (!root.isConnected || version !== requestVersion) return;
      quote = result;
      root.querySelector('#quote-summary').innerHTML =
        `<div class="summary-line"><span>Plano ${esc(result.nome)}</span><b>${money(result.subtotal_centavos)}</b></div>${result.desconto_anual ? `<p class="muted">Economia de ${money(result.economia_centavos)} em relação a 12 mensalidades.</p>` : ''}${result.cupom ? `<div class="summary-line discount"><span>Cupom ${esc(result.cupom)} · 10%</span><b>− ${money(result.desconto_centavos)}</b></div>` : ''}<div class="summary-total"><span>Total ${selected === 'anual' ? 'anual' : 'mensal'}</span><strong>${money(result.total_centavos)}</strong></div><p class="muted">${result.meses} ${result.meses === 1 ? 'mês' : 'meses'} de acesso após a confirmação simulada.</p>`;
      root.querySelector('#pay-simulation').disabled =
        !root.querySelector('#simulation-consent').checked;
    } catch (error) {
      if (root.isConnected) root.querySelector('#checkout-error').textContent = error.message;
    }
  };
  root.querySelector('#apply-coupon').onclick = async () => {
    const code = root.querySelector('#coupon-code').value;
    const message = root.querySelector('#coupon-message');
    try {
      await api('/billing/quote', {
        method: 'POST',
        body: JSON.stringify({ plano: selected, cupom: code }),
      });
      if (!root.isConnected) return;
      coupon = code.trim().toUpperCase();
      orderId = null;
      message.textContent = coupon
        ? 'Cupom aplicado: 10% adicionais sobre o plano escolhido.'
        : 'Nenhum cupom informado.';
      await updateQuote();
    } catch (error) {
      if (root.isConnected) message.textContent = error.message;
    }
  };
  root.querySelector('#remove-coupon').onclick = async () => {
    coupon = '';
    orderId = null;
    root.querySelector('#coupon-code').value = '';
    root.querySelector('#coupon-message').textContent = 'Cupom removido.';
    await updateQuote();
  };
  root.querySelector('#simulation-consent').onchange = () =>
    (root.querySelector('#pay-simulation').disabled =
      !quote || !root.querySelector('#simulation-consent').checked);
  root.querySelector('#pay-simulation').onclick = async () => {
    const button = root.querySelector('#pay-simulation');
    if (button.disabled || !quote || !root.querySelector('#simulation-consent').checked) return;
    button.disabled = true;
    button.textContent = 'Confirmando simulação...';
    root.querySelector('#checkout-error').textContent = '';
    root
      .querySelectorAll('[data-select-plan],#apply-coupon,#remove-coupon')
      .forEach((el) => (el.disabled = true));
    try {
      if (!orderId) {
        const created = await api('/billing/checkout', {
          method: 'POST',
          body: JSON.stringify({ plano: selected, cupom: coupon }),
        });
        orderId = created.id;
      }
      const paid = await api('/billing/checkout/' + orderId + '/pay', {
        method: 'POST',
        body: JSON.stringify({
          metodo: root.querySelector('[name="payment-method"]:checked').value,
        }),
      });
      if (!root.isConnected) return;
      const a = paid.assinatura;
      app.innerHTML = `<main class="payment-success"><div class="success-icon" aria-hidden="true">✓</div><span class="eyebrow">COMPROVANTE DE SIMULAÇÃO</span><h1>Seu acesso está liberado.</h1><p>Nenhuma cobrança real foi feita. Agora você pode completar seu perfil e organizar seu acompanhamento.</p><section class="panel"><div class="summary-line"><span>Plano</span><b>${a.plano === 'anual' ? 'Anual' : 'Mensal'}</b></div><div class="summary-line"><span>Valor demonstrativo</span><b>${money(a.total_centavos)}</b></div><div class="summary-line"><span>Acesso até</span><b>${new Date(a.valido_ate).toLocaleDateString('pt-BR')}</b></div><small>Referência de demonstração: ${esc(a.id)}</small></section><button class="btn primary wide" data-action="enter-paid">Acessar meu painel</button></main>`;
    } catch (error) {
      if (root.isConnected) {
        root.querySelector('#checkout-error').textContent = error.message;
        button.disabled = false;
        button.textContent = 'Tentar confirmação novamente';
        root
          .querySelectorAll('[data-select-plan],#apply-coupon,#remove-coupon')
          .forEach((el) => (el.disabled = false));
      }
    }
  };
  renderPlans();
  await updateQuote();
}
async function subscriptionView(user) {
  const target = document.querySelector('#page');
  const status = await api('/billing/status');
  if (!target.isConnected) return;
  const a = status.assinatura;
  target.innerHTML = `<div class="daily-heading"><div><span class="eyebrow">MINHA ASSINATURA</span><h2>Seu acesso ao FTECH.</h2><p>Todos os pagamentos desta versão são simulados, sem cobrança real.</p></div></div><section class="panel"><span class="pill">${status.ativo ? 'Acesso liberado' : 'Aguardando confirmação'}</span><h2>${a ? 'Plano ' + (a.plano === 'anual' ? 'anual' : 'mensal') : status.acesso_legado ? 'Acesso preservado da versão anterior' : 'Escolha seu plano'}</h2><p>${a ? 'Válido até ' + new Date(a.valido_ate).toLocaleDateString('pt-BR') + '. Valor demonstrativo: ' + money(a.total_centavos) + '.' : status.acesso_legado ? 'Sua conta anterior foi preservada durante a atualização.' : 'Conclua a simulação para liberar seu painel.'}</p><button class="btn primary" data-action="billing-checkout">${status.ativo ? 'Simular novo período' : 'Escolher plano'}</button><p class="muted">Um novo período pago é acrescentado ao acesso restante. Não há renovação automática.</p></section>${status.historico.length ? `<section class="panel"><h2>Histórico de simulações</h2>${status.historico.map((item) => `<div class="action-row"><div><b>${item.plano === 'anual' ? 'Anual' : 'Mensal'}</b><p>${new Date(item.pago_em).toLocaleDateString('pt-BR')} · ${item.metodo === 'cartao' ? 'Cartão de teste' : item.metodo === 'demo' ? 'Dados de demonstração' : 'Pix de teste'}</p></div><strong>${money(item.total_centavos)}</strong></div>`).join('')}</section>` : ''}`;
}
document.addEventListener('click', async (event) => {
  const button = event.target.closest('[data-action]');
  if (!button) return;
  try {
    if (button.dataset.action === 'billing-logout') return logout();
    if (button.dataset.action === 'resume-access' || button.dataset.action === 'enter-paid')
      return await resumeAccount(session());
    if (button.dataset.action === 'billing-checkout') return await checkoutView(session());
  } catch (error) {
    toast(error.message);
  }
});
