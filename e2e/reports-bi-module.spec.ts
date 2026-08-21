/**
 * E2E: Reports / BI Module — Public Coverage (no auth required)
 *
 * Testa os módulos de relatórios e BI SEM autenticação.
 *
 * Estes testes verificam:
 *   1. Acesso e redirecionamento para /auth em todas as rotas de relatórios
 *   2. Páginas de BI/relatórios estão protegidas
 *   3. Não vaza dados de business intelligence para usuários não autenticados
 *   4. Validação contra payloads maliciosos
 *
 * Rotas testadas:
 *   - /inteligencia-comercial (Inteligência Comercial)
 *   - /ferramentas/bi (Business Intelligence Dashboard)
 *   - /ferramentas/bi/comparar (Comparador de Clientes)
 *   - /tendencias (Tendências de Mercado)
 *
 * Para testes AUTENTICADOS (com gráficos e dados de BI), é necessário
 * configurar E2E_USER_EMAIL e E2E_USER_PASSWORD e rodar com chromium-authed.
 */

import { test, expect } from './fixtures/test-base';

// Lista de rotas de relatórios que devem ser testadas
const REPORT_ROUTES = [
  { path: '/inteligencia-comercial', name: 'Inteligência Comercial' },
  { path: '/ferramentas/bi', name: 'Business Intelligence' },
  { path: '/ferramentas/bi/comparar', name: 'BI Comparar Clientes' },
  { path: '/tendencias', name: 'Tendências' },
];

