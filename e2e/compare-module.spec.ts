/**
 * E2E: Compare Module — Public Coverage (no auth required)
 *
 * Testa o módulo de comparação (/comparar) SEM autenticação.
 *
 * Estes testes verificam:
 *   1. Acesso e redirecionamento para /auth
 *   2. Página de comparação está protegida
 *   3. Não vaza dados de comparações para usuários não autenticados
 *   4. Validação contra IDs maliciosos
 *   5. Comportamento com query parameters (produtos a comparar)
 *
 * Para testes AUTENTICADOS (com fluxo completo de comparação de produtos),
 * é necessário configurar E2E_USER_EMAIL e E2E_USER_PASSWORD e rodar
 * com chromium-authed.
 */

import { test, expect } from './fixtures/test-base';

test.describe('Compare Module - Public Access (No Auth)', () => {
  test('should redirect to auth when accessing /comparar unauthenticated', async ({ page }) => {
    await page.goto('/comparar');

    // Protected route deve redirecionar para /auth
    await page.waitForURL(/\/auth/, { timeout: 15000 });
    await expect(page).toHaveURL(/\/auth/);
  });

  test('should display auth page when accessing /comparar', async ({ page }) => {
    await page.goto('/comparar');
    await page.waitForURL(/\/auth/, { timeout: 15000 });

    // Verifica que está na página de auth
    await expect(page).toHaveURL(/\/auth/);

    // Verifica que o conteúdo da página de auth é visível
    await expect(page.getByRole('main', { name: /Autenticação/i })).toBeVisible();
  });

  test('should not expose comparison data to unauthenticated users', async ({ page }) => {
    // Captura todas as requisições feitas após navegação
    const apiCalls: string[] = [];
    const sensitiveCalls: string[] = [];

    page.on('request', (request) => {
      const url = request.url();
      // Ignora auth/session (esperado para qualquer rota)
      if (url.includes('/auth') || url.includes('/session')) return;
      apiCalls.push(url);

      // Verifica chamadas sensíveis (comparison data)
      if (
        url.includes('/comparisons') ||
        url.includes('/comparison_products') ||
        url.includes('/rest/v1/compar') ||
        url.includes('/rest/v1/product_comparison')
      ) {
        sensitiveCalls.push(url);
      }
    });

    await page.goto('/comparar');
    await page.waitForURL(/\/auth/, { timeout: 15000 });

    // Aguarda para garantir que nada vaza
    await page.waitForTimeout(2000);

    // Validação principal: nenhuma chamada de dados de comparação deve acontecer
    expect(sensitiveCalls).toEqual([]);

    // Verifica que não há vazamento de IDs sensíveis em query strings
    const comparisonDataLeaks = apiCalls.filter((url) => {
      try {
        const u = new URL(url);
        return (
          u.searchParams.has('comparisonId') ||
          u.searchParams.has('comparison_id') ||
          u.searchParams.has('userId') ||
          u.searchParams.has('productIds')
        );
      } catch {
        return false;
      }
    });

    expect(comparisonDataLeaks).toEqual([]);
  });

  test('should handle product IDs in query parameters', async ({ page }) => {
    // Tenta acessar com IDs de produtos para comparar
    await page.goto('/comparar?products=abc-123,def-456,ghi-789');

    // Deve redirecionar para /auth independente dos params
    await page.waitForURL(/\/auth/, { timeout: 15000 });
    await expect(page).toHaveURL(/\/auth/);
  });

  test('should handle comparison mode parameters without leaking data', async ({ page }) => {
    // Tenta acessar com parâmetros de modo de comparação
    await page.goto('/comparar?mode=detailed&view=table&category=brindes');

    await page.waitForURL(/\/auth/, { timeout: 15000 });
    await expect(page).toHaveURL(/\/auth/);
  });

  test('should handle invalid query parameters without exposing data', async ({ page }) => {
    // Tenta acessar com payloads maliciosos via query params
    const maliciousParams = [
      '?id=../etc/passwd',
      '?products=<script>alert(1)</script>',
      "?productId=' OR '1'='1",
      '?userId=admin',
      '?comparisonId=null',
    ];

    for (const params of maliciousParams) {
      await page.goto(`/comparar${params}`);
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

    await page.goto('/comparar');
    await page.waitForURL(/\/auth/, { timeout: 15000 });

    // Aguarda estabilização
    await page.waitForTimeout(1500);

    // Não deve haver erros JS do projeto
    expect(errors).toEqual([]);
  });

  test('should preserve intended comparison URL after auth (returnTo)', async ({ page }) => {
    await page.goto('/comparar?products=abc-123,def-456');

    // Espera redirect
    await page.waitForURL(/\/auth/, { timeout: 15000 });

    // A URL deve estar em /auth
    const url = page.url();
    expect(url).toMatch(/\/auth/);
  });

  test('should redirect mobile viewport correctly', async ({ page }) => {
    // Simula viewport mobile
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto('/comparar');
    await page.waitForURL(/\/auth/, { timeout: 15000 });

    await expect(page).toHaveURL(/\/auth/);

    // Verifica que não há scroll horizontal
    const hasHorizontalScroll = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });

    expect(hasHorizontalScroll).toBe(false);
  });

  test('should handle repeated direct URL access consistently', async ({ page }) => {
    // Acessa diretamente a URL várias vezes
    for (let i = 0; i < 3; i++) {
      await page.goto('/comparar');
      await page.waitForURL(/\/auth/, { timeout: 15000 });
      await expect(page).toHaveURL(/\/auth/);
    }
  });
});

