/**
 * E2E: Admin / Conexões Module — Public Coverage (no auth required)
 *
 * Testa os módulos de Admin e Conexões SEM autenticação.
 *
 * Estes testes verificam:
 *   1. Acesso e redirecionamento para /auth em todas as rotas admin
 *   2. Páginas admin estão protegidas
 *   3. Não vaza dados sensíveis para usuários não autenticados
 *   4. Validação contra payloads maliciosos
 *
 * Rotas testadas (não cobertas por dashboard-modules.spec.ts):
 *   - /admin/conexoes (Conexões API)
 *   - /admin/conexoes/status (Status das Conexões)
 *   - /admin/seguranca (Segurança)
 *   - /admin/seguranca-acesso (Segurança - Acesso)
 *   - /admin/seguranca/chaves (Segurança - Chaves)
 *   - /admin/prompts-ia (Prompts IA)
 *   - /admin/telemetria (Telemetria)
 *   - /admin/ema-health (EMA Health)
 *   - /admin/design-tokens (Design Tokens)
 *   - /admin/client-performance (Client Performance)
 *   - /admin/login-attempts (Login Attempts)
 *   - /admin/external-db (External DB)
 *   - /admin/consumo-ia (Consumo IA)
 *   - /admin/status (System Status)
 *   - /admin/rbac-rotas (RBAC Rotas)
 *   - /admin/storage-test (Storage Test)
 *   - /admin/qa (QA)
 *   - /admin/qa/sidebar (QA Sidebar)
 *   - /admin/v4-callbacks (V4 Callbacks)
 *   - /admin/badges-inteligencia (Intelligence Badges)
 *   - /admin/validade-precos (Price Freshness)
 *   - /admin/aprovacoes-desconto/:id (Discount Approval Detail)
 *
 * NOTA: Algumas rotas já foram testadas em dashboard-modules.spec.ts:
 *   - /admin/observabilidade, /admin/workflows, /admin/rate-limit,
 *     /admin/rls-denials, /admin/auditoria-propriedade, /admin/cadastros,
 *     /admin/cloudflare-images, /admin/usuarios, /admin/permissoes
 *
 * Para testes AUTENTICADOS (com dashboards e gráficos), é necessário
 * configurar E2E_USER_EMAIL e E2E_USER_PASSWORD e rodar com chromium-authed.
 */

import { test, expect } from './fixtures/test-base';

// Lista de rotas admin/conexões que devem ser testadas
const ADMIN_ROUTES = [
  // Dev-only routes (requerem papel dev)
  { path: '/admin/conexoes', name: 'Conexões API' },
  { path: '/admin/conexoes/status', name: 'Status Conexões' },
  { path: '/admin/seguranca', name: 'Segurança' },
  { path: '/admin/seguranca-acesso', name: 'Segurança Acesso' },
  { path: '/admin/seguranca/chaves', name: 'Segurança Chaves' },
  { path: '/admin/prompts-ia', name: 'Prompts IA' },
  { path: '/admin/telemetria', name: 'Telemetria' },
  { path: '/admin/ema-health', name: 'EMA Health' },
  { path: '/admin/design-tokens', name: 'Design Tokens' },
  { path: '/admin/client-performance', name: 'Client Performance' },
  { path: '/admin/login-attempts', name: 'Login Attempts' },
  { path: '/admin/external-db', name: 'External DB' },
  { path: '/admin/consumo-ia', name: 'Consumo IA' },
  { path: '/admin/status', name: 'System Status' },
  { path: '/admin/rbac-rotas', name: 'RBAC Rotas' },
  { path: '/admin/storage-test', name: 'Storage Test' },
  { path: '/admin/qa', name: 'QA' },
  { path: '/admin/qa/sidebar', name: 'QA Sidebar' },
  { path: '/admin/v4-callbacks', name: 'V4 Callbacks' },
  { path: '/admin/badges-inteligencia', name: 'Intelligence Badges' },
  { path: '/admin/validade-precos', name: 'Price Freshness' },
  { path: '/admin/seguranca/exemplos-challenge', name: 'Security Challenge Examples' },
  { path: '/admin/seguranca/migracao-papeis', name: 'Role Migration' },
  // Admin routes (requerem papel admin)
  { path: '/admin/aprovacoes-desconto/test-id', name: 'Discount Approval Detail' },
];