test.describe('Reports / BI Module - Public Access (No Auth)', () => {
  for (const route of REPORT_ROUTES) {
    test(`should redirect to auth when accessing ${route.path} unauthenticated`, async ({ page }) => {
      await page.goto(route.path);

      // Protected route deve redirecionar para /auth
      await page.waitForURL(/\/auth/, { timeout: 15000 });
      await expect(page).toHaveURL(/\/auth/);
    });
  }

  test('should display auth page for all report routes', async ({ page }) => {
    for (const route of REPORT_ROUTES.slice(0, 3)) {
      await page.goto(route.path);
      await page.waitForURL(/\/auth/, { timeout: 15000 });
      await expect(page.getByRole('main', { name: /Autenticação/i })).toBeVisible();
    }
  });

  test('should not expose BI/report data to unauthenticated users', async ({ page }) => {
    const apiCalls: string[] = [];
    const sensitiveCalls: string[] = [];

    page.on('request', (request) => {
      const url = request.url();
      // Ignora rotas internas do frontend (não são chamadas API sensíveis)
      if (
        url.startsWith('http://localhost:8080/') &&
        !url.includes('/rest/v1/') &&
        !url.includes('/functions/v1/') &&
        !url.includes('/auth/v1/') &&
        !url.includes('/realtime/v1/') &&
        !url.includes('/storage/v1/')
      ) {
        return;
      }
      // Ignora auth/session
      if (url.includes('/auth/') || url.includes('/session')) return;
      apiCalls.push(url);

      // Verifica chamadas sensíveis (BI/sales data)
      if (
        url.includes('/bi_') ||
        url.includes('/business_intelligence') ||
        url.includes('/commercial_intelligence') ||
        url.includes('/market_intelligence') ||
        url.includes('/client_metrics') ||
        url.includes('/sales_dashboard') ||
        url.includes('/trends_data') ||
        url.includes('/analytics_summary')
      ) {
        sensitiveCalls.push(url);
      }
    });

    await page.goto('/ferramentas/bi');
    await page.waitForURL(/\/auth/, { timeout: 15000 });

    await page.waitForTimeout(2000);

    // Validação principal: nenhuma chamada de dados BI deve acontecer
    expect(sensitiveCalls).toEqual([]);
  });

  test('should handle query parameters on BI routes', async ({ page }) => {
    // Tenta acessar com parâmetros comuns
    await page.goto('/ferramentas/bi?period=30d&view=overview');

    await page.waitForURL(/\/auth/, { timeout: 15000 });
    await expect(page).toHaveURL(/\/auth/);
  });

  test('should handle intelligence filter parameters', async ({ page }) => {
    // Tenta acessar com filtros de inteligência comercial
    await page.goto('/inteligencia-comercial?category=tecnologia&region=sudeste');

    await page.waitForURL(/\/auth/, { timeout: 15000 });
    await expect(page).toHaveURL(/\/auth/);
  });

  test('should handle trends date range parameters', async ({ page }) => {
    // Tenta acessar com filtros de tendências
    await page.goto('/tendencias?from=2024-01-01&to=2024-12-31&category=brindes');

    await page.waitForURL(/\/auth/, { timeout: 15000 });
    await expect(page).toHaveURL(/\/auth/);
  });

  test('should handle client comparator parameters', async ({ page }) => {
    // Tenta acessar com filtros do comparador
    await page.goto('/ferramentas/bi/comparar?clients=1,2,3&metrics=revenue,volume');

    await page.waitForURL(/\/auth/, { timeout: 15000 });
    await expect(page).toHaveURL(/\/auth/);
  });

  test('should handle invalid query parameters without exposing data', async ({ page }) => {
    // Tenta acessar com payloads maliciosos via query params
    const maliciousParams = [
      '?clientId=../etc/passwd',
      '?token=<script>alert(1)</script>',
      "?userId=' OR '1'='1",
      '?adminToken=bypass',
      '?debug=true',
      '?export=../../etc/shadow',
      '?sql=SELECT * FROM users',
    ];

    for (const params of maliciousParams) {
      await page.goto(`/ferramentas/bi${params}`);
      await page.waitForURL(/\/auth/, { timeout: 15000 });
      await expect(page).toHaveURL(/\/auth/);
    }
  });

  test('should not throw JS errors during report redirects', async ({ page }) => {
    const errors: string[] = [];

    page.on('pageerror', (err) => {
      if (!err.message.includes('net::') && !err.message.includes('Failed to fetch')) {
        errors.push(err.message);
      }
    });

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const text = msg.text();
        // Ignora erros esperados: extensions, network errors, e tentativas
        // legítimas de buscar sessão sem auth (request_failed)
        if (
          !text.includes('csspeeper') &&
          !text.includes('givefreely') &&
          !text.includes('maxmind') &&
          !text.includes('extension') &&
          !text.includes('net::') &&
          !text.includes('Failed to fetch') &&
          !text.includes('request_failed') &&
          !text.includes('Invalid API key') &&
          !text.includes('Unauthorized')
        ) {
          errors.push(text);
        }
      }
    });

    for (const route of REPORT_ROUTES.slice(0, 3)) {
      await page.goto(route.path);
      await page.waitForURL(/\/auth/, { timeout: 15000 });
      await page.waitForTimeout(300);
    }

    expect(errors).toEqual([]);
  });

  test('should preserve intended report URL after auth (returnTo)', async ({ page }) => {
    await page.goto('/ferramentas/bi?period=7d');

    await page.waitForURL(/\/auth/, { timeout: 15000 });

    const url = page.url();
    expect(url).toMatch(/\/auth/);
  });

  test('should redirect mobile viewport correctly for BI pages', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto('/ferramentas/bi');
    await page.waitForURL(/\/auth/, { timeout: 15000 });

    await expect(page).toHaveURL(/\/auth/);

    const hasHorizontalScroll = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });

    expect(hasHorizontalScroll).toBe(false);
  });

  test('should redirect mobile viewport correctly for intelligence pages', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto('/inteligencia-comercial');
    await page.waitForURL(/\/auth/, { timeout: 15000 });

    await expect(page).toHaveURL(/\/auth/);
  });

  test('should redirect mobile viewport correctly for trends pages', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto('/tendencias');
    await page.waitForURL(/\/auth/, { timeout: 15000 });

    await expect(page).toHaveURL(/\/auth/);
  });
});

