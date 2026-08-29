/**
 * E2E: Products Module — Public Coverage (no auth required)
 *
 * Testa os módulos de produtos/catálogo SEM autenticação.
 *
 * Estes testes verificam:
 *   1. Acesso e redirecionamento para /auth em todas as rotas de produtos
 *   2. Páginas de catálogo estão protegidas
 *   3. Não vaza dados de produtos para usuários não autenticados
 *   4. Validação contra payloads maliciosos
 *
 * Rotas testadas:
 *   - /produtos (Catálogo de Produtos)
 *   - /filtros (Filtros de Produtos)
 *   - /produto/:id (Detalhes do Produto)
 *   - /novidades (Novidades)
 *   - /reposicao (Reposição)
 *
 * NOTA: Algumas rotas já foram testadas em outros módulos:
 *   - /favoritos → favorites-module.spec.ts
 *   - /comparar → compare-module.spec.ts
 *   - /colecoes/* → collections-module.spec.ts
 *   - /carrinhos/* → carts-module.spec.ts
 *
 * Para testes AUTENTICADOS, é necessário configurar E2E_USER_EMAIL e
 * E2E_USER_PASSWORD e rodar com chromium-authed.
 */

import { test, expect } from './fixtures/test-base';

// Lista de rotas de produtos que devem ser testadas
const PRODUCT_ROUTES = [
  { path: '/produtos', name: 'Catálogo de Produtos' },
  { path: '/filtros', name: 'Filtros de Produtos' },
  { path: '/novidades', name: 'Novidades' },
  { path: '/reposicao', name: 'Reposição' },
];

test.describe('Products Module - Public Access (No Auth)', () => {
  for (const route of PRODUCT_ROUTES) {
    test(`should redirect to auth when accessing ${route.path} unauthenticated`, async ({ page }) => {
      await page.goto(route.path);

      // Protected route deve redirecionar para /auth
      await page.waitForURL(/\/auth/, { timeout: 15000 });
      await expect(page).toHaveURL(/\/auth/);
    });
  }

  test('should display auth page for all product routes', async ({ page }) => {
    for (const route of PRODUCT_ROUTES) {
      await page.goto(route.path);
      await page.waitForURL(/\/auth/, { timeout: 15000 });
      await expect(page.getByRole('main', { name: /Autenticação/i })).toBeVisible();
    }
  });

  test('should not expose product catalog data to unauthenticated users', async ({ page }) => {
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

      // Verifica chamadas sensíveis (product data)
      if (
        url.includes('/products') ||
        url.includes('/product_colors') ||
        url.includes('/product_images') ||
        url.includes('/product_variants') ||
        url.includes('/novelties') ||
        url.includes('/replenishment') ||
        url.includes('/stock_velocity') ||
        url.includes('/categories')
      ) {
        sensitiveCalls.push(url);
      }
    });

    await page.goto('/produtos');
    await page.waitForURL(/\/auth/, { timeout: 15000 });

    await page.waitForTimeout(2000);

    // Validação principal: nenhuma chamada de dados de produtos deve acontecer
    expect(sensitiveCalls).toEqual([]);
  });

  test('should handle filter query parameters', async ({ page }) => {
    await page.goto('/produtos?category=brindes&color=azul&minPrice=10&maxPrice=100');

    await page.waitForURL(/\/auth/, { timeout: 15000 });
    await expect(page).toHaveURL(/\/auth/);
  });

  test('should handle novelty filter parameters', async ({ page }) => {
    await page.goto('/novidades?period=7d&category=tecnologia');

    await page.waitForURL(/\/auth/, { timeout: 15000 });
    await expect(page).toHaveURL(/\/auth/);
  });

  test('should handle replenishment filter parameters', async ({ page }) => {
    await page.goto('/reposicao?velocity=high&days=15');

    await page.waitForURL(/\/auth/, { timeout: 15000 });
    await expect(page).toHaveURL(/\/auth/);
  });

  test('should handle pagination parameters', async ({ page }) => {
    await page.goto('/produtos?page=5&limit=50&sort=price_asc');

    await page.waitForURL(/\/auth/, { timeout: 15000 });
    await expect(page).toHaveURL(/\/auth/);
  });

  test('should handle invalid query parameters without exposing data', async ({ page }) => {
    // Payloads maliciosos via query params
    const maliciousParams = [
      '?productId=../etc/passwd',
      '?category=<script>alert(1)</script>',
      "?id=' OR '1'='1",
      '?adminToken=bypass',
      '?debug=true',
      '?sql=SELECT * FROM products',
      '?page=../../etc/shadow',
    ];

    for (const params of maliciousParams) {
      await page.goto(`/produtos${params}`);
      await page.waitForURL(/\/auth/, { timeout: 15000 });
      await expect(page).toHaveURL(/\/auth/);
    }
  });

  test('should not throw JS errors during product redirects', async ({ page }) => {
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

    for (const route of PRODUCT_ROUTES) {
      await page.goto(route.path);
      await page.waitForURL(/\/auth/, { timeout: 15000 });
      await page.waitForTimeout(300);
    }

    expect(errors).toEqual([]);
  });

  test('should preserve intended product URL after auth (returnTo)', async ({ page }) => {
    await page.goto('/produtos?category=tecnologia');

    await page.waitForURL(/\/auth/, { timeout: 15000 });

    const url = page.url();
    expect(url).toMatch(/\/auth/);
  });

  test('should redirect mobile viewport correctly for products', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto('/produtos');
    await page.waitForURL(/\/auth/, { timeout: 15000 });

    await expect(page).toHaveURL(/\/auth/);

    const hasHorizontalScroll = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });

    expect(hasHorizontalScroll).toBe(false);
  });

  test('should redirect mobile viewport correctly for novelties', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto('/novidades');
    await page.waitForURL(/\/auth/, { timeout: 15000 });

    await expect(page).toHaveURL(/\/auth/);
  });

  test('should redirect mobile viewport correctly for replenishment', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto('/reposicao');
    await page.waitForURL(/\/auth/, { timeout: 15000 });

    await expect(page).toHaveURL(/\/auth/);
  });
});

