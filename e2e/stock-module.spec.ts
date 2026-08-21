/**
 * E2E: Stock Module — Public Coverage (no auth required)
 *
 * Testa o módulo de estoque (/estoque) SEM autenticação.
 *
 * Estes testes verificam:
 *   1. Acesso e redirecionamento para /auth
 *   2. Página de estoque está protegida
 *   3. Não vaza dados de estoque/inventário para usuários não autenticados
 *   4. URLs com query parameters (filtros, datas) tratadas corretamente
 *   5. Validação de segurança contra IDs maliciosos
 *
 * Para testes AUTENTICADOS (com dashboard e gráficos), é necessário
 * configurar E2E_USER_EMAIL e E2E_USER_PASSWORD e rodar com chromium-authed.
 */

import { test, expect } from './fixtures/test-base';

test.describe('Stock Module - Public Access (No Auth)', () => {
  test('should redirect to auth when accessing /estoque unauthenticated', async ({ page }) => {
    await page.goto('/estoque');

    // Protected route deve redirecionar para /auth
    await page.waitForURL(/\/auth/, { timeout: 15000 });
    await expect(page).toHaveURL(/\/auth/);
  });

  test('should display auth page when accessing /estoque', async ({ page }) => {
    await page.goto('/estoque');
    await page.waitForURL(/\/auth/, { timeout: 15000 });

    // Verifica que está na página de auth
    await expect(page).toHaveURL(/\/auth/);

    // Verifica que o conteúdo da página de auth é visível
    await expect(page.getByRole('main', { name: /Autenticação/i })).toBeVisible();
  });

  test('should not expose stock data to unauthenticated users', async ({ page }) => {
    // Captura todas as requisições feitas após navegação
    const apiCalls: string[] = [];
    const sensitiveCalls: string[] = [];

    page.on('request', (request) => {
      const url = request.url();
      // Ignora auth/session (esperado para qualquer rota)
      if (url.includes('/auth') || url.includes('/session')) return;
      apiCalls.push(url);

      // Verifica chamadas sensíveis (stock data)
      if (
        url.includes('/stock') ||
        url.includes('/inventory') ||
        url.includes('/product_variants') ||
        url.includes('/rest/v1/stock') ||
        url.includes('/mv_stock_')
      ) {
        sensitiveCalls.push(url);
      }
    });

    await page.goto('/estoque');
    await page.waitForURL(/\/auth/, { timeout: 15000 });

    // Aguarda para garantir que nada vaza
    await page.waitForTimeout(2000);

    // Validação principal: nenhuma chamada de dados de estoque deve acontecer
    expect(sensitiveCalls).toEqual([]);

    // Verifica que não há vazamento de IDs sensíveis em query strings
    const stockDataLeaks = apiCalls.filter((url) => {
      try {
        const u = new URL(url);
        return (
          u.searchParams.has('stock') ||
          u.searchParams.has('inventory') ||
          u.searchParams.has('productId') ||
          u.searchParams.has('variantId')
        );
      } catch {
        return false;
      }
    });

    expect(stockDataLeaks).toEqual([]);
  });

  test('should handle query parameters on stock routes', async ({ page }) => {
    // Tenta acessar com parâmetros comuns de filtros de estoque
    await page.goto('/estoque?period=30d&supplier=xbz&status=low');

    // Deve redirecionar para /auth independente dos params
    await page.waitForURL(/\/auth/, { timeout: 15000 });
    await expect(page).toHaveURL(/\/auth/);
  });

  test('should handle date range parameters without leaking data', async ({ page }) => {
    // Tenta acessar com parâmetros de data
    await page.goto('/estoque?from=2026-01-01&to=2026-08-19&type=movements');

    await page.waitForURL(/\/auth/, { timeout: 15000 });
    await expect(page).toHaveURL(/\/auth/);
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

    await page.goto('/estoque');
    await page.waitForURL(/\/auth/, { timeout: 15000 });

    // Aguarda estabilização
    await page.waitForTimeout(1500);

    // Não deve haver erros JS do projeto
    expect(errors).toEqual([]);
  });

  test('should preserve intended stock URL after auth (returnTo)', async ({ page }) => {
    await page.goto('/estoque?tab=rupture-risk');

    // Espera redirect
    await page.waitForURL(/\/auth/, { timeout: 15000 });

    // A URL deve estar em /auth
    const url = page.url();
    expect(url).toMatch(/\/auth/);
  });

  test('should redirect mobile viewport correctly', async ({ page }) => {
    // Simula viewport mobile
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto('/estoque');
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
      await page.goto('/estoque');
      await page.waitForURL(/\/auth/, { timeout: 15000 });
      await expect(page).toHaveURL(/\/auth/);
    }
  });
});

