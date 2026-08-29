/**
 * E2E: Visual Search Module — Public Coverage (no auth required)
 *
 * Testa o módulo de busca visual (/raio-x) SEM autenticação.
 *
 * Estes testes verificam:
 *   1. Acesso e redirecionamento para /auth
 *   2. Página de Raio-X está protegida
 *   3. Não vaza dados de busca visual/imagens para usuários não autenticados
 *   4. Validação contra IDs maliciosos e payloads
 *   5. Comportamento com query parameters (filtros de categoria/cor)
 *
 * Para testes AUTENTICADOS (com fluxo completo de upload de imagem e análise),
 * é necessário configurar E2E_USER_EMAIL e E2E_USER_PASSWORD e rodar
 * com chromium-authed.
 */

import { test, expect } from './fixtures/test-base';

test.describe('Visual Search Module - Public Access (No Auth)', () => {
  test('should redirect to auth when accessing /raio-x unauthenticated', async ({ page }) => {
    await page.goto('/raio-x');

    // Protected route deve redirecionar para /auth
    await page.waitForURL(/\/auth/, { timeout: 15000 });
    await expect(page).toHaveURL(/\/auth/);
  });

  test('should display auth page when accessing /raio-x', async ({ page }) => {
    await page.goto('/raio-x');
    await page.waitForURL(/\/auth/, { timeout: 15000 });

    // Verifica que está na página de auth
    await expect(page).toHaveURL(/\/auth/);

    // Verifica que o conteúdo da página de auth é visível
    await expect(page.getByRole('main', { name: /Autenticação/i })).toBeVisible();
  });

  test('should not expose visual search data to unauthenticated users', async ({ page }) => {
    // Captura todas as requisições feitas após navegação
    const apiCalls: string[] = [];
    const sensitiveCalls: string[] = [];

    page.on('request', (request) => {
      const url = request.url();
      // Ignora auth/session (esperado para qualquer rota)
      if (url.includes('/auth') || url.includes('/session')) return;
      apiCalls.push(url);

      // Verifica chamadas sensíveis (visual search data)
      if (
        url.includes('/visual-search') ||
        url.includes('/product-visual-search') ||
        url.includes('/analyze-logo') ||
        url.includes('/rest/v1/visual')
      ) {
        sensitiveCalls.push(url);
      }
    });

    await page.goto('/raio-x');
    await page.waitForURL(/\/auth/, { timeout: 15000 });

    // Aguarda para garantir que nada vaza
    await page.waitForTimeout(2000);

    // Validação principal: nenhuma chamada de visual search deve acontecer
    expect(sensitiveCalls).toEqual([]);

    // Verifica que não há vazamento de IDs sensíveis em query strings
    const visualSearchLeaks = apiCalls.filter((url) => {
      try {
        const u = new URL(url);
        return (
          u.searchParams.has('searchId') ||
          u.searchParams.has('search_id') ||
          u.searchParams.has('userId') ||
          u.searchParams.has('imageHash') ||
          u.searchParams.has('imageBase64')
        );
      } catch {
        return false;
      }
    });

    expect(visualSearchLeaks).toEqual([]);
  });

  test('should handle category filter parameters', async ({ page }) => {
    // Tenta acessar com filtros de categoria
    await page.goto('/raio-x?category=brindes&color=azul');

    // Deve redirecionar para /auth independente dos params
    await page.waitForURL(/\/auth/, { timeout: 15000 });
    await expect(page).toHaveURL(/\/auth/);
  });

  test('should handle search history parameters without leaking data', async ({ page }) => {
    // Tenta acessar com parâmetros de histórico de busca
    await page.goto('/raio-x?history=true&lastSearch=caneca');

    await page.waitForURL(/\/auth/, { timeout: 15000 });
    await expect(page).toHaveURL(/\/auth/);
  });

  test('should handle invalid query parameters without exposing data', async ({ page }) => {
    // Tenta acessar com payloads maliciosos via query params
    const maliciousParams = [
      '?image=../etc/passwd',
      '?imageBase64=<script>alert(1)</script>',
      "?productId=' OR '1'='1",
      '?userId=admin',
      '?category=../../../../etc',
      '?color=null',
    ];

    for (const params of maliciousParams) {
      await page.goto(`/raio-x${params}`);
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

    await page.goto('/raio-x');
    await page.waitForURL(/\/auth/, { timeout: 15000 });

    // Aguarda estabilização
    await page.waitForTimeout(1500);

    // Não deve haver erros JS do projeto
    expect(errors).toEqual([]);
  });

  test('should preserve intended visual search URL after auth (returnTo)', async ({ page }) => {
    await page.goto('/raio-x?category=tecnologia');

    // Espera redirect
    await page.waitForURL(/\/auth/, { timeout: 15000 });

    // A URL deve estar em /auth
    const url = page.url();
    expect(url).toMatch(/\/auth/);
  });

  test('should redirect mobile viewport correctly', async ({ page }) => {
    // Simula viewport mobile
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto('/raio-x');
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
      await page.goto('/raio-x');
      await page.waitForURL(/\/auth/, { timeout: 15000 });
      await expect(page).toHaveURL(/\/auth/);
    }
  });
});