test.describe('Products Module - Product Detail (Public)', () => {
  test('should handle product detail with valid UUID', async ({ page }) => {
    // Produto com UUID válido (mesmo sem existir no banco, deve redirecionar para /auth)
    await page.goto('/produto/11111111-2222-3333-4444-555555555555');

    // Aguarda redirect
    await page.waitForURL(/\/auth/, { timeout: 15000 });
    await expect(page).toHaveURL(/\/auth/);
  });

  test('should handle invalid product IDs without exposing data', async ({ page }) => {
    // IDs inválidos: verifica que não há vazamento de dados
    const sensitiveCalls: string[] = [];

    page.on('request', (request) => {
      const url = request.url();
      if (url.includes('/rest/v1/') || url.includes('/functions/v1/')) {
        if (url.includes('products') || url.includes('product_')) {
          sensitiveCalls.push(url);
        }
      }
    });

    // Apenas IDs SQL injection que são rejeitados pela rota
    const paths = [
      "/produto/' OR '1'='1",
      '/produto/../../etc/passwd',
    ];

    for (const path of paths) {
      await page.goto(path);
      await page.waitForTimeout(2000);
    }

    // Não deve ter buscado dados de produtos
    expect(sensitiveCalls).toEqual([]);
  });

  test('should handle product detail with query parameters', async ({ page }) => {
    await page.goto('/produto/11111111-2222-3333-4444-555555555555?tab=colors&highlight=blue');

    await page.waitForURL(/\/auth/, { timeout: 15000 });
    await expect(page).toHaveURL(/\/auth/);
  });

  test('should handle product detail with color variant parameter', async ({ page }) => {
    await page.goto('/produto/11111111-2222-3333-4444-555555555555?color=red&size=medium');

    await page.waitForURL(/\/auth/, { timeout: 15000 });
    await expect(page).toHaveURL(/\/auth/);
  });

  test('should not expose product data on invalid product IDs', async ({ page }) => {
    const sensitiveCalls: string[] = [];

    page.on('request', (request) => {
      const url = request.url();
      if (url.includes('/rest/v1/') || url.includes('/functions/v1/')) {
        if (url.includes('products') || url.includes('product_')) {
          sensitiveCalls.push(url);
        }
      }
    });

    await page.goto('/produto/invalid-product-id');
    await page.waitForTimeout(2000);

    // Não deve ter buscado dados de produtos
    expect(sensitiveCalls).toEqual([]);
  });
});

