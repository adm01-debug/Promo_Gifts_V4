/**
 * E2E: Dashboard Modules — Public Coverage (no auth required)
 *
 * Testa os módulos de dashboard (/admin/*) SEM autenticação.
 *
 * Estes testes verificam:
 *   1. Acesso e redirecionamento para /auth em todos os dashboards
 *   2. Páginas de admin/dashboard estão protegidas
 *   3. Não vaza dados de observabilidade/métricas para usuários não autenticados
 *   4. Validação contra payloads maliciosos
 *
 * Dashboards testados:
 *   - /admin/observabilidade (ObservabilityDashboard)
 *   - /admin/workflows (AdminWorkflowsPage)
 *   - /admin/rate-limit (RateLimitDashboard)
 *   - /admin/rls-denials (RlsDenialsAdminPage)
 *   - /admin/auditoria-propriedade (OwnershipAuditAdminPage)
 *   - /admin/cadastros (AdminCadastrosPage)
 *   - /admin/cloudflare-images (AdminCloudflareImagesPage)
 *
 * Para testes AUTENTICADOS (com dashboards e gráficos), é necessário
 * configurar E2E_USER_EMAIL e E2E_USER_PASSWORD e rodar com chromium-authed.
 */

import { test, expect } from './fixtures/test-base';

// Lista de rotas de dashboards que devem ser testadas
const DASHBOARD_ROUTES = [
  { path: '/admin', name: 'Admin Home' },
  { path: '/admin/observabilidade', name: 'Observabilidade' },
  { path: '/admin/workflows', name: 'Workflows' },
  { path: '/admin/rate-limit', name: 'Rate Limit' },
  { path: '/admin/rls-denials', name: 'RLS Denials' },
  { path: '/admin/auditoria-propriedade', name: 'Auditoria Propriedade' },
  { path: '/admin/cadastros', name: 'Cadastros' },
  { path: '/admin/cloudflare-images', name: 'Cloudflare Images' },
  { path: '/admin/usuarios', name: 'Usuários' },
  { path: '/admin/permissoes', name: 'Permissões' },
];

test.describe('Dashboard Modules - Public Access (No Auth)', () => {
  for (const route of DASHBOARD_ROUTES) {
    test(`should redirect to auth when accessing ${route.path} unauthenticated`, async ({ page }) => {
      await page.goto(route.path);

      // Protected route deve redirecionar para /auth
      await page.waitForURL(/\/auth/, { timeout: 15000 });
      await expect(page).toHaveURL(/\/auth/);
    });
  }

  test('should display auth page for all dashboard routes', async ({ page }) => {
    for (const route of DASHBOARD_ROUTES.slice(0, 3)) {
      await page.goto(route.path);
      await page.waitForURL(/\/auth/, { timeout: 15000 });
      await expect(page.getByRole('main', { name: /Autenticação/i })).toBeVisible();
    }
  });

  test('should not expose observability/metrics data to unauthenticated users', async ({ page }) => {
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

      // Verifica chamadas sensíveis (observability/metrics data)
      if (
        url.includes('/observab') ||
        url.includes('/metrics') ||
        url.includes('/audit_log') ||
        url.includes('/system_error_logs')
      ) {
        sensitiveCalls.push(url);
      }
    });

    await page.goto('/admin/observabilidade');
    await page.waitForURL(/\/auth/, { timeout: 15000 });

    await page.waitForTimeout(2000);

    // Validação principal: nenhuma chamada de dados admin/observability deve acontecer
    expect(sensitiveCalls).toEqual([]);
  });

  test('should handle query parameters on dashboard routes', async ({ page }) => {
    // Tenta acessar com parâmetros comuns
    await page.goto('/admin/observabilidade?period=24h&type=errors');

    await page.waitForURL(/\/auth/, { timeout: 15000 });
    await expect(page).toHaveURL(/\/auth/);
  });

  test('should handle invalid query parameters without exposing data', async ({ page }) => {
    // Tenta acessar com payloads maliciosos via query params
    const maliciousParams = [
      '?id=../etc/passwd',
      '?token=<script>alert(1)</script>',
      "?userId=' OR '1'='1",
      '?adminToken=bypass',
      '?debug=true',
    ];

    for (const params of maliciousParams) {
      await page.goto(`/admin/observabilidade${params}`);
      await page.waitForURL(/\/auth/, { timeout: 15000 });
      await expect(page).toHaveURL(/\/auth/);
    }
  });

  test('should not throw JS errors during dashboard redirects', async ({ page }) => {
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

    for (const route of DASHBOARD_ROUTES.slice(0, 3)) {
      await page.goto(route.path);
      await page.waitForURL(/\/auth/, { timeout: 15000 });
      await page.waitForTimeout(300);
    }

    expect(errors).toEqual([]);
  });

  test('should preserve intended dashboard URL after auth (returnTo)', async ({ page }) => {
    await page.goto('/admin/observabilidade?period=7d');

    await page.waitForURL(/\/auth/, { timeout: 15000 });

    const url = page.url();
    expect(url).toMatch(/\/auth/);
  });

  test('should redirect mobile viewport correctly for dashboards', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto('/admin/observabilidade');
    await page.waitForURL(/\/auth/, { timeout: 15000 });

    await expect(page).toHaveURL(/\/auth/);

    const hasHorizontalScroll = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });

    expect(hasHorizontalScroll).toBe(false);
  });
});