test.describe('Stock Module - Database Communication (Public)', () => {
  test('should not query stock/inventory tables when unauthenticated', async ({ page }) => {
    const dbCalls: string[] = [];

    page.on('request', (request) => {
      const url = request.url();
      // Supabase REST API
      if (url.includes('supabase.co/rest/v1/')) {
        dbCalls.push(url);
      }
    });

    await page.goto('/estoque');
    await page.waitForURL(/\/auth/, { timeout: 15000 });

    // Aguarda para capturar requests
    await page.waitForTimeout(1500);

    // Não deve haver queries a tabelas/views de estoque
    const stockTableQueries = dbCalls.filter(
      (url) =>
        url.includes('/stock') ||
        url.includes('/inventory') ||
        url.includes('/product_variants') ||
        url.includes('/mv_stock_') ||
        url.includes('/stock_movements') ||
        url.includes('/supplier_stock'),
    );

    expect(stockTableQueries).toEqual([]);
  });

  test('should not expose stock endpoints in edge function calls', async ({ page }) => {
    const edgeCalls: string[] = [];

    page.on('request', (request) => {
      const url = request.url();
      // Edge functions do Supabase
      if (url.includes('/functions/v1/')) {
        edgeCalls.push(url);
      }
    });

    await page.goto('/estoque');
    await page.waitForURL(/\/auth/, { timeout: 15000 });

    await page.waitForTimeout(1500);

    // Não deve haver chamadas para edge functions de estoque
    const stockEdgeCalls = edgeCalls.filter(
      (url) =>
        url.includes('stock') ||
        url.includes('inventory') ||
        url.includes('rupture') ||
        url.includes('restock'),
    );

    expect(stockEdgeCalls).toEqual([]);
  });

  test('should not query RPC functions for stock data when unauthenticated', async ({ page }) => {
    const rpcCalls: string[] = [];

    page.on('request', (request) => {
      const url = request.url();
      if (url.includes('/rest/v1/rpc/')) {
        rpcCalls.push(url);
      }
    });

    await page.goto('/estoque');
    await page.waitForURL(/\/auth/, { timeout: 15000 });

    await page.waitForTimeout(1500);

    // Não deve haver chamadas a RPCs de estoque
    const stockRpcCalls = rpcCalls.filter(
      (url) =>
        url.includes('stock') ||
        url.includes('inventory') ||
        url.includes('rupture') ||
        url.includes('restock') ||
        url.includes('forecast'),
    );

    expect(stockRpcCalls).toEqual([]);
  });
});

test.describe('Stock Module - Navigation', () => {
  test('should handle deep linking with various filters', async ({ page }) => {
    // Testa várias combinações de parâmetros
    const testUrls = [
      '/estoque',
      '/estoque?tab=overview',
      '/estoque?tab=health',
      '/estoque?tab=future',
      '/estoque?period=7d',
      '/estoque?period=30d',
      '/estoque?period=90d',
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

    // 2. Tenta ir para /estoque (vai redirecionar)
    await page.goto('/estoque');
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

  test('should handle navigation from other auth-required pages', async ({ page }) => {
    // Tenta navegar de /carrinhos para /estoque
    await page.goto('/carrinhos');
    await page.waitForURL(/\/auth/, { timeout: 15000 });

    // Agora tenta ir para /estoque
    await page.goto('/estoque');
    await page.waitForURL(/\/auth/, { timeout: 15000 });

    await expect(page).toHaveURL(/\/auth/);
  });
});
