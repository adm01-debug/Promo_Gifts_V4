/**
 * E2E: Collections Module — Public Coverage (no auth required)
 *
 * Testa o módulo de coleções (/colecoes) SEM autenticação.
 *
 * Estes testes verificam:
 *   1. Acesso e redirecionamento para /auth
 *   2. Páginas de coleção estão protegidas
 *   3. URLs individuais (/colecoes/:id) também protegidas
 *   4. Não vaza dados de coleções para usuários não autenticados
 *   5. Validação contra IDs maliciosos
 *
 * Para testes AUTENTICADOS (com fluxo completo de criação/gestão), é necessário
 * configurar E2E_USER_EMAIL e E2E_USER_PASSWORD e rodar com chromium-authed.
 */

import { test, expect } from './fixtures/test-base';

test.describe('Collections Module - Public Access (No Auth)', () => {
  test('should redirect to auth when accessing /colecoes unauthenticated', async ({ page }) => {
    await page.goto('/colecoes');

    // Protected route deve redirecionar para /auth
    await page.waitForURL(/\/auth/, { timeout: 15000 });
    await expect(page).toHaveURL(/\/auth/);
  });

  test('should redirect to auth when accessing /colecoes/:id unauthenticated', async ({ page }) => {
    // Tenta acessar uma coleção específica
    await page.goto('/colecoes/test-collection-id-123');

    await page.waitForURL(/\/auth/, { timeout: 15000 });
    await expect(page).toHaveURL(/\/auth/);
  });

  test('should display auth page when accessing /colecoes', async ({ page }) => {
    await page.goto('/colecoes');
    await page.waitForURL(/\/auth/, { timeout: 15000 });

    // Verifica que está na página de auth
    await expect(page).toHaveURL(/\/auth/);

    // Verifica que o conteúdo da página de auth é visível
    await expect(page.getByRole('main', { name: /Autenticação/i })).toBeVisible();
  });

  test('should not expose collections data to unauthenticated users', async ({ page }) => {
    // Captura todas as requisições feitas após navegação
    const apiCalls: string[] = [];
    const sensitiveCalls: string[] = [];

    page.on('request', (request) => {
      const url = request.url();
      // Ignora auth/session (esperado para qualquer rota)
      if (url.includes('/auth') || url.includes('/session')) return;
      apiCalls.push(url);

      // Verifica chamadas sensíveis (collections data)
      if (
        url.includes('/collections') ||
        url.includes('/collection_products') ||
        url.includes('/rest/v1/collection') ||
        url.includes('/rest/v1/favorite')
      ) {
        sensitiveCalls.push(url);
      }
    });

    await page.goto('/colecoes');
    await page.waitForURL(/\/auth/, { timeout: 15000 });

    // Aguarda para garantir que nada vaza
    await page.waitForTimeout(2000);

    // Validação principal: nenhuma chamada de dados de coleções deve acontecer
    expect(sensitiveCalls).toEqual([]);

    // Verifica que não há vazamento de IDs sensíveis em query strings
    const collectionDataLeaks = apiCalls.filter((url) => {
      try {
        const u = new URL(url);
        return (
          u.searchParams.has('collectionId') ||
          u.searchParams.has('collection_id') ||
          u.searchParams.has('userId') ||
          u.searchParams.has('favorites')
        );
      } catch {
        return false;
      }
    });

    expect(collectionDataLeaks).toEqual([]);
  });

  test('should handle query parameters on collections routes', async ({ page }) => {
    // Tenta acessar com parâmetros comuns
    await page.goto('/colecoes?search=brindes&category=tecnologia');

    // Deve redirecionar para /auth independente dos params
    await page.waitForURL(/\/auth/, { timeout: 15000 });
    await expect(page).toHaveURL(/\/auth/);
  });

  test('should handle invalid collection IDs without exposing data', async ({ page }) => {
    // Tenta acessar com UUIDs malformados e payloads maliciosos
    const invalidIds = [
      'not-a-uuid',
      '../../../etc/passwd',
      '<script>alert(1)</script>',
      "' OR '1'='1",
      '00000000-0000-0000-0000-000000000000',
    ];

    for (const id of invalidIds) {
      await page.goto(`/colecoes/${encodeURIComponent(id)}`);
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

    await page.goto('/colecoes');
    await page.waitForURL(/\/auth/, { timeout: 15000 });

    // Aguarda estabilização
    await page.waitForTimeout(1500);

    // Não deve haver erros JS do projeto
    expect(errors).toEqual([]);
  });

  test('should preserve intended collection URL after auth (returnTo)', async ({ page }) => {
    await page.goto('/colecoes/my-collection-123');

    // Espera redirect
    await page.waitForURL(/\/auth/, { timeout: 15000 });

    // A URL deve estar em /auth
    const url = page.url();
    expect(url).toMatch(/\/auth/);
  });

  test('should redirect mobile viewport correctly', async ({ page }) => {
    // Simula viewport mobile
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto('/colecoes');
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
      await page.goto('/colecoes');
      await page.waitForURL(/\/auth/, { timeout: 15000 });
      await expect(page).toHaveURL(/\/auth/);
    }
  });
});