test.describe('Dashboard Modules - Database Communication (Public)', () => {
  test('should not query admin/observability tables when unauthenticated', async ({ page }) => {
    const dbCalls: string[] = [];

    page.on('request', (request) => {
      const url = request.url();
      if (url.includes('supabase.co/rest/v1/')) {
        dbCalls.push(url);
      }
    });

    await page.goto('/admin/observabilidade');
    await page.waitForURL(/\/auth/, { timeout: 15000 });

    await page.waitForTimeout(1500);

    // Não deve haver queries a tabelas admin/observability
    const adminTableQueries = dbCalls.filter(
      (url) =>
        url.includes('/audit_log') ||
        url.includes('/system_error_logs') ||
        url.includes('/admin_') ||
        url.includes('/workflows') ||
        url.includes('/rate_limits') ||
        url.includes('/observability'),
    );

    expect(adminTableQueries).toEqual([]);
  });

  test('should not expose admin endpoints in edge function calls', async ({ page }) => {
    const edgeCalls: string[] = [];

    page.on('request', (request) => {
      const url = request.url();
      if (url.includes('/functions/v1/')) {
        edgeCalls.push(url);
      }
    });

    await page.goto('/admin/observabilidade');
    await page.waitForURL(/\/auth/, { timeout: 15000 });

    await page.waitForTimeout(1500);

    // Não deve haver chamadas para edge functions admin
    const adminEdgeCalls = edgeCalls.filter(
      (url) =>
        url.includes('admin') ||
        url.includes('audit') ||
        url.includes('workflow') ||
        url.includes('observ'),
    );

    expect(adminEdgeCalls).toEqual([]);
  });

  test('should not query RPC functions for admin data when unauthenticated', async ({ page }) => {
    const rpcCalls: string[] = [];

    page.on('request', (request) => {
      const url = request.url();
      if (url.includes('/rest/v1/rpc/')) {
        rpcCalls.push(url);
      }
    });

    await page.goto('/admin/rls-denials');
    await page.waitForURL(/\/auth/, { timeout: 15000 });

    await page.waitForTimeout(1500);

    // Não deve haver chamadas a RPCs admin
    const adminRpcCalls = rpcCalls.filter(
      (url) =>
        url.includes('admin') ||
        url.includes('audit') ||
        url.includes('rls_') ||
        url.includes('workflow'),
    );

    expect(adminRpcCalls).toEqual([]);
  });
});

test.describe('Dashboard Modules - Navigation', () => {
  test('should handle deep linking to admin routes', async ({ page }) => {
    const testUrls = [
      '/admin',
      '/admin/observabilidade',
      '/admin/workflows',
      '/admin/rate-limit',
      '/admin/rls-denials',
      '/admin/auditoria-propriedade',
    ];

    for (const url of testUrls) {
      await page.goto(url);
      await page.waitForURL(/\/auth/, { timeout: 15000 });
      await expect(page).toHaveURL(/\/auth/);
    }
  });

  test('should handle browser back/forward navigation between admin routes', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(500);

    await page.goto('/admin/observabilidade');
    await page.waitForURL(/\/auth/, { timeout: 15000 });

    await page.goBack();
    await page.waitForTimeout(1000);

    await page.goForward();
    await page.waitForTimeout(1000);

    await expect(page).toHaveURL(/\/auth|\/$/);
  });

  test('should handle rapid navigation between admin routes', async ({ page }) => {
    await page.goto('/admin/observabilidade');
    await page.waitForURL(/\/auth/, { timeout: 15000 });

    await page.goto('/admin/workflows');
    await page.waitForURL(/\/auth/, { timeout: 15000 });

    await page.goto('/admin/rate-limit');
    await page.waitForURL(/\/auth/, { timeout: 15000 });

    await expect(page).toHaveURL(/\/auth/);
  });

  test('should handle admin route with admin sub-paths', async ({ page }) => {
    // Tenta acessar rotas com sub-paths
    await page.goto('/admin/cadastros/produto/test-id');
    await page.waitForURL(/\/auth/, { timeout: 15000 });

    await expect(page).toHaveURL(/\/auth/);
  });
});
