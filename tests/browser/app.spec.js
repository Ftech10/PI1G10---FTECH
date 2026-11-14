const { test, expect } = require('@playwright/test');
const password = process.env.DEMO_PASSWORD;
test.beforeEach(async ({ page }) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error' && !message.text().includes('503 (Service Unavailable)'))
      errors.push(message.text());
  });
  page.errors = errors;
});
test.afterEach(async ({ page }) => {
  expect(page.errors).toEqual([]);
});
async function login(page, email) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await page.locator('#email').fill(email);
  await page.locator('#password').fill(password);
  await page.getByRole('button', { name: 'Entrar no FTECH' }).click();
  await expect(page.locator('.layout')).toBeVisible();
  await expect(page.locator('.loader')).toHaveCount(0);
}
for (const width of [390, 1440]) {
  test('página pública e modais a ' + width + 'px', async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Cada pessoa tem seu papel.' })).toBeVisible();
    await expect(page.locator('#public-pricing .price-card')).toHaveCount(2);
    await expect(page.locator('#public-pricing')).toContainText('299,00');
    await page.locator('.community').scrollIntoViewIfNeeded();
    for (const image of await page.locator('.community img').all()) {
      await image.scrollIntoViewIfNeeded();
      await expect
        .poll(() => image.evaluate((img) => img.complete && img.naturalWidth > 0))
        .toBe(true);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true
    );
    await page.locator('.public-header [data-action="login"]').click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await page.locator('.sport-card').first().click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.getByRole('dialog').getByRole('button', { name: 'Começar agora' }).click();
    await expect(page.locator('#reg')).toBeVisible();
    await page.keyboard.press('Escape');
  });
}
test('aluno: navegação, conclusão, histórico, perfil e logout', async ({ page }) => {
  test.skip(!password, 'Defina DEMO_PASSWORD e prepare um banco de demonstração isolado.');
  await login(page, 'aluno@fithtech.com');
  for (const route of ['treinos', 'progresso', 'personal', 'perfil']) {
    await page.locator(`aside [data-page="${route}"]`).click();
    await expect(page.locator('.loader')).toHaveCount(0);
  }
  await expect(page.locator('.profile-identity img')).toBeVisible();
  await page.locator('aside [data-page="treinos"]').click();
  await page.getByRole('button', { name: 'Abrir treino' }).first().click();
  const first = page.locator('[data-action="complete"]').first();
  await first.click();
  await expect(page.locator('[data-action="complete"]').first()).toHaveText('✓ Feito hoje');
  await page.locator('[data-action="complete"]').first().click();
  await expect(page.locator('[data-action="complete"]').first()).toHaveText('Concluir hoje');
  await page.keyboard.press('Escape');
  await page.locator('#logout').click();
  await expect(page.locator('.landing')).toBeVisible();
  await expect(page.locator('.toast').last()).toHaveText('Você saiu da sua conta.');
});
test('professor: aluno com apóstrofo, criação, edição e arquivamento de treino', async ({
  page,
}) => {
  test.skip(!password, 'Defina DEMO_PASSWORD e prepare um banco de demonstração isolado.');
  await login(page, 'personal@fithtech.com');
  await page.locator('aside [data-page="alunos"]').click();
  await page.getByRole('button', { name: '+ Criar treino' }).first().click();
  await expect(page.getByRole('dialog')).toContainText("Lucas D'Ávila");
  await page.locator('#wn').fill('Treino do navegador');
  await page.locator('#wf').fill('Condicionamento');
  await page.locator('[data-f="nome"]').fill('Remada');
  await page.locator('#saveW').click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.locator('aside [data-page="treinos"]').click();
  const card = page.locator('.workout').filter({ hasText: 'Treino do navegador' });
  await card.getByRole('button', { name: 'Editar', exact: true }).click();
  await page.locator('#wn').fill('Treino revisado');
  await page.locator('#saveW').click();
  await expect(page.locator('.workout').filter({ hasText: 'Treino revisado' })).toBeVisible();
  page.once('dialog', (dialog) => dialog.accept());
  await page
    .locator('.workout')
    .filter({ hasText: 'Treino revisado' })
    .getByRole('button', { name: 'Arquivar' })
    .click();
  await expect(page.locator('.workout').filter({ hasText: 'Treino revisado' })).toHaveCount(0);
  await page.locator('aside [data-page="evolucao"]').click();
  await expect(page.locator('.loader')).toHaveCount(0);
});
test('administrador: cadastro, status e vínculos', async ({ page }) => {
  test.skip(!password, 'Defina DEMO_PASSWORD e prepare um banco de demonstração isolado.');
  await login(page, 'admin@fithtech.com');
  await page.locator('aside [data-page="usuarios"]').click();
  await page.getByRole('button', { name: '+ Novo usuário' }).click();
  const browserStudent = 'Aluno navegador ' + Date.now();
  await page.locator('#an').fill(browserStudent);
  await page.locator('#ae').fill('browser-' + Date.now() + '@example.com');
  await page.locator('#ap').fill('SenhaTeste!123');
  await page.locator('#as').click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  const row = page.locator('.tr').filter({ hasText: browserStudent });
  await row.getByRole('button', { name: 'Desativar', exact: true }).click();
  await expect(row).toContainText('Inativo');
  await page.locator('aside [data-page="vinculos"]').click();
  await expect(page.locator('.loader')).toHaveCount(0);
  await page.getByRole('button', { name: '+ Novo vínculo' }).click();
  await expect(page.locator('#la')).toBeVisible();
  await page.keyboard.press('Escape');
});
test('falha da API mostra erro e permite tentar novamente', async ({ page }) => {
  test.skip(!password, 'Defina DEMO_PASSWORD e prepare um banco de demonstração isolado.');
  await login(page, 'aluno@fithtech.com');
  const handler = (route) =>
    route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'Serviço temporariamente indisponível.' }),
    });
  await page.route('**/api/stats/dashboard', handler);
  await page.locator('aside [data-page="inicio"]').click();
  await expect(page.getByRole('heading', { name: 'Não foi possível carregar' })).toBeVisible();
  await page.unroute('**/api/stats/dashboard', handler);
  await page.getByRole('button', { name: 'Tentar novamente' }).click();
  await expect(page.locator('.progress-ring')).toBeVisible();
  page.errors = page.errors.filter((error) => !error.includes('503 (Service Unavailable)'));
});
test('navegação rápida não deixa resposta antiga substituir a página atual', async ({ page }) => {
  test.skip(!password, 'Defina DEMO_PASSWORD e prepare um banco de demonstração isolado.');
  await login(page, 'aluno@fithtech.com');
  let release, finished;
  const gate = new Promise((resolve) => (release = resolve));
  const done = new Promise((resolve) => (finished = resolve));
  await page.route('**/api/stats/dashboard', async (route) => {
    const response = await route.fetch();
    await gate;
    await route.fulfill({ response });
    finished();
  });
  await page.locator('aside [data-page="inicio"]').click();
  await page.locator('aside [data-page="perfil"]').click();
  await expect(page.locator('#pf')).toBeVisible();
  release();
  await done;
  await expect(page.locator('#pf')).toBeVisible();
  await expect(page.locator('.progress-ring')).toHaveCount(0);
});
for (const [email, routes] of [
  ['aluno@fithtech.com', ['inicio', 'treinos', 'progresso', 'personal', 'perfil']],
  ['personal@fithtech.com', ['inicio', 'alunos', 'treinos', 'evolucao', 'perfil']],
  ['admin@fithtech.com', ['inicio', 'usuarios', 'vinculos', 'perfil']],
]) {
  test('painéis sem rolagem horizontal em celular: ' + email, async ({ page }) => {
    test.skip(!password, 'Defina DEMO_PASSWORD e prepare um banco de demonstração isolado.');
    await page.setViewportSize({ width: 390, height: 844 });
    await login(page, email);
    for (const route of routes) {
      await page.locator(`aside [data-page="${route}"]`).click();
      await expect(page.locator('.loader')).toHaveCount(0);
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
        'Overflow em ' + route
      ).toBe(true);
    }
  });
}
