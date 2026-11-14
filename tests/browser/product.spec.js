const { test, expect } = require('@playwright/test');
const password = process.env.DEMO_PASSWORD;
async function login(page, email) {
  await page.goto('/');
  await page.locator('.public-header [data-action="login"]').click();
  await page.locator('#email').fill(email);
  await page.locator('#password').fill(password);
  await page.locator('#loginButton').click();
  await expect(page.locator('.layout')).toBeVisible();
  await expect(page.locator('.loader')).toHaveCount(0);
}
test('agenda permite filtrar dias, consultar instruções, registrar carga e ver o histórico', async ({
  page,
}) => {
  test.skip(!password, 'Defina DEMO_PASSWORD e use banco exclusivo de demonstração.');
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await login(page, 'aluno@fithtech.com');
  await expect(page.locator('.week-strip')).toBeVisible();
  await page.locator('.week-day').first().click();
  await expect(page.locator('.plan-section-title').first()).toContainText('Segunda-feira');
  await page.locator('[data-action="open-workout"]').first().click();
  await expect(page.locator('.trainer-guidance').first()).toBeVisible();
  await page.locator('[data-action="rest"]').first().click();
  await expect(page.locator('.rest-status').first()).toContainText('Descanso:');
  const load = page.locator('input[id^="load-"]').first();
  await load.fill('25.5');
  await page.locator('[data-action="complete"]').first().click();
  await expect(page.locator('input[id^="load-"]').first()).toBeDisabled();
  await expect(page.locator('input[id^="load-"]').first()).toHaveValue('25.5');
  await page.keyboard.press('Escape');
  await page.locator('aside [data-page="progresso"]').click();
  await expect(page.locator('.load-history select')).toBeVisible();
  await expect(page.locator('.load-history')).toContainText('25,5 kg');
  await page.locator('aside [data-page="treinos"]').click();
  await page.locator('[data-action="open-workout"]').first().click();
  await page.locator('[data-action="complete"]').first().click();
  await page.keyboard.press('Escape');
  expect(errors).toEqual([]);
});
test('professor salva dias, descanso e observações com confirmação persistida', async ({
  page,
}) => {
  test.skip(!password, 'Defina DEMO_PASSWORD e use banco exclusivo de demonstração.');
  await login(page, 'personal@fithtech.com');
  await page.locator('aside [data-page="alunos"]').click();
  await page.locator('[data-action="new-workout"]').first().click();
  await page.locator('#wn').fill('Agenda pelo navegador');
  await page.locator('#wf').fill('Força de demonstração');
  await page.locator('[data-workout-day][value="1"]').check();
  await page.locator('[data-workout-day][value="4"]').check();
  await expect(page.locator('#wd')).toHaveValue('2');
  await expect(page.locator('#wd')).toBeDisabled();
  await page.locator('[data-f="nome"]').fill('Exercício de demonstração');
  await page.locator('[data-f="descanso_seg"]').fill('75');
  await page
    .locator('[data-f="observacoes"]')
    .fill('Orientação de demonstração com atenção ao movimento.');
  await page.locator('#saveW').click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.locator('aside [data-page="treinos"]').click();
  let card = page.locator('.workout').filter({ hasText: 'Agenda pelo navegador' });
  await expect(card).toContainText('Seg · Qui');
  await card.getByRole('button', { name: 'Editar', exact: true }).click();
  await expect(page.locator('[data-workout-day][value="1"]')).toBeChecked();
  await expect(page.locator('[data-f="descanso_seg"]')).toHaveValue('75');
  await expect(page.locator('[data-f="observacoes"]')).toHaveValue(
    'Orientação de demonstração com atenção ao movimento.'
  );
  await page.keyboard.press('Escape');
  page.once('dialog', (dialog) => dialog.accept());
  await card.getByRole('button', { name: 'Arquivar' }).click();
  await expect(card).toHaveCount(0);
});
