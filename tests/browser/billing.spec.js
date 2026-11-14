const { test, expect } = require('@playwright/test');
for (const width of [390, 1440]) {
  test(
    'cadastro, confirmação de senha, plano anual, cupom e liberação a ' + width + 'px',
    async ({ page }) => {
      await page.setViewportSize({ width, height: 960 });
      const errors = [];
      page.on('pageerror', (error) => errors.push(error.message));
      await page.goto('/');
      await page.locator('.hero-actions [data-action="register"]').click();
      await page.locator('#rn').fill("Visitante D'Ávila");
      await page.locator('#re').fill('new-' + Date.now() + '-' + width + '@example.com');
      await page.locator('#rp').fill('Apresentacao!123');
      await page.locator('#rconfirm').fill('NaoCoincide!123');
      expect(await page.locator('#rconfirm').evaluate((input) => input.checkValidity())).toBe(
        false
      );
      await page.locator('#rconfirm').fill('Apresentacao!123');
      await page.locator('#show-registration-password').click();
      await expect(page.locator('#rp')).toHaveAttribute('type', 'text');
      await page.locator('#show-registration-password').click();
      await expect(page.locator('#rp')).toHaveAttribute('type', 'password');
      await page.locator('#regButton').click();
      await expect(page.locator('.checkout-page')).toBeVisible();
      await expect(page.locator('.simulation-banner')).toContainText('Não há cobrança real');
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true
      );
      const token = await page.evaluate(() => localStorage.getItem('fithtech_token'));
      const blocked = await page.request.get('/api/workouts/mine', {
        headers: { Authorization: 'Bearer ' + token },
      });
      expect(blocked.status()).toBe(402);
      await page.locator('[data-select-plan="anual"]').click();
      await expect(page.locator('.summary-total')).toContainText('299,00');
      await page.locator('.coupon-box summary').click();
      await page.locator('#coupon-code').fill('PARCERIA10');
      await page.locator('#apply-coupon').click();
      await expect(page.locator('#coupon-message')).toContainText('Cupom aplicado');
      await expect(page.locator('.summary-total')).toContainText('269,10');
      await page.locator('[name="payment-method"][value="cartao"]').check();
      expect(
        await page.locator('input[autocomplete="cc-number"],input[autocomplete="cc-csc"]').count()
      ).toBe(0);
      await expect(page.locator('#pay-simulation')).toBeDisabled();
      await page.locator('#simulation-consent').check();
      await page.locator('#pay-simulation').click();
      await expect(page.getByRole('heading', { name: 'Seu acesso está liberado.' })).toBeVisible();
      await expect(page.locator('.payment-success')).toContainText('269,10');
      await page.getByRole('button', { name: 'Acessar meu painel' }).click();
      await expect(page.locator('.layout')).toBeVisible();
      await expect(page.locator('.onboarding')).toBeVisible();
      await expect(page.locator('.onboarding')).toContainText('administrador');
      await page.locator('aside [data-page="assinatura"]').click();
      await expect(page.locator('#page')).toContainText('Plano anual');
      await expect(page.locator('#page')).toContainText('269,10');
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true
      );
      expect(errors).toEqual([]);
    }
  );
}
test('mensal sem cupom e Pix de demonstração libera acesso', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await page.locator('.hero-actions [data-action="register"]').click();
  await page.locator('#rn').fill('Professor de teste');
  await page.locator('#re').fill('pix-' + Date.now() + '@example.com');
  await page.locator('#rr').selectOption('personal');
  await page.locator('#rp').fill('Professor!123');
  await page.locator('#rconfirm').fill('Professor!123');
  await page.locator('#regButton').click();
  await expect(page.locator('.checkout-page')).toBeVisible();
  await expect(page.locator('.summary-total')).toContainText('29,90');
  await page.locator('#simulation-consent').check();
  await page.locator('#pay-simulation').click();
  await page.locator('[data-action="enter-paid"]').click();
  await expect(page.locator('.layout')).toBeVisible();
  await expect(page.locator('#page')).toContainText('Seu primeiro aluno começa pelo vínculo.');
  expect(errors).toEqual([]);
});
test('sair e entrar antes de pagar mantém o bloqueio e retoma o checkout', async ({ page }) => {
  const email = 'pending-' + Date.now() + '@example.com';
  await page.goto('/');
  await page.locator('.hero-actions [data-action="register"]').click();
  await page.locator('#rn').fill('Conta pendente');
  await page.locator('#re').fill(email);
  await page.locator('#rp').fill('Pendente!123');
  await page.locator('#rconfirm').fill('Pendente!123');
  await page.locator('#regButton').click();
  await expect(page.locator('.checkout-page')).toBeVisible();
  await page.locator('[data-action="billing-logout"]').click();
  await page.locator('.public-header [data-action="login"]').click();
  await page.locator('#email').fill(email);
  await page.locator('#password').fill('Pendente!123');
  await page.locator('#loginButton').click();
  await expect(page.locator('.checkout-page')).toBeVisible();
  await expect(page.locator('.layout')).toHaveCount(0);
  await page.reload();
  await expect(page.locator('.checkout-page')).toBeVisible();
});
