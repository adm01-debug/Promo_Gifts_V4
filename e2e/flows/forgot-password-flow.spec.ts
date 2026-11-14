import { test, expect } from '@playwright/test';
import { gotoAndSettle } from '../helpers/nav';

// RPC mockada abaixo: nada é gravado, então o e-mail não precisa de prefixo de cleanup.
const RECOVERY_EMAIL = 'test-recovery@example.com';

test.describe('Forgot Password Flow', () => {
  test('fluxo completo de recuperação de senha até confirmação', async ({ page }) => {
    await gotoAndSettle(page, '/login');
    
    // Abre o formulário de esqueci senha
    await page.locator('[data-testid="login-forgot-link"]').click();
    await expect(page.locator('[data-testid="forgot-password-screen"]')).toBeVisible();

    // Preenche o email
    await page.locator('#forgot-email').fill(RECOVERY_EMAIL);
    
    // Mock da RPC request_password_reset (RETURNS void → PostgREST responde 204 sem corpo)
    await page.route('**/rest/v1/rpc/request_password_reset*', async route => {
      await route.fulfill({ status: 204, body: '' });
    });

    // Envia solicitação
    await page.locator('button[type="submit"]').click();

    // Deve redirecionar para a página de confirmação
    await page.waitForURL(/\/forgot-password-confirmation/);
    
    // Verifica conteúdo da página de confirmação
    await expect(page.locator('h1')).toHaveText(/Solicitação em Análise/i);
    await expect(page.locator('text=Aprovação Manual')).toBeVisible();
    await expect(page.locator('text=E-mail de Redefinição')).toBeVisible();
  });
});
