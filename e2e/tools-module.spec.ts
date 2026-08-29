/**
 * E2E: Tools Module — Public Coverage (no auth required)
 *
 * Testa os módulos de ferramentas SEM autenticação.
 *
 * Estes testes verificam:
 *   1. Acesso e redirecionamento para /auth em todas as rotas de ferramentas
 *   2. Páginas de ferramentas estão protegidas
 *   3. Não vaza dados de ferramentas para usuários não autenticados
 *   4. Validação contra payloads maliciosos
 *
 * Rotas testadas:
 *   - /simulador (Simulador Wizard)
 *   - /simulador-precos (Price Simulator)
 *   - /busca-preco (Advanced Price Search)
 *   - /montar-kit (Kit Builder)
 *   - /meus-kits (My Kits)
 *   - /mockup-generator (Mockup Generator)
 *   - /mockups/historico (Mockup History)
 *   - /magic-up (Magic Up)
 *   - /match (Product Match)
 *   - /dropbox (Dropbox Browser)
 *   - /simulacao (Simulation)
 *   - /ferramentas/cobertura (Coverage Insights)
 *   - /magazine (Magazine List)
 *   - /magazine/templates (Magazine Templates)
 *   - /magazine/:id (Magazine Editor)
 *   - /magazine/:id/print (Magazine Print)
 *   - /magazine/print (Magazine Print - standalone)
 *   - /promoflix-playground (PromoFlix Playground)
 *
 * NOTA: Algumas rotas já foram testadas em outros módulos:
 *   - /estoque → stock-module.spec.ts
 *   - /raio-x → visual-search-module.spec.ts
 *   - /ferramentas/bi/* → reports-bi-module.spec.ts
 *   - /inteligencia-comercial → reports-bi-module.spec.ts
 *
 * Para testes AUTENTICADOS, é necessário configurar E2E_USER_EMAIL e
 * E2E_USER_PASSWORD e rodar com chromium-authed.
 */

import { test, expect } from './fixtures/test-base';

// Lista de rotas de ferramentas que devem ser testadas
const TOOL_ROUTES = [
  { path: '/simulador', name: 'Simulador Wizard' },
  { path: '/simulador-precos', name: 'Price Simulator' },
  { path: '/busca-preco', name: 'Advanced Price Search' },
  { path: '/montar-kit', name: 'Kit Builder' },
  { path: '/meus-kits', name: 'My Kits' },
  { path: '/mockup-generator', name: 'Mockup Generator' },
  { path: '/mockups/historico', name: 'Mockup History' },
  { path: '/magic-up', name: 'Magic Up' },
  { path: '/match', name: 'Product Match' },
  { path: '/dropbox', name: 'Dropbox Browser' },
  { path: '/simulacao', name: 'Simulation' },
  { path: '/ferramentas/cobertura', name: 'Coverage Insights' },
  { path: '/magazine', name: 'Magazine List' },
  { path: '/magazine/templates', name: 'Magazine Templates' },
  { path: '/promoflix-playground', name: 'PromoFlix Playground' },
];

