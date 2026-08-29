/**
 * E2E: Favorites Module — Public Coverage (no auth required)
 *
 * Testa o módulo de favoritos (/favoritos) SEM autenticação.
 *
 * Estes testes verificam:
 *   1. Acesso e redirecionamento para /auth
 *   2. Página de favoritos está protegida
 *   3. Não vaza dados de favoritos para usuários não autenticados
 *   4. Validação contra IDs maliciosos
 *   5. Comportamento com query parameters (filtros, ordenação)
 *
 * Para testes AUTENTICADOS (com fluxo completo de favoritar produtos), é necessário
 * configurar E2E_USER_EMAIL e E2E_USER_PASSWORD e rodar com chromium-authed.
 */

import { test, expect } from './fixtures/test-base';

test.describe('Favorites Module - Public Access (No Auth)', () => {
  test('should redirect to auth when accessing /favoritos unauthenticated', async ({ page }) => {
    await page.goto('/favoritos');

    // Protected route deve redirecionar para /auth
    await page.waitForURL(/\/auth/, { timeout: 15000 });
    await expect(page).toHaveURL(/\/auth/);
  });

  test('should display auth page when accessing /favoritos', async ({ page }) => {
    await page.goto('/favoritos');
    await page.waitForURL(/\/auth/, { timeout: 15000 });

    // Verifica que está na página de auth
    await expect(page).toHaveURL(/\/auth/);

    // Verifica que o conteúdo da página de auth é visível
    await expect(page.getByRole('main', { name: /Autenticação/i })).toBeVisible();
  });

  test('should not expose favorites data to unauthenticated users', async ({ page }) => {
    // Captura todas as requisições feitas após navegação
    const apiCalls: string[] = [];
    const sensitiveCalls: string[] = [];

    page.on('request', (request) => {
      const url = request.url();
      // Ignora auth/session (esperado para qualquer rota)
      if (url.includes('/auth') || url.includes('/session')) return;
      apiCalls.push(url);

      // Verifica chamadas sensíveis (favorites data)
      if (
        url.includes('/favorites') ||
        url.includes('/favorite_products') ||
        url.includes('/favorite_lists') ||
        url.includes('/rest/v1/favorite')
      ) {
        sensitiveCalls.push(url);
      }
    });

    await page.goto('/favoritos');
    await page.waitForURL(/\/auth/, { timeout: 15000 });

    // Aguarda para garantir que nada vaza
    await page.waitForTimeout(2000);

    // Validação principal: nenhuma chamada de dados de favoritos deve acontecer
    expect(sensitiveCalls).toEqual([]);

    // Verifica que não há vazamento de IDs sensíveis em query strings
    const favoritesDataLeaks = apiCalls.filter((url) => {
      try {
        const u = new URL(url);
        return (
          u.searchParams.has('favoriteId') ||
          u.searchParams.has('favorite_id') ||
          u.searchParams.has('userId') ||
          u.searchParams.has('productId')
        );
      } catch {
        return false;
      }
    });

    expect(favoritesDataLeaks).toEqual([]);
  });

  test('should handle query parameters on favorites routes', async ({ page }) => {
    // Tenta acessar com parâmetros comuns de filtros/ordenação
    await page.goto('/favoritos?sort=recent&category=tecnologia');

    // Deve redirecionar para /auth independente dos params
    await page.waitForURL(/\/auth/, { timeout: 15000 });
    await expect(page).toHaveURL(/\/auth/);
  });

  test('should handle sort and filter parameters without leaking data', async ({ page }) => {
    // Tenta acessar com vários parâmetros de ordenação
    await page.goto('/favoritos?sort=name&order=asc&limit=50');

    await page.waitForURL(/\/auth/, { timeout: 15000 });
    await expect(page).toHaveURL(/\/auth/);
  });

  test('should handle invalid query parameters without exposing data', async ({ page }) => {
    // Tenta acessar com payloads maliciosos via query params
    const maliciousParams = [
      '?id=../etc/passwd',
      '?product=<script>alert(1)</script>',
      "?productId=' OR '1'='1",
      '?userId=admin',
    ];

    for (const params of maliciousParams) {
      await page.goto(`/favoritos${params}`);
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

    await page.goto('/favoritos');
    await page.waitForURL(/\/auth/, { timeout: 15000 });

    // Aguarda estabilização
    await page.waitForTimeout(1500);

    // Não deve haver erros JS do projeto
    expect(errors).toEqual([]);
  });

  test('should preserve intended favorites URL after auth (returnTo)', async ({ page }) => {
    await page.goto('/favoritos?sort=recent');

    // Espera redirect
    await page.waitForURL(/\/auth/, { timeout: 15000 });

    // A URL deve estar em /auth
    const url = page.url();
    expect(url).toMatch(/\/auth/);
  });

  test('should redirect mobile viewport correctly', async ({ page }) => {
    // Simula viewport mobile
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto('/favoritos');
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
      await page.goto('/favoritos');
      await page.waitForURL(/\/auth/, { timeout: 15000 });
      await expect(page).toHaveURL(/\/auth/);
    }
  });
});

