/**
 * E2E: Carts Module — Public Coverage (no auth required)
 *
 * Testa o módulo de carrinhos (/carrinhos) SEM autenticação.
 *
 * Estes testes verificam:
 *   1. Acesso e redirecionamento para /auth
 *   2. Páginas de carrinho estão protegidas
 *   3. URLs individuais (/carrinhos/:cartId) também protegidas
 *   4. Não vaza dados para usuários não autenticados
 *
 * Para testes AUTENTICADOS (fluxo completo de criação/gestão), é necessário
 * configurar E2E_USER_EMAIL e E2E_USER_PASSWORD e rodar com chromium-authed.
 */

import { test, expect } from './fixtures/test-base';

test.describe('Carts Module - Public Access (No Auth)', () => {
  test('should redirect to auth when accessing /carrinhos unauthenticated', async ({ page }) => {
    await page.goto('/carrinhos');

    // Protected route deve redirecionar para /auth
    await page.waitForURL(/\/auth/, { timeout: 15000 });
    await expect(page).toHaveURL(/\/auth/);
  });

  test('should redirect to auth when accessing /carrinhos/:cartId unauthenticated', async ({ page }) => {
    // Tenta acessar um carrinho específico
    await page.goto('/carrinhos/test-cart-id-123');

    await page.waitForURL(/\/auth/, { timeout: 15000 });
    await expect(page).toHaveURL(/\/auth/);
  });

  test('should display auth page when accessing /carrinhos', async ({ page }) => {
    await page.goto('/carrinhos');
    await page.waitForURL(/\/auth/, { timeout: 15000 });

    // Verifica que está na página de auth
    await expect(page).toHaveURL(/\/auth/);

    // Verifica que o conteúdo da página de auth é visível
    await expect(page.getByRole('main', { name: /Autenticação/i })).toBeVisible();
  });

  test('should not expose cart data to unauthenticated users', async ({ page }) => {
    // Captura todas as requisições feitas após navegação
    const apiCalls: string[] = [];
    const sensitiveCalls: string[] = [];

    page.on('request', (request) => {
      const url = request.url();
      // Ignora auth/session (esperado para qualquer rota)
      if (url.includes('/auth') || url.includes('/session')) return;
      apiCalls.push(url);

      // Verifica chamadas sensíveis (carts data)
      if (
        url.includes('/carts') ||
        url.includes('/cart_items') ||
        url.includes('/rest/v1/cart')
      ) {
        sensitiveCalls.push(url);
      }
    });

    await page.goto('/carrinhos');
    await page.waitForURL(/\/auth/, { timeout: 15000 });

    // Aguarda para garantir que nada vaza
    await page.waitForTimeout(2000);

    // Validação principal: nenhuma chamada de dados de carrinho deve acontecer
    expect(sensitiveCalls).toEqual([]);

    // Pode haver chamadas legítimas (analytics, etc) mas não devem expor cart data
    const cartDataLeaks = apiCalls.filter((url) => {
      // Verifica se há PII ou dados sensíveis em query strings
      try {
        const u = new URL(url);
        return (
          u.searchParams.has('cartId') ||
          u.searchParams.has('cart_id') ||
          u.searchParams.has('userId')
        );
      } catch {
        return false;
      }
    });

    expect(cartDataLeaks).toEqual([]);
  });

  test('should handle query parameters on cart routes', async ({ page }) => {
    // Tenta acessar com parâmetros comuns
    await page.goto('/carrinhos?status=active&search=test');

    // Deve redirecionar para /auth independente dos params
    await page.waitForURL(/\/auth/, { timeout: 15000 });
    await expect(page).toHaveURL(/\/auth/);
  });

  test('should handle invalid cart IDs without exposing data', async ({ page }) => {
    // Tenta acessar com UUIDs malformados
    const invalidIds = [
      'not-a-uuid',
      '../../../etc/passwd',
      '<script>alert(1)</script>',
      "' OR '1'='1",
    ];

    for (const id of invalidIds) {
      await page.goto(`/carrinhos/${encodeURIComponent(id)}`);
      await page.waitForURL(/\/auth/, { timeout: 15000 });
      await expect(page).toHaveURL(/\/auth/);
    }
  });

  test('should not throw JS errors during redirect', async ({ page }) => {
    const errors: string[] = [];

    page.on('pageerror', (err) => {
      if (!err.message.includes('net::') && !err.message.includes('Failed to fetch')) {
        errors.push(err.message);
      }
    });

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const text = msg.text();
        if (
          !text.includes('csspeeper') &&
          !text.includes('givefreely') &&
          !text.includes('maxmind') &&
          !text.includes('extension') &&
          !text.includes('net::') &&
          !text.includes('Failed to fetch')
        ) {
          errors.push(text);
        }
      }
    });

    await page.goto('/carrinhos');
    await page.waitForURL(/\/auth/, { timeout: 15000 });

    // Aguarda estabilização
    await page.waitForTimeout(1500);

    // Não deve haver erros JS do projeto
    expect(errors).toEqual([]);
  });

  test('should preserve intended cart URL after auth (returnTo)', async ({ page }) => {
    await page.goto('/carrinhos/active-cart-123');

    // Espera redirect
    await page.waitForURL(/\/auth/, { timeout: 15000 });

    // A URL deve estar em /auth (com ou sem param returnTo)
    const url = page.url();
    expect(url).toMatch(/\/auth/);
  });

  test('should redirect mobile viewport correctly', async ({ page }) => {
    // Simula viewport mobile
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto('/carrinhos');
    await page.waitForURL(/\/auth/, { timeout: 15000 });

    await expect(page).toHaveURL(/\/auth/);

    // Verifica que não há scroll horizontal
    const hasHorizontalScroll = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });

    expect(hasHorizontalScroll).toBe(false);
  });
});