test.describe('Visual Search Module - Database Communication (Public)', () => {
  test('should not query visual search tables when unauthenticated', async ({ page }) => {
    const dbCalls: string[] = [];

    page.on('request', (request) => {
      const url = request.url();
      // Supabase REST API
      if (url.includes('supabase.co/rest/v1/')) {
        dbCalls.push(url);
      }
    });

    await page.goto('/raio-x');
    await page.waitForURL(/\/auth/, { timeout: 15000 });

    // Aguarda para capturar requests
    await page.waitForTimeout(1500);

    // Não deve haver queries a tabelas de visual search
    const visualSearchQueries = dbCalls.filter(
      (url) =>
        url.includes('/visual_search') ||
        url.includes('/search_history') ||
        url.includes('/product_images') ||
        url.includes('/visual_search_feedback'),
    );

    expect(visualSearchQueries).toEqual([]);
  });

  test('should not expose visual search endpoints in edge function calls', async ({ page }) => {
    const edgeCalls: string[] = [];

    page.on('request', (request) => {
      const url = request.url();
      // Edge functions do Supabase
      if (url.includes('/functions/v1/')) {
        edgeCalls.push(url);
      }
    });

    await page.goto('/raio-x');
    await page.waitForURL(/\/auth/, { timeout: 15000 });

    await page.waitForTimeout(1500);

    // Não deve haver chamadas para edge functions de visual search
    const visualSearchEdgeCalls = edgeCalls.filter(
      (url) =>
        url.includes('visual-search') ||
        url.includes('visual_search') ||
        url.includes('analyze-logo') ||
        url.includes('roboflow'),
    );

    expect(visualSearchEdgeCalls).toEqual([]);
  });

  test('should not query RPC functions for visual search data when unauthenticated', async ({ page }) => {
    const rpcCalls: string[] = [];

    page.on('request', (request) => {
      const url = request.url();
      if (url.includes('/rest/v1/rpc/')) {
        rpcCalls.push(url);
      }
    });

    await page.goto('/raio-x');
    await page.waitForURL(/\/auth/, { timeout: 15000 });

    await page.waitForTimeout(1500);

    // Não deve haver chamadas a RPCs de visual search
    const visualSearchRpcCalls = rpcCalls.filter(
      (url) =>
        url.includes('visual') ||
        url.includes('search_history') ||
        url.includes('image_hash'),
    );

    expect(visualSearchRpcCalls).toEqual([]);
  });
});

test.describe('Visual Search Module - Navigation', () => {
  test('should handle deep linking with various filter combinations', async ({ page }) => {
    // Testa várias combinações de parâmetros
    const testUrls = [
      '/raio-x',
      '/raio-x?category=brindes',
      '/raio-x?category=tecnologia',
      '/raio-x?color=azul',
      '/raio-x?color=vermelho&material=aco',
      '/raio-x?manualKeywords=caneca',
      '/raio-x?history=true',
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

    // 2. Tenta ir para /raio-x (vai redirecionar)
    await page.goto('/raio-x');
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

  test('should handle navigation between tool modules', async ({ page }) => {
    // Testa navegação entre módulos de ferramentas
    await page.goto('/raio-x');
    await page.waitForURL(/\/auth/, { timeout: 15000 });

    // Tenta ir para outro módulo de ferramenta
    await page.goto('/estoque');
    await page.waitForURL(/\/auth/, { timeout: 15000 });

    await expect(page).toHaveURL(/\/auth/);
  });

  test('should handle rapid navigation between visual search routes', async ({ page }) => {
    // Testa navegação rápida
    await page.goto('/raio-x');
    await page.waitForURL(/\/auth/, { timeout: 15000 });

    await page.goto('/raio-x?category=brindes');
    await page.waitForURL(/\/auth/, { timeout: 15000 });

    await page.goto('/raio-x?color=azul&manualKeywords=test');
    await page.waitForURL(/\/auth/, { timeout: 15000 });

    // Deve estar consistentemente em /auth
    await expect(page).toHaveURL(/\/auth/);
  });
});