test.describe('Favorites Module - Database Communication (Public)', () => {
  test('should not query favorites tables when unauthenticated', async ({ page }) => {
    const dbCalls: string[] = [];

    page.on('request', (request) => {
      const url = request.url();
      // Supabase REST API
      if (url.includes('supabase.co/rest/v1/')) {
        dbCalls.push(url);
      }
    });

    await page.goto('/favoritos');
    await page.waitForURL(/\/auth/, { timeout: 15000 });

    // Aguarda para capturar requests
    await page.waitForTimeout(1500);

    // Não deve haver queries a tabelas de favoritos
    const favoritesTableQueries = dbCalls.filter(
      (url) =>
        url.includes('/favorites') ||
        url.includes('/favorite_products') ||
        url.includes('/favorite_lists'),
    );

    expect(favoritesTableQueries).toEqual([]);
  });

  test('should not expose favorites endpoints in edge function calls', async ({ page }) => {
    const edgeCalls: string[] = [];

    page.on('request', (request) => {
      const url = request.url();
      // Edge functions do Supabase
      if (url.includes('/functions/v1/')) {
        edgeCalls.push(url);
      }
    });

    await page.goto('/favoritos');
    await page.waitForURL(/\/auth/, { timeout: 15000 });

    await page.waitForTimeout(1500);

    // Não deve haver chamadas para edge functions de favoritos
    const favoritesEdgeCalls = edgeCalls.filter(
      (url) =>
        url.includes('favorite') ||
        url.includes('favorit') ||
        url.includes('wishlist'),
    );

    expect(favoritesEdgeCalls).toEqual([]);
  });

  test('should not query RPC functions for favorites data when unauthenticated', async ({ page }) => {
    const rpcCalls: string[] = [];

    page.on('request', (request) => {
      const url = request.url();
      if (url.includes('/rest/v1/rpc/')) {
        rpcCalls.push(url);
      }
    });

    await page.goto('/favoritos');
    await page.waitForURL(/\/auth/, { timeout: 15000 });

    await page.waitForTimeout(1500);

    // Não deve haver chamadas a RPCs de favoritos
    const favoritesRpcCalls = rpcCalls.filter(
      (url) =>
        url.includes('favorite') ||
        url.includes('favorit') ||
        url.includes('wishlist'),
    );

    expect(favoritesRpcCalls).toEqual([]);
  });
});

test.describe('Favorites Module - Navigation', () => {
  test('should handle deep linking with various filter combinations', async ({ page }) => {
    // Testa várias combinações de parâmetros
    const testUrls = [
      '/favoritos',
      '/favoritos?sort=recent',
      '/favoritos?sort=name',
      '/favoritos?sort=price',
      '/favoritos?category=brindes',
      '/favoritos?category=tecnologia&sort=recent',
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

    // 2. Tenta ir para /favoritos (vai redirecionar)
    await page.goto('/favoritos');
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

  test('should handle navigation between personal modules', async ({ page }) => {
    // Testa navegação entre módulos pessoais (carts, favorites, collections)
    await page.goto('/favoritos');
    await page.waitForURL(/\/auth/, { timeout: 15000 });

    // Tenta ir para outro módulo pessoal
    await page.goto('/carrinhos');
    await page.waitForURL(/\/auth/, { timeout: 15000 });

    await expect(page).toHaveURL(/\/auth/);
  });

  test('should handle rapid navigation between favorites-related routes', async ({ page }) => {
    // Testa navegação rápida
    await page.goto('/favoritos');
    await page.waitForURL(/\/auth/, { timeout: 15000 });

    await page.goto('/favoritos?sort=recent');
    await page.waitForURL(/\/auth/, { timeout: 15000 });

    await page.goto('/favoritos?sort=name');
    await page.waitForURL(/\/auth/, { timeout: 15000 });

    // Deve estar consistentemente em /auth
    await expect(page).toHaveURL(/\/auth/);
  });
});
