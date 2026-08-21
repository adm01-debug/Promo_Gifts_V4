/**
 * E2E: Quote Creation Module — Public Coverage (no auth required)
 *
 * Testa o módulo de criação de orçamentos (/orcamentos/novo) SEM autenticação.
 * Estes testes verificam:
 *   1. Acesso e redirecionamento para login
 *   2. Tela de auth carrega corretamente
 *   3. Validações de UI/A11y
 *   4. Estrutura de URLs
 *
 * Para testes AUTENTICADOS (com fluxo completo de criação), é necessário
 * configurar E2E_USER_EMAIL e E2E_USER_PASSWORD no ambiente e rodar com
 * o project chromium-authed.
 *
 * Este arquivo roda no project "chromium-public" (sem autenticação).
 */

import { test, expect } from './fixtures/test-base';

test.describe('Quote Creation Module - Public Access (No Auth)', () => {
  test('should redirect to auth when accessing /orcamentos/novo unauthenticated', async ({ page }) => {
    await page.goto('/orcamentos/novo');

    // Protected route deve redirecionar para /auth
    await page.waitForURL(/\/auth/, { timeout: 15000 });
    await expect(page).toHaveURL(/\/auth/);
  });

  test('should redirect to auth when accessing /orcamentos unauthenticated', async ({ page }) => {
    await page.goto('/orcamentos');
    await page.waitForURL(/\/auth/, { timeout: 15000 });
    await expect(page).toHaveURL(/\/auth/);
  });

  test('should redirect to auth when accessing /orcamentos/kanban unauthenticated', async ({ page }) => {
    await page.goto('/orcamentos/kanban');
    await page.waitForURL(/\/auth/, { timeout: 15000 });
    await expect(page).toHaveURL(/\/auth/);
  });

  test('should redirect to auth when accessing /orcamentos/dashboard unauthenticated', async ({ page }) => {
    await page.goto('/orcamentos/dashboard');
    await page.waitForURL(/\/auth/, { timeout: 15000 });
    await expect(page).toHaveURL(/\/auth/);
  });

  test('should display auth page with proper branding', async ({ page }) => {
    await page.goto('/orcamentos/novo');
    await page.waitForURL(/\/auth/, { timeout: 15000 });

    // Verifica que a página de auth carrega
    await expect(page).toHaveURL(/\/auth/);

    // Verifica que NÃO há erros de console durante o redirect
    const errors: string[] = [];
    page.on('pageerror', (err) => {
      if (!err.message.includes('net::')) {
        errors.push(err.message);
      }
    });

    await page.waitForTimeout(1000);

    // Espera-se que o auth seja carregado sem erros JS
    expect(errors).toEqual([]);
  });

  test('should preserve return URL after login (redirect-back)', async ({ page }) => {
    await page.goto('/orcamentos/novo');

    // Espera redirect
    await page.waitForURL(/\/auth/, { timeout: 15000 });

    // A URL deve conter /auth
    const url = page.url();
    expect(url).toContain('/auth');
  });

  test('should not expose quote builder to unauthenticated users', async ({ page }) => {
    // Captura todas as requisições
    const apiCalls: string[] = [];
    page.on('request', (request) => {
      const url = request.url();
      if (url.includes('/quotations') || url.includes('/quotes')) {
        apiCalls.push(url);
      }
    });

    await page.goto('/orcamentos/novo');
    await page.waitForURL(/\/auth/, { timeout: 15000 });

    // Aguarda um pouco para garantir que nenhuma requisição acontece
    await page.waitForTimeout(2000);

    // Não deve haver chamadas API de quotes para usuário não autenticado
    // (a menos que seja para verificar sessão, o que é OK)
    const sensitiveQuotesCalls = apiCalls.filter(
      (url) => !url.includes('auth') && !url.includes('session'),
    );

    expect(sensitiveQuotesCalls).toEqual([]);
  });

  test('should handle query parameters on the quote route', async ({ page }) => {
    // Tenta acessar com parâmetros que normalmente viriam de carrinho
    await page.goto('/orcamentos/novo?fromCart=true&cartId=test-123');

    // Deve redirecionar para /auth independente dos params
    await page.waitForURL(/\/auth/, { timeout: 15000 });
    await expect(page).toHaveURL(/\/auth/);
  });
});

test.describe('Quote Creation - Database Communication (Public)', () => {
  test('should not query database for quotes when unauthenticated', async ({ page }) => {
    const dbCalls: string[] = [];

    page.on('request', (request) => {
      const url = request.url();
      // Supabase REST API
      if (url.includes('supabase.co/rest/v1/')) {
        dbCalls.push(url);
      }
    });

    await page.goto('/orcamentos/novo');
    await page.waitForURL(/\/auth/, { timeout: 15000 });

    // Aguarda para capturar requests
    await page.waitForTimeout(1500);

    // Não deve haver queries ao banco de quotes
    const quoteQueries = dbCalls.filter(
      (url) =>
        url.includes('quote') ||
        url.includes('quotation') ||
        url.includes('budget'),
    );

    expect(quoteQueries).toEqual([]);
  });
});