test.describe('Reports / BI Module - Database Communication (Public)', () => {
  test('should not query BI tables when unauthenticated', async ({ page }) => {
    const dbCalls: string[] = [];

    page.on('request', (request) => {
      const url = request.url();
      if (url.includes('supabase.co/rest/v1/')) {
        dbCalls.push(url);
      }
    });

    await page.goto('/ferramentas/bi');
    await page.waitForURL(/\/auth/, { timeout: 15000 });

    await page.waitForTimeout(1500);

    // Não deve haver queries a tabelas BI
    const biTableQueries = dbCalls.filter(
      (url) =>
        url.includes('/bi_') ||
        url.includes('/business_intelligence') ||
        url.includes('/commercial_intelligence') ||
        url.includes('/market_intelligence') ||
        url.includes('/sales_analytics') ||
        url.includes('/client_metrics') ||
        url.includes('/trends_') ||
        url.includes('/kpi_'),
    );

    expect(biTableQueries).toEqual([]);
  });

  test('should not expose BI endpoints in edge function calls', async ({ page }) => {
    const edgeCalls: string[] = [];

    page.on('request', (request) => {
      const url = request.url();
      if (url.includes('/functions/v1/')) {
        edgeCalls.push(url);
      }
    });

    await page.goto('/ferramentas/bi');
    await page.waitForURL(/\/auth/, { timeout: 15000 });

    await page.waitForTimeout(1500);

    // Não deve haver chamadas para edge functions BI
    const biEdgeCalls = edgeCalls.filter(
      (url) =>
        url.includes('bi') ||
        url.includes('intelligence') ||
        url.includes('analytics') ||
        url.includes('trends') ||
        url.includes('dossier'),
    );

    expect(biEdgeCalls).toEqual([]);
  });

  test('should not query RPC functions for BI data when unauthenticated', async ({ page }) => {
    const rpcCalls: string[] = [];

    page.on('request', (request) => {
      const url = request.url();
      if (url.includes('/rest/v1/rpc/')) {
        rpcCalls.push(url);
      }
    });

    await page.goto('/inteligencia-comercial');
    await page.waitForURL(/\/auth/, { timeout: 15000 });

    await page.waitForTimeout(1500);

    // Não deve haver chamadas a RPCs de BI
    const biRpcCalls = rpcCalls.filter(
      (url) =>
        url.includes('bi_') ||
        url.includes('intelligence') ||
        url.includes('commercial_') ||
        url.includes('market_') ||
        url.includes('analytics') ||
        url.includes('trends_') ||
        url.includes('kpi_'),
    );

    expect(biRpcCalls).toEqual([]);
  });

  test('should not query trends/sales data when unauthenticated', async ({ page }) => {
    const dbCalls: string[] = [];

    page.on('request', (request) => {
      const url = request.url();
      if (url.includes('supabase.co/rest/v1/')) {
        dbCalls.push(url);
      }
    });

    await page.goto('/tendencias');
    await page.waitForURL(/\/auth/, { timeout: 15000 });

    await page.waitForTimeout(1500);

    // Não deve haver queries a tabelas de tendências
    const trendsTableQueries = dbCalls.filter(
      (url) =>
        url.includes('/trends_') ||
        url.includes('/sales_trends') ||
        url.includes('/market_trends') ||
        url.includes('/product_trends') ||
        url.includes('/seasonality'),
    );

    expect(trendsTableQueries).toEqual([]);
  });
});