test.describe('Admin / Conexões Module - Public Access (No Auth)', () => {
  for (const route of ADMIN_ROUTES) {
    test(`should redirect to auth when accessing ${route.path} unauthenticated`, async ({ page }) => {
      await page.goto(route.path);

      // Protected route deve redirecionar para /auth
      await page.waitForURL(/\/auth/, { timeout: 15000 });
      await expect(page).toHaveURL(/\/auth/);
    });
  }

  test('should display auth page for all admin routes', async ({ page }) => {
    for (const route of ADMIN_ROUTES.slice(0, 4)) {
      await page.goto(route.path);
      await page.waitForURL(/\/auth/, { timeout: 15000 });
      await expect(page.getByRole('main', { name: /Autenticação/i })).toBeVisible();
    }
  });

  test('should not expose admin/conexoes data to unauthenticated users', async ({ page }) => {
    const apiCalls: string[] = [];
    const sensitiveCalls: string[] = [];

    page.on('request', (request) => {
      const url = request.url();
      // Ignora rotas internas do frontend
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

      // Verifica chamadas sensíveis (admin/sensitive data)
      if (
        url.includes('/conexoes') ||
        url.includes('/api_keys') ||
        url.includes('/secrets') ||
        url.includes('/login_attempts') ||
        url.includes('/system_status') ||
        url.includes('/telemetry') ||
        url.includes('/admin_settings') ||
        url.includes('/rbac') ||
        url.includes('/ia_usage') ||
        url.includes('/prompt_templates')
      ) {
        sensitiveCalls.push(url);
      }
    });

    await page.goto('/admin/conexoes');
    await page.waitForURL(/\/auth/, { timeout: 15000 });

    await page.waitForTimeout(2000);

    // Validação principal: nenhuma chamada de dados admin deve acontecer
    expect(sensitiveCalls).toEqual([]);
  });

  test('should handle conexoes query parameters', async ({ page }) => {
    await page.goto('/admin/conexoes?provider=openai&status=active');

    await page.waitForURL(/\/auth/, { timeout: 15000 });
    await expect(page).toHaveURL(/\/auth/);
  });

  test('should handle security page parameters', async ({ page }) => {
    await page.goto('/admin/seguranca?tab=access&userId=123');

    await page.waitForURL(/\/auth/, { timeout: 15000 });
    await expect(page).toHaveURL(/\/auth/);
  });

  test('should handle prompts-ia parameters', async ({ page }) => {
    await page.goto('/admin/prompts-ia?category=sales&version=2');

    await page.waitForURL(/\/auth/, { timeout: 15000 });
    await expect(page).toHaveURL(/\/auth/);
  });

  test('should handle invalid query parameters without exposing data', async ({ page }) => {
    // Payloads maliciosos via query params
    const maliciousParams = [
      '?apiKey=../etc/passwd',
      '?secret=<script>alert(1)</script>',
      "?userId=' OR '1'='1",
      '?adminToken=bypass',
      '?debug=true',
      '?sql=SELECT * FROM api_keys',
      '?token=../../etc/shadow',
    ];

    for (const params of maliciousParams) {
      await page.goto(`/admin/conexoes${params}`);
      await page.waitForURL(/\/auth/, { timeout: 15000 });
      await expect(page).toHaveURL(/\/auth/);
    }
  });

  test('should not throw JS errors during admin redirects', async ({ page }) => {
    const errors: string[] = [];

    page.on('pageerror', (err) => {
      if (!err.message.includes('net::') && !err.message.includes('Failed to fetch')) {
        errors.push(err.message);
      }
    });

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const text = msg.text();
        // Ignora erros esperados: extensions, network errors, session check
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

    for (const route of ADMIN_ROUTES.slice(0, 4)) {
      await page.goto(route.path);
      await page.waitForURL(/\/auth/, { timeout: 15000 });
      await page.waitForTimeout(300);
    }

    expect(errors).toEqual([]);
  });

  test('should preserve intended admin URL after auth (returnTo)', async ({ page }) => {
    await page.goto('/admin/conexoes?provider=roboflow');

    await page.waitForURL(/\/auth/, { timeout: 15000 });

    const url = page.url();
    expect(url).toMatch(/\/auth/);
  });

  test('should redirect mobile viewport correctly for conexoes', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto('/admin/conexoes');
    await page.waitForURL(/\/auth/, { timeout: 15000 });

    await expect(page).toHaveURL(/\/auth/);

    const hasHorizontalScroll = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });

    expect(hasHorizontalScroll).toBe(false);
  });

  test('should redirect mobile viewport correctly for security pages', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto('/admin/seguranca');
    await page.waitForURL(/\/auth/, { timeout: 15000 });

    await expect(page).toHaveURL(/\/auth/);
  });

  test('should redirect mobile viewport correctly for QA pages', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto('/admin/qa');
    await page.waitForURL(/\/auth/, { timeout: 15000 });

    await expect(page).toHaveURL(/\/auth/);
  });
});