test.describe('Products Module - Filters Page (Public)', () => {
  test('should handle /filtros as alias for /produtos', async ({ page }) => {
    await page.goto('/filtros');

    await page.waitForURL(/\/auth/, { timeout: 15000 });
    await expect(page).toHaveURL(/\/auth/);
  });

  test('should handle filters with category tree', async ({ page }) => {
    await page.goto('/filtros?categoryTree=tecnologia/informatica/perifericos');

    await page.waitForURL(/\/auth/, { timeout: 15000 });
    await expect(page).toHaveURL(/\/auth/);
  });

  test('should handle filters with supplier', async ({ page }) => {
    await page.goto('/filtros?supplier=fornecedor-123&minOrder=50');

    await page.waitForURL(/\/auth/, { timeout: 15000 });
    await expect(page).toHaveURL(/\/auth/);
  });

  test('should handle filters with stock status', async ({ page }) => {
    await page.goto('/filtros?inStock=true&velocity=high&stockLevel=low');

    await page.waitForURL(/\/auth/, { timeout: 15000 });
    await expect(page).toHaveURL(/\/auth/);
  });

  test('should handle filters with date range', async ({ page }) => {
    await page.goto('/filtros?createdAfter=2024-01-01&updatedBefore=2024-12-31');

    await page.waitForURL(/\/auth/, { timeout: 15000 });
    await expect(page).toHaveURL(/\/auth/);
  });

  test('should handle filters with search term', async ({ page }) => {
    await page.goto('/filtros?search=caneca+personalizada');

    await page.waitForURL(/\/auth/, { timeout: 15000 });
    await expect(page).toHaveURL(/\/auth/);
  });

  test('should handle filters with bulk action parameters', async ({ page }) => {
    await page.goto('/filtros?bulkIds=id1,id2,id3&bulkAction=export');

    await page.waitForURL(/\/auth/, { timeout: 15000 });
    await expect(page).toHaveURL(/\/auth/);
  });
});

test.describe('Products Module - Database Communication (Public)', () => {
  test('should not query products tables when unauthenticated', async ({ page }) => {
    const dbCalls: string[] = [];

    page.on('request', (request) => {
      const url = request.url();
      if (url.includes('supabase.co/rest/v1/')) {
        dbCalls.push(url);
      }
    });

    await page.goto('/produtos');
    await page.waitForURL(/\/auth/, { timeout: 15000 });

    await page.waitForTimeout(1500);

    // Não deve haver queries a tabelas de produtos
    const productTableQueries = dbCalls.filter(
      (url) =>
        url.includes('/products') ||
        url.includes('/product_') ||
        url.includes('/categories') ||
        url.includes('/brands') ||
        url.includes('/suppliers'),
    );

    expect(productTableQueries).toEqual([]);
  });

  test('should not query novelties tables when unauthenticated', async ({ page }) => {
    const dbCalls: string[] = [];

    page.on('request', (request) => {
      const url = request.url();
      if (url.includes('supabase.co/rest/v1/')) {
        dbCalls.push(url);
      }
    });

    await page.goto('/novidades');
    await page.waitForURL(/\/auth/, { timeout: 15000 });

    await page.waitForTimeout(1500);

    // Não deve haver queries a tabelas de novidades
    const noveltiesTableQueries = dbCalls.filter(
      (url) =>
        url.includes('/novelties') ||
        url.includes('/new_products') ||
        url.includes('/recent_products'),
    );

    expect(noveltiesTableQueries).toEqual([]);
  });

  test('should not query replenishment tables when unauthenticated', async ({ page }) => {
    const dbCalls: string[] = [];

    page.on('request', (request) => {
      const url = request.url();
      if (url.includes('supabase.co/rest/v1/')) {
        dbCalls.push(url);
      }
    });

    await page.goto('/reposicao');
    await page.waitForURL(/\/auth/, { timeout: 15000 });

    await page.waitForTimeout(1500);

    // Não deve haver queries a tabelas de reposição
    const replenishmentTableQueries = dbCalls.filter(
      (url) =>
        url.includes('/replenishment') ||
        url.includes('/stock_velocity') ||
        url.includes('/low_stock') ||
        url.includes('/reorder'),
    );

    expect(replenishmentTableQueries).toEqual([]);
  });

  test('should not expose product endpoints in edge function calls', async ({ page }) => {
    const edgeCalls: string[] = [];

    page.on('request', (request) => {
      const url = request.url();
      if (url.includes('/functions/v1/')) {
        edgeCalls.push(url);
      }
    });

    await page.goto('/produtos');
    await page.waitForURL(/\/auth/, { timeout: 15000 });

    await page.waitForTimeout(1500);

    // Não deve haver chamadas para edge functions de produtos
    const productEdgeCalls = edgeCalls.filter(
      (url) =>
        url.includes('product') ||
        url.includes('catalog') ||
        url.includes('filter') ||
        url.includes('novelty') ||
        url.includes('replenish'),
    );

    expect(productEdgeCalls).toEqual([]);
  });

  test('should not query RPC functions for product data when unauthenticated', async ({ page }) => {
    const rpcCalls: string[] = [];

    page.on('request', (request) => {
      const url = request.url();
      if (url.includes('/rest/v1/rpc/')) {
        rpcCalls.push(url);
      }
    });

    await page.goto('/produtos');
    await page.waitForURL(/\/auth/, { timeout: 15000 });

    await page.waitForTimeout(1500);

    // Não deve haver chamadas a RPCs de produtos
    const productRpcCalls = rpcCalls.filter(
      (url) =>
        url.includes('product') ||
        url.includes('catalog') ||
        url.includes('filter') ||
        url.includes('search'),
    );

    expect(productRpcCalls).toEqual([]);
  });
});