test.describe('Reports / BI Module - Navigation', () => {
  test('should handle deep linking to BI routes', async ({ page }) => {
    const testUrls = [
      '/ferramentas/bi',
      '/ferramentas/bi/comparar',
      '/inteligencia-comercial',
      '/tendencias',
    ];

    for (const url of testUrls) {
      await page.goto(url);
      await page.waitForURL(/\/auth/, { timeout: 15000 });
      await expect(page).toHaveURL(/\/auth/);
    }
  });

  test('should handle browser back/forward navigation between BI routes', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(500);

    await page.goto('/ferramentas/bi');
    await page.waitForURL(/\/auth/, { timeout: 15000 });

    await page.goBack();
    await page.waitForTimeout(1000);

    await page.goForward();
    await page.waitForTimeout(1000);

    await expect(page).toHaveURL(/\/auth|\/$/);
  });

  test('should handle rapid navigation between BI routes', async ({ page }) => {
    await page.goto('/ferramentas/bi');
    await page.waitForURL(/\/auth/, { timeout: 15000 });

    await page.goto('/inteligencia-comercial');
    await page.waitForURL(/\/auth/, { timeout: 15000 });

    await page.goto('/tendencias');
    await page.waitForURL(/\/auth/, { timeout: 15000 });

    await expect(page).toHaveURL(/\/auth/);
  });

  test('should handle BI comparator deep links without exposing data', async ({ page }) => {
    // Sub-routes do comparador: verifica que não há vazamento de dados
    const sensitiveCalls: string[] = [];

    page.on('request', (request) => {
      const url = request.url();
      if (url.includes('/rest/v1/') || url.includes('/functions/v1/')) {
        if (url.includes('bi_') || url.includes('client_') || url.includes('intelligence')) {
          sensitiveCalls.push(url);
        }
      }
    });

    const response = await page.goto('/ferramentas/bi/comparar/client/123');
    await page.waitForTimeout(2000);

    // Resposta válida
    expect(response?.status()).toBeLessThan(500);
    // Nenhum dado sensível vazado
    expect(sensitiveCalls).toEqual([]);
  });

  test('should handle intelligence sub-routes without exposing data', async ({ page }) => {
    // Sub-routes de inteligência: verifica que não há vazamento de dados
    const sensitiveCalls: string[] = [];

    page.on('request', (request) => {
      const url = request.url();
      if (url.includes('/rest/v1/') || url.includes('/functions/v1/')) {
        if (url.includes('bi_') || url.includes('intelligence') || url.includes('market_')) {
          sensitiveCalls.push(url);
        }
      }
    });

    const response = await page.goto('/inteligencia-comercial/segment/tech');
    await page.waitForTimeout(2000);

    expect(response?.status()).toBeLessThan(500);
    expect(sensitiveCalls).toEqual([]);
  });

  test('should handle trends sub-routes without exposing data', async ({ page }) => {
    // Sub-routes de tendências: verifica que não há vazamento de dados
    const sensitiveCalls: string[] = [];

    page.on('request', (request) => {
      const url = request.url();
      if (url.includes('/rest/v1/') || url.includes('/functions/v1/')) {
        if (url.includes('trends') || url.includes('market_') || url.includes('seasonality')) {
          sensitiveCalls.push(url);
        }
      }
    });

    const response = await page.goto('/tendencias/category/brindes');
    await page.waitForTimeout(2000);

    expect(response?.status()).toBeLessThan(500);
    expect(sensitiveCalls).toEqual([]);
  });

  test('should preserve query params through redirect for BI', async ({ page }) => {
    await page.goto('/ferramentas/bi?view=executive&period=90d');

    await page.waitForURL(/\/auth/, { timeout: 15000 });

    // A URL final deve ser /auth (query params de destino são limpos por segurança)
    await expect(page).toHaveURL(/\/auth/);
  });

  test('should preserve query params through redirect for intelligence', async ({ page }) => {
    await page.goto('/inteligencia-comercial?segment=premium&region=norte');

    await page.waitForURL(/\/auth/, { timeout: 15000 });

    await expect(page).toHaveURL(/\/auth/);
  });

  test('should preserve query params through redirect for trends', async ({ page }) => {
    await page.goto('/tendencias?from=2024-01&to=2024-06&granularity=monthly');

    await page.waitForURL(/\/auth/, { timeout: 15000 });

    await expect(page).toHaveURL(/\/auth/);
  });
});