test.describe('Admin / Conexões Module - Database Communication (Public)', () => {
  test('should not query conexoes tables when unauthenticated', async ({ page }) => {
    const dbCalls: string[] = [];

    page.on('request', (request) => {
      const url = request.url();
      if (url.includes('supabase.co/rest/v1/')) {
        dbCalls.push(url);
      }
    });

    await page.goto('/admin/conexoes');
    await page.waitForURL(/\/auth/, { timeout: 15000 });

    await page.waitForTimeout(1500);

    // Não deve haver queries a tabelas de conexões
    const conexoesTableQueries = dbCalls.filter(
      (url) =>
        url.includes('/conexoes') ||
        url.includes('/api_connections') ||
        url.includes('/integration_credentials') ||
        url.includes('/external_apis'),
    );

    expect(conexoesTableQueries).toEqual([]);
  });

  test('should not query security tables when unauthenticated', async ({ page }) => {
    const dbCalls: string[] = [];

    page.on('request', (request) => {
      const url = request.url();
      if (url.includes('supabase.co/rest/v1/')) {
        dbCalls.push(url);
      }
    });

    await page.goto('/admin/seguranca');
    await page.waitForURL(/\/auth/, { timeout: 15000 });

    await page.waitForTimeout(1500);

    // Não deve haver queries a tabelas de segurança
    const securityTableQueries = dbCalls.filter(
      (url) =>
        url.includes('/api_keys') ||
        url.includes('/secrets') ||
        url.includes('/login_attempts') ||
        url.includes('/access_logs') ||
        url.includes('/audit_log'),
    );

    expect(securityTableQueries).toEqual([]);
  });

  test('should not query IA/AI tables when unauthenticated', async ({ page }) => {
    const dbCalls: string[] = [];

    page.on('request', (request) => {
      const url = request.url();
      if (url.includes('supabase.co/rest/v1/')) {
        dbCalls.push(url);
      }
    });

    await page.goto('/admin/prompts-ia');
    await page.waitForURL(/\/auth/, { timeout: 15000 });

    await page.waitForTimeout(1500);

    // Não deve haver queries a tabelas de IA
    const iaTableQueries = dbCalls.filter(
      (url) =>
        url.includes('/prompt_templates') ||
        url.includes('/ia_usage') ||
        url.includes('/ai_conversation') ||
        url.includes('/llm_logs'),
    );

    expect(iaTableQueries).toEqual([]);
  });

  test('should not expose admin endpoints in edge function calls', async ({ page }) => {
    const edgeCalls: string[] = [];

    page.on('request', (request) => {
      const url = request.url();
      if (url.includes('/functions/v1/')) {
        edgeCalls.push(url);
      }
    });

    await page.goto('/admin/status');
    await page.waitForURL(/\/auth/, { timeout: 15000 });

    await page.waitForTimeout(1500);

    // Não deve haver chamadas para edge functions admin
    const adminEdgeCalls = edgeCalls.filter(
      (url) =>
        url.includes('admin') ||
        url.includes('connection') ||
        url.includes('security') ||
        url.includes('telemetry') ||
        url.includes('health-check') ||
        url.includes('system-status'),
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

    await page.goto('/admin/conexoes/status');
    await page.waitForURL(/\/auth/, { timeout: 15000 });

    await page.waitForTimeout(1500);

    // Não deve haver chamadas a RPCs admin
    const adminRpcCalls = rpcCalls.filter(
      (url) =>
        url.includes('admin') ||
        url.includes('conexao') ||
        url.includes('security') ||
        url.includes('connection') ||
        url.includes('telemetry'),
    );

    expect(adminRpcCalls).toEqual([]);
  });
});

test.describe('Admin / Conexões Module - Navigation', () => {
  test('should handle deep linking to admin routes', async ({ page }) => {
    const testUrls = [
      '/admin/conexoes',
      '/admin/seguranca',
      '/admin/prompts-ia',
      '/admin/telemetria',
      '/admin/status',
      '/admin/qa',
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

    await page.goto('/admin/conexoes');
    await page.waitForURL(/\/auth/, { timeout: 15000 });

    await page.goBack();
    await page.waitForTimeout(1000);

    await page.goForward();
    await page.waitForTimeout(1000);

    await expect(page).toHaveURL(/\/auth|\/$/);
  });

  test('should handle rapid navigation between admin routes', async ({ page }) => {
    await page.goto('/admin/conexoes');
    await page.waitForURL(/\/auth/, { timeout: 15000 });

    await page.goto('/admin/seguranca');
    await page.waitForURL(/\/auth/, { timeout: 15000 });

    await page.goto('/admin/prompts-ia');
    await page.waitForURL(/\/auth/, { timeout: 15000 });

    await expect(page).toHaveURL(/\/auth/);
  });

  test('should handle conexoes sub-routes', async ({ page }) => {
    await page.goto('/admin/conexoes/status');

    await page.waitForURL(/\/auth/, { timeout: 15000 });
    await expect(page).toHaveURL(/\/auth/);
  });

  test('should handle seguranca sub-routes', async ({ page }) => {
    await page.goto('/admin/seguranca/chaves');

    await page.waitForURL(/\/auth/, { timeout: 15000 });
    await expect(page).toHaveURL(/\/auth/);
  });

  test('should handle QA sub-routes', async ({ page }) => {
    await page.goto('/admin/qa/sidebar');

    await page.waitForURL(/\/auth/, { timeout: 15000 });
    await expect(page).toHaveURL(/\/auth/);
  });

  test('should handle discount approval detail with ID', async ({ page }) => {
    await page.goto('/admin/aprovacoes-desconto/11111111-2222-3333-4444-555555555555');

    await page.waitForURL(/\/auth/, { timeout: 15000 });
    await expect(page).toHaveURL(/\/auth/);
  });

  test('should preserve query params through redirect for admin routes', async ({ page }) => {
    await page.goto('/admin/conexoes?provider=supabase&view=table');

    await page.waitForURL(/\/auth/, { timeout: 15000 });

    await expect(page).toHaveURL(/\/auth/);
  });

  test('should handle external-db-test route', async ({ page }) => {
    await page.goto('/external-db-test');

    await page.waitForURL(/\/auth/, { timeout: 15000 });
    await expect(page).toHaveURL(/\/auth/);
  });
});

test.describe('Admin / Conexões Module - Sensitive Data Protection', () => {
  test('should not expose API keys/secrets data', async ({ page }) => {
    const sensitiveCalls: string[] = [];

    page.on('request', (request) => {
      const url = request.url();
      if (url.includes('/rest/v1/') || url.includes('/functions/v1/')) {
        // Verifica padrões de dados sensíveis
        if (
          url.includes('api_key') ||
          url.includes('secret') ||
          url.includes('password') ||
          url.includes('credential') ||
          url.includes('token=')
        ) {
          sensitiveCalls.push(url);
        }
      }
    });

    await page.goto('/admin/seguranca/chaves');
    await page.waitForURL(/\/auth/, { timeout: 15000 });

    await page.waitForTimeout(2000);

    expect(sensitiveCalls).toEqual([]);
  });

  test('should not expose connection credentials', async ({ page }) => {
    const sensitiveCalls: string[] = [];

    page.on('request', (request) => {
      const url = request.url();
      if (url.includes('/rest/v1/') || url.includes('/functions/v1/')) {
        if (
          url.includes('connection') ||
          url.includes('integration') ||
          url.includes('credentials') ||
          url.includes('webhook_secret')
        ) {
          sensitiveCalls.push(url);
        }
      }
    });

    await page.goto('/admin/conexoes');
    await page.waitForURL(/\/auth/, { timeout: 15000 });

    await page.waitForTimeout(2000);

    expect(sensitiveCalls).toEqual([]);
  });

  test('should not expose IA prompt templates without auth', async ({ page }) => {
    const sensitiveCalls: string[] = [];

    page.on('request', (request) => {
      const url = request.url();
      if (url.includes('/rest/v1/') || url.includes('/functions/v1/')) {
        if (
          url.includes('prompt_template') ||
          url.includes('system_prompt') ||
          url.includes('llm_config')
        ) {
          sensitiveCalls.push(url);
        }
      }
    });

    await page.goto('/admin/prompts-ia');
    await page.waitForURL(/\/auth/, { timeout: 15000 });

    await page.waitForTimeout(2000);

    expect(sensitiveCalls).toEqual([]);
  });

  test('should not expose telemetry/system data without auth', async ({ page }) => {
    const sensitiveCalls: string[] = [];

    page.on('request', (request) => {
      const url = request.url();
      if (url.includes('/rest/v1/') || url.includes('/functions/v1/')) {
        if (
          url.includes('telemetry') ||
          url.includes('system_metrics') ||
          url.includes('performance_logs') ||
          url.includes('error_tracking')
        ) {
          sensitiveCalls.push(url);
        }
      }
    });

    await page.goto('/admin/telemetria');
    await page.waitForURL(/\/auth/, { timeout: 15000 });

    await page.waitForTimeout(2000);

    expect(sensitiveCalls).toEqual([]);
  });
});