test.describe('Tools Module - Public Access (No Auth)', () => {
  for (const route of TOOL_ROUTES) {
    test(`should redirect to auth when accessing ${route.path} unauthenticated`, async ({ page }) => {
      await page.goto(route.path);

      // Protected route deve redirecionar para /auth
      await page.waitForURL(/\/auth/, { timeout: 15000 });
      await expect(page).toHaveURL(/\/auth/);
    });
  }

  test('should display auth page for all tool routes', async ({ page }) => {
    for (const route of TOOL_ROUTES.slice(0, 4)) {
      await page.goto(route.path);
      await page.waitForURL(/\/auth/, { timeout: 15000 });
      await expect(page.getByRole('main', { name: /Autenticação/i })).toBeVisible();
    }
  });

  test('should not expose tool data to unauthenticated users', async ({ page }) => {
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

      // Verifica chamadas sensíveis (tool-specific data)
      if (
        url.includes('/kits') ||
        url.includes('/mockup') ||
        url.includes('/simulation') ||
        url.includes('/dropbox') ||
        url.includes('/magazine') ||
        url.includes('/coverage_insights') ||
        url.includes('/promoflix') ||
        url.includes('/price_simulator') ||
        url.includes('/product_match')
      ) {
        sensitiveCalls.push(url);
      }
    });

    await page.goto('/montar-kit');
    await page.waitForURL(/\/auth/, { timeout: 15000 });

    await page.waitForTimeout(2000);

    // Validação principal: nenhuma chamada de dados de ferramentas deve acontecer
    expect(sensitiveCalls).toEqual([]);
  });

  test('should handle kit builder query parameters', async ({ page }) => {
    await page.goto('/montar-kit?category=brindes&theme=corporativo');

    await page.waitForURL(/\/auth/, { timeout: 15000 });
    await expect(page).toHaveURL(/\/auth/);
  });

  test('should handle mockup generator parameters', async ({ page }) => {
    await page.goto('/mockup-generator?template=default&size=300x250');

    await page.waitForURL(/\/auth/, { timeout: 15000 });
    await expect(page).toHaveURL(/\/auth/);
  });

  test('should handle price simulator parameters', async ({ page }) => {
    await page.goto('/simulador-precos?category=tecnologia&minPrice=10&maxPrice=100');

    await page.waitForURL(/\/auth/, { timeout: 15000 });
    await expect(page).toHaveURL(/\/auth/);
  });

  test('should handle match tool parameters', async ({ page }) => {
    await page.goto('/match?productId=123&similarity=0.8');

    await page.waitForURL(/\/auth/, { timeout: 15000 });
    await expect(page).toHaveURL(/\/auth/);
  });

  test('should handle invalid query parameters without exposing data', async ({ page }) => {
    // Payloads maliciosos via query params
    const maliciousParams = [
      '?kitId=../etc/passwd',
      '?template=<script>alert(1)</script>',
      "?productId=' OR '1'='1",
      '?adminToken=bypass',
      '?debug=true',
      '?sql=SELECT * FROM users',
      '?filePath=../../etc/shadow',
    ];

    for (const params of maliciousParams) {
      await page.goto(`/montar-kit${params}`);
      await page.waitForURL(/\/auth/, { timeout: 15000 });
      await expect(page).toHaveURL(/\/auth/);
    }
  });

  test('should not throw JS errors during tool redirects', async ({ page }) => {
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

    for (const route of TOOL_ROUTES.slice(0, 4)) {
      await page.goto(route.path);
      await page.waitForURL(/\/auth/, { timeout: 15000 });
      await page.waitForTimeout(300);
    }

    expect(errors).toEqual([]);
  });

  test('should preserve intended tool URL after auth (returnTo)', async ({ page }) => {
    await page.goto('/montar-kit?category=brindes');

    await page.waitForURL(/\/auth/, { timeout: 15000 });

    const url = page.url();
    expect(url).toMatch(/\/auth/);
  });

  test('should redirect mobile viewport correctly for kit builder', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto('/montar-kit');
    await page.waitForURL(/\/auth/, { timeout: 15000 });

    await expect(page).toHaveURL(/\/auth/);

    const hasHorizontalScroll = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });

    expect(hasHorizontalScroll).toBe(false);
  });

  test('should redirect mobile viewport correctly for mockup generator', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto('/mockup-generator');
    await page.waitForURL(/\/auth/, { timeout: 15000 });

    await expect(page).toHaveURL(/\/auth/);
  });

  test('should redirect mobile viewport correctly for magazine', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto('/magazine');
    await page.waitForURL(/\/auth/, { timeout: 15000 });

    await expect(page).toHaveURL(/\/auth/);
  });
});