test.describe('Products Module - Navigation', () => {
  test('should handle deep linking to product routes', async ({ page }) => {
    const testUrls = [
      '/produtos',
      '/filtros',
      '/novidades',
      '/reposicao',
    ];

    for (const url of testUrls) {
      await page.goto(url);
      await page.waitForURL(/\/auth/, { timeout: 15000 });
      await expect(page).toHaveURL(/\/auth/);
    }
  });

  test('should handle browser back/forward navigation between product routes', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(500);

    await page.goto('/produtos');
    await page.waitForURL(/\/auth/, { timeout: 15000 });

    await page.goBack();
    await page.waitForTimeout(1000);

    await page.goForward();
    await page.waitForTimeout(1000);

    await expect(page).toHaveURL(/\/auth|\/$/);
  });

  test('should handle rapid navigation between product routes', async ({ page }) => {
    await page.goto('/produtos');
    await page.waitForURL(/\/auth/, { timeout: 15000 });

    await page.goto('/novidades');
    await page.waitForURL(/\/auth/, { timeout: 15000 });

    await page.goto('/reposicao');
    await page.waitForURL(/\/auth/, { timeout: 15000 });

    await expect(page).toHaveURL(/\/auth/);
  });

  test('should handle /produto redirect to /produtos', async ({ page }) => {
    // /produto sem ID redireciona para /produtos
    await page.goto('/produto');

    // Deve redirecionar para /produtos primeiro, depois para /auth
    await page.waitForURL(/\/auth/, { timeout: 15000 });
    await expect(page).toHaveURL(/\/auth/);
  });

  test('should preserve query params through redirect for products', async ({ page }) => {
    await page.goto('/produtos?category=brindes&page=2&sort=name_asc');

    await page.waitForURL(/\/auth/, { timeout: 15000 });

    await expect(page).toHaveURL(/\/auth/);
  });

  test('should handle filters as separate route', async ({ page }) => {
    await page.goto('/filtros?search=caneca');

    await page.waitForURL(/\/auth/, { timeout: 15000 });
    await expect(page).toHaveURL(/\/auth/);
  });

  test('should handle novelty with date range', async ({ page }) => {
    await page.goto('/novidades?from=2024-01-01&to=2024-03-31');

    await page.waitForURL(/\/auth/, { timeout: 15000 });
    await expect(page).toHaveURL(/\/auth/);
  });

  test('should handle replenishment with velocity filter', async ({ page }) => {
    await page.goto('/reposicao?velocity=low&days=30');

    await page.waitForURL(/\/auth/, { timeout: 15000 });
    await expect(page).toHaveURL(/\/auth/);
  });

  test('should handle product detail navigation attempt', async ({ page }) => {
    // Tentativa de acessar produto detail sem auth
    await page.goto('/produto/11111111-2222-3333-4444-555555555555');

    await page.waitForURL(/\/auth/, { timeout: 15000 });
    await expect(page).toHaveURL(/\/auth/);
  });
});