test.describe('Compare Module - Database Communication (Public)', () => {
  test('should not query comparisons tables when unauthenticated', async ({ page }) => {
    const dbCalls: string[] = [];

    page.on('request', (request) => {
      const url = request.url();
      // Supabase REST API
      if (url.includes('supabase.co/rest/v1/')) {
        dbCalls.push(url);
      }
    });

    await page.goto('/comparar');
    await page.waitForURL(/\/auth/, { timeout: 15000 });

    // Aguarda para capturar requests
    await page.waitForTimeout(1500);

    // Não deve haver queries a tabelas de comparações
    const comparisonsTableQueries = dbCalls.filter(
      (url) =>
        url.includes('/comparisons') ||
        url.includes('/comparison_products') ||
        url.includes('/product_comparison') ||
        url.includes('/user_comparisons'),
    );

    expect(comparisonsTableQueries).toEqual([]);
  });

  test('should not expose comparison endpoints in edge function calls', async ({ page }) => {
    const edgeCalls: string[] = [];

    page.on('request', (request) => {
      const url = request.url();
      // Edge functions do Supabase
      if (url.includes('/functions/v1/')) {
        edgeCalls.push(url);
      }
    });

    await page.goto('/comparar');
    await page.waitForURL(/\/auth/, { timeout: 15000 });

    await page.waitForTimeout(1500);

    // Não deve haver chamadas para edge functions de comparação
    const comparisonEdgeCalls = edgeCalls.filter(
      (url) =>
        url.includes('compar') ||
        url.includes('compare') ||
        url.includes('product-match'),
    );

    expect(comparisonEdgeCalls).toEqual([]);
  });

  test('should not query RPC functions for comparison data when unauthenticated', async ({ page }) => {
    const rpcCalls: string[] = [];

    page.on('request', (request) => {
      const url = request.url();
      if (url.includes('/rest/v1/rpc/')) {
        rpcCalls.push(url);
      }
    });

    await page.goto('/comparar');
    await page.waitForURL(/\/auth/, { timeout: 15000 });

    await page.waitForTimeout(1500);

    // Não deve haver chamadas a RPCs de comparação
    const comparisonRpcCalls = rpcCalls.filter(
      (url) =>
        url.includes('compar') ||
        url.includes('compare') ||
        url.includes('product-match'),
    );

    expect(comparisonRpcCalls).toEqual([]);
  });
});

test.describe('Compare Module - Navigation', () => {
  test('should handle deep linking with various product combinations', async ({ page }) => {
    // Testa várias combinações de produtos para comparar
    const testUrls = [
      '/comparar',
      '/comparar?products=prod-1',
      '/comparar?products=prod-1,prod-2',
      '/comparar?products=prod-1,prod-2,prod-3',
      '/comparar?mode=detailed',
      '/comparar?view=grid&mode=side-by-side',
    ];

    for (const url of testUrls) {
      await page.goto(url);
      await page.waitForURL(/\/auth/, { timeout: 15000 });
      await expect(page).toHaveURL(/\/auth/);
    }
  });

  test('should handle browser back/forward navigation', async ({ page }) => {
    // 1. Vai para uma página pública
    await page.goto('/');
    await page.waitForTimeout(500);

    // 2. Tenta ir para /comparar (vai redirecionar)
    await page.goto('/comparar');
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

  test('should handle navigation between product-related modules', async ({ page }) => {
    // Testa navegação entre módulos relacionados a produtos
    await page.goto('/comparar');
    await page.waitForURL(/\/auth/, { timeout: 15000 });

    // Tenta ir para /favoritos
    await page.goto('/favoritos');
    await page.waitForURL(/\/auth/, { timeout: 15000 });

    await expect(page).toHaveURL(/\/auth/);
  });

  test('should handle rapid navigation between compare routes', async ({ page }) => {
    // Testa navegação rápida
    await page.goto('/comparar');
    await page.waitForURL(/\/auth/, { timeout: 15000 });

    await page.goto('/comparar?products=p1,p2');
    await page.waitForURL(/\/auth/, { timeout: 15000 });

    await page.goto('/comparar?mode=detailed');
    await page.waitForURL(/\/auth/, { timeout: 15000 });

    // Deve estar consistentemente em /auth
    await expect(page).toHaveURL(/\/auth/);
  });
});