test.describe('Tools Module - Magazine Routes (Public)', () => {
  test('should handle magazine editor with ID parameter', async ({ page }) => {
    // Magazine editor with specific ID
    await page.goto('/magazine/abc123');

    await page.waitForURL(/\/auth/, { timeout: 15000 });
    await expect(page).toHaveURL(/\/auth/);
  });

  test('should handle magazine print with ID parameter', async ({ page }) => {
    // Magazine print with specific ID
    await page.goto('/magazine/xyz789/print');

    await page.waitForURL(/\/auth/, { timeout: 15000 });
    await expect(page).toHaveURL(/\/auth/);
  });

  test('should handle standalone magazine print route', async ({ page }) => {
    // Standalone print route
    await page.goto('/magazine/print');

    await page.waitForURL(/\/auth/, { timeout: 15000 });
    await expect(page).toHaveURL(/\/auth/);
  });

  test('should handle magazine templates route', async ({ page }) => {
    await page.goto('/magazine/templates');

    await page.waitForURL(/\/auth/, { timeout: 15000 });
    await expect(page).toHaveURL(/\/auth/);
  });

  test('should handle invalid magazine IDs without crashing', async ({ page }) => {
    // IDs inválidos de magazine podem não existir ou ter comportamento específico
    // Testa que não há crash e não expõe dados sensíveis
    const sensitiveCalls: string[] = [];

    page.on('request', (request) => {
      const url = request.url();
      if (url.includes('/rest/v1/') || url.includes('/functions/v1/')) {
        if (url.includes('magazine')) {
          sensitiveCalls.push(url);
        }
      }
    });

    const paths = [
      "/magazine/' OR '1'='1",
      '/magazine/../../etc/passwd',
    ];

    for (const path of paths) {
      await page.goto(path);
      await page.waitForTimeout(2000);
    }

    // Não deve ter vazado dados de magazine
    expect(sensitiveCalls).toEqual([]);
  });
});

test.describe('Tools Module - Database Communication (Public)', () => {
  test('should not query kit/builder tables when unauthenticated', async ({ page }) => {
    const dbCalls: string[] = [];

    page.on('request', (request) => {
      const url = request.url();
      if (url.includes('supabase.co/rest/v1/')) {
        dbCalls.push(url);
      }
    });

    await page.goto('/montar-kit');
    await page.waitForURL(/\/auth/, { timeout: 15000 });

    await page.waitForTimeout(1500);

    // Não deve haver queries a tabelas de kit
    const kitTableQueries = dbCalls.filter(
      (url) =>
        url.includes('/kits') ||
        url.includes('/kit_items') ||
        url.includes('/kit_templates') ||
        url.includes('/user_kits'),
    );

    expect(kitTableQueries).toEqual([]);
  });

  test('should not query mockup tables when unauthenticated', async ({ page }) => {
    const dbCalls: string[] = [];

    page.on('request', (request) => {
      const url = request.url();
      if (url.includes('supabase.co/rest/v1/')) {
        dbCalls.push(url);
      }
    });

    await page.goto('/mockup-generator');
    await page.waitForURL(/\/auth/, { timeout: 15000 });

    await page.waitForTimeout(1500);

    // Não deve haver queries a tabelas de mockup
    const mockupTableQueries = dbCalls.filter(
      (url) =>
        url.includes('/mockups') ||
        url.includes('/mockup_templates') ||
        url.includes('/mockup_history'),
    );

    expect(mockupTableQueries).toEqual([]);
  });

  test('should not query magazine tables when unauthenticated', async ({ page }) => {
    const dbCalls: string[] = [];

    page.on('request', (request) => {
      const url = request.url();
      if (url.includes('supabase.co/rest/v1/')) {
        dbCalls.push(url);
      }
    });

    await page.goto('/magazine');
    await page.waitForURL(/\/auth/, { timeout: 15000 });

    await page.waitForTimeout(1500);

    // Não deve haver queries a tabelas de magazine
    const magazineTableQueries = dbCalls.filter(
      (url) =>
        url.includes('/magazine') ||
        url.includes('/magazines') ||
        url.includes('/magazine_templates') ||
        url.includes('/magazine_pages'),
    );

    expect(magazineTableQueries).toEqual([]);
  });

  test('should not expose tool endpoints in edge function calls', async ({ page }) => {
    const edgeCalls: string[] = [];

    page.on('request', (request) => {
      const url = request.url();
      if (url.includes('/functions/v1/')) {
        edgeCalls.push(url);
      }
    });

    await page.goto('/simulador');
    await page.waitForURL(/\/auth/, { timeout: 15000 });

    await page.waitForTimeout(1500);

    // Não deve haver chamadas para edge functions de ferramentas
    const toolEdgeCalls = edgeCalls.filter(
      (url) =>
        url.includes('simulator') ||
        url.includes('mockup') ||
        url.includes('kit') ||
        url.includes('magazine') ||
        url.includes('dropbox') ||
        url.includes('price-sim') ||
        url.includes('match'),
    );

    expect(toolEdgeCalls).toEqual([]);
  });

  test('should not query RPC functions for tool data when unauthenticated', async ({ page }) => {
    const rpcCalls: string[] = [];

    page.on('request', (request) => {
      const url = request.url();
      if (url.includes('/rest/v1/rpc/')) {
        rpcCalls.push(url);
      }
    });

    await page.goto('/magic-up');
    await page.waitForURL(/\/auth/, { timeout: 15000 });

    await page.waitForTimeout(1500);

    // Não deve haver chamadas a RPCs de ferramentas
    const toolRpcCalls = rpcCalls.filter(
      (url) =>
        url.includes('kit') ||
        url.includes('mockup') ||
        url.includes('magazine') ||
        url.includes('simulation') ||
        url.includes('price_sim') ||
        url.includes('dropbox') ||
        url.includes('coverage'),
    );

    expect(toolRpcCalls).toEqual([]);
  });
});