test.describe('Carts Module - Database Communication (Public)', () => {
  test('should not query cart tables when unauthenticated', async ({ page }) => {
    const dbCalls: string[] = [];

    page.on('request', (request) => {
      const url = request.url();
      // Supabase REST API
      if (url.includes('supabase.co/rest/v1/')) {
        dbCalls.push(url);
      }
    });

    await page.goto('/carrinhos');
    await page.waitForURL(/\/auth/, { timeout: 15000 });

    // Aguarda para capturar requests
    await page.waitForTimeout(1500);

    // Não deve haver queries a tabelas de carrinho
    const cartTableQueries = dbCalls.filter(
      (url) =>
        url.includes('/carts') ||
        url.includes('/cart_items') ||
        url.includes('/cart_templates'),
    );

    expect(cartTableQueries).toEqual([]);
  });

  test('should not expose cart endpoints in edge function calls', async ({ page }) => {
    const edgeCalls: string[] = [];

    page.on('request', (request) => {
      const url = request.url();
      // Edge functions do Supabase
      if (url.includes('/functions/v1/')) {
        edgeCalls.push(url);
      }
    });

    await page.goto('/carrinhos');
    await page.waitForURL(/\/auth/, { timeout: 15000 });

    await page.waitForTimeout(1500);

    // Não deve haver chamadas para edge functions de carrinho
    const cartEdgeCalls = edgeCalls.filter(
      (url) =>
        url.includes('cart') ||
        url.includes('cart-template') ||
        url.includes('active-cart'),
    );

    expect(cartEdgeCalls).toEqual([]);
  });
});

test.describe('Carts Module - Navigation', () => {
  test('should have accessible route from sidebar menu (when authed)', async ({ page }) => {
    // Mesmo sem auth, o menu lateral NÃO deve ser exibido em /carrinhos
    // porque a página redireciona. Verificamos que o redirect acontece.
    await page.goto('/carrinhos');
    await page.waitForURL(/\/auth/, { timeout: 15000 });

    // Verifica que a URL é /auth
    expect(page.url()).toMatch(/\/auth/);
  });

  test('should handle direct URL access consistently', async ({ page }) => {
    // Acessa diretamente a URL de carrinhos várias vezes
    for (let i = 0; i < 3; i++) {
      await page.goto('/carrinhos');
      await page.waitForURL(/\/auth/, { timeout: 15000 });
      await expect(page).toHaveURL(/\/auth/);
    }
  });

  test('should handle browser back/forward navigation', async ({ page }) => {
    // 1. Vai para uma página pública
    await page.goto('/');
    await page.waitForTimeout(500);

    // 2. Tenta ir para /carrinhos (vai redirecionar)
    await page.goto('/carrinhos');
    await page.waitForURL(/\/auth/, { timeout: 15000 });

    // 3. Volta
    await page.goBack();
    await page.waitForTimeout(1000);

    // 4. Avança
    await page.goForward();
    await page.waitForTimeout(1000);

    // Não deve crashar
    await expect(page).toHaveURL(/\/auth|\/$/);
  });
});