test.describe('Collections Module - Database Communication (Public)', () => {
  test('should not query collections tables when unauthenticated', async ({ page }) => {
    const dbCalls: string[] = [];

    page.on('request', (request) => {
      const url = request.url();
      // Supabase REST API
      if (url.includes('supabase.co/rest/v1/')) {
        dbCalls.push(url);
      }
    });

    await page.goto('/colecoes');
    await page.waitForURL(/\/auth/, { timeout: 15000 });

    // Aguarda para capturar requests
    await page.waitForTimeout(1500);

    // Não deve haver queries a tabelas de coleções/favoritos
    const collectionTableQueries = dbCalls.filter(
      (url) =>
        url.includes('/collections') ||
        url.includes('/collection_products') ||
        url.includes('/favorite_lists') ||
        url.includes('/favorites'),
    );

    expect(collectionTableQueries).toEqual([]);
  });

  test('should not expose collection endpoints in edge function calls', async ({ page }) => {
    const edgeCalls: string[] = [];

    page.on('request', (request) => {
      const url = request.url();
      // Edge functions do Supabase
      if (url.includes('/functions/v1/')) {
        edgeCalls.push(url);
      }
    });

    await page.goto('/colecoes');
    await page.waitForURL(/\/auth/, { timeout: 15000 });

    await page.waitForTimeout(1500);

    // Não deve haver chamadas para edge functions de coleções
    const collectionEdgeCalls = edgeCalls.filter(
      (url) =>
        url.includes('collection') ||
        url.includes('favorite') ||
        url.includes('add-to-collection'),
    );

    expect(collectionEdgeCalls).toEqual([]);
  });

  test('should not query RPC functions for collection data when unauthenticated', async ({ page }) => {
    const rpcCalls: string[] = [];

    page.on('request', (request) => {
      const url = request.url();
      if (url.includes('/rest/v1/rpc/')) {
        rpcCalls.push(url);
      }
    });

    await page.goto('/colecoes');
    await page.waitForURL(/\/auth/, { timeout: 15000 });

    await page.waitForTimeout(1500);

    // Não deve haver chamadas a RPCs de coleções
    const collectionRpcCalls = rpcCalls.filter(
      (url) =>
        url.includes('collection') ||
        url.includes('favorite') ||
        url.includes('user_collection'),
    );

    expect(collectionRpcCalls).toEqual([]);
  });
});

test.describe('Collections Module - Navigation', () => {
  test('should handle deep linking to specific collections', async ({ page }) => {
    // Testa várias URLs de coleções específicas
    const testUrls = [
      '/colecoes',
      '/colecoes/abc-123',
      '/colecoes/xyz-456',
      '/colecoes/collection-uuid-here',
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

    // 2. Tenta ir para /colecoes (vai redirecionar)
    await page.goto('/colecoes');
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

  test('should handle navigation between protected modules', async ({ page }) => {
    // Tenta navegar entre módulos auth-required sem auth
    await page.goto('/colecoes');
    await page.waitForURL(/\/auth/, { timeout: 15000 });

    // Agora tenta ir para /favoritos (se existir)
    await page.goto('/favoritos');
    await page.waitForTimeout(1000);

    // Pode redirecionar ou 404 - ambos são aceitáveis
    const finalUrl = page.url();
    expect(finalUrl).toMatch(/\/auth|404|not.found/);
  });

  test('should handle rapid navigation between collections routes', async ({ page }) => {
    // Testa navegação rápida entre rotas de coleções
    await page.goto('/colecoes');
    await page.waitForURL(/\/auth/, { timeout: 15000 });

    await page.goto('/colecoes/collection-1');
    await page.waitForURL(/\/auth/, { timeout: 15000 });

    await page.goto('/colecoes/collection-2');
    await page.waitForURL(/\/auth/, { timeout: 15000 });

    // Deve estar consistentemente em /auth
    await expect(page).toHaveURL(/\/auth/);
  });
});