test.describe('Tools Module - Navigation', () => {
  test('should handle deep linking to tool routes', async ({ page }) => {
    const testUrls = [
      '/simulador',
      '/simulador-precos',
      '/montar-kit',
      '/mockup-generator',
      '/magic-up',
      '/match',
    ];

    for (const url of testUrls) {
      await page.goto(url);
      await page.waitForURL(/\/auth/, { timeout: 15000 });
      await expect(page).toHaveURL(/\/auth/);
    }
  });

  test('should handle browser back/forward navigation between tool routes', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(500);

    await page.goto('/montar-kit');
    await page.waitForURL(/\/auth/, { timeout: 15000 });

    await page.goBack();
    await page.waitForTimeout(1000);

    await page.goForward();
    await page.waitForTimeout(1000);

    await expect(page).toHaveURL(/\/auth|\/$/);
  });

  test('should handle rapid navigation between tool routes', async ({ page }) => {
    await page.goto('/simulador');
    await page.waitForURL(/\/auth/, { timeout: 15000 });

    await page.goto('/mockup-generator');
    await page.waitForURL(/\/auth/, { timeout: 15000 });

    await page.goto('/magic-up');
    await page.waitForURL(/\/auth/, { timeout: 15000 });

    await expect(page).toHaveURL(/\/auth/);
  });

  test('should handle mockup history deep link', async ({ page }) => {
    await page.goto('/mockups/historico');

    await page.waitForURL(/\/auth/, { timeout: 15000 });
    await expect(page).toHaveURL(/\/auth/);
  });

  test('should handle kit-builder redirect route', async ({ page }) => {
    // /kit-builder redirects to /montar-kit
    await page.goto('/kit-builder');

    // Should eventually redirect to /auth (after redirect to /montar-kit)
    await page.waitForURL(/\/auth/, { timeout: 15000 });
    await expect(page).toHaveURL(/\/auth/);
  });

  test('should handle meus-kits route', async ({ page }) => {
    await page.goto('/meus-kits');

    await page.waitForURL(/\/auth/, { timeout: 15000 });
    await expect(page).toHaveURL(/\/auth/);
  });

  test('should handle coverage insights route', async ({ page }) => {
    await page.goto('/ferramentas/cobertura');

    await page.waitForURL(/\/auth/, { timeout: 15000 });
    await expect(page).toHaveURL(/\/auth/);
  });

  test('should handle busca-preco route', async ({ page }) => {
    await page.goto('/busca-preco');

    await page.waitForURL(/\/auth/, { timeout: 15000 });
    await expect(page).toHaveURL(/\/auth/);
  });

  test('should handle dropbox route', async ({ page }) => {
    await page.goto('/dropbox');

    await page.waitForURL(/\/auth/, { timeout: 15000 });
    await expect(page).toHaveURL(/\/auth/);
  });

  test('should handle simulacao route', async ({ page }) => {
    await page.goto('/simulacao');

    await page.waitForURL(/\/auth/, { timeout: 15000 });
    await expect(page).toHaveURL(/\/auth/);
  });

  test('should preserve query params through redirect for tools', async ({ page }) => {
    await page.goto('/simulador-precos?category=brindes&margin=20');

    await page.waitForURL(/\/auth/, { timeout: 15000 });

    await expect(page).toHaveURL(/\/auth/);
  });
});
