/**
 * Fixture de dataset determinístico para a suíte 03b (QuickView).
 *
 * Estratégia: intercepta somente o detalhe REST-native de `products` e as
 * imagens relacionadas, mantendo as listagens reais dos módulos. Assim a
 * suíte ainda prova que cada módulo expõe um QuickViewThumb, mas o conteúdo
 * do modal não depende de latência, RLS ou mutação do catálogo canônico.
 *
 * Use em `test.beforeEach` quando o spec precisar de produto previsível.
 * Para testes que validam o ambiente real (smoke), NÃO use esta fixture.
 */
import type { Page, Route } from '@playwright/test';

export const FIXTURE_PRODUCT = {
  id: 'qv-fixture-0001',
  name: 'Produto Fixture QuickView',
  sku: 'QV-FIX-001',
  brand: 'FixtureCorp',
  is_active: true,
  stock_quantity: 50,
  min_quantity: 10,
  primary_image_url: null,
  images: [],
  category_id: null,
  main_category_id: null,
  supplier_id: null,
  supplier_reference: null,
  description: 'Produto sintético para validar o QuickView.',
  short_description: 'Fixture determinística',
  materials: ['Material fixture'],
  colors: [
    { name: 'Azul Fixture', hex: '#2563eb', stock: 30 },
    { name: 'Preto Fixture', hex: '#111827', stock: 20 },
  ],
} as const;

export const PRODUCT_DETAIL_ROUTE = '**/rest/v1/v_products_public*';
export const PRODUCT_IMAGES_ROUTE = '**/rest/v1/product_images*';
export const PRODUCT_VARIANTS_ROUTE = '**/rest/v1/product_variants*';
export const PRODUCT_VIDEOS_ROUTE = '**/rest/v1/product_videos*';

function requestedEq(rawUrl: string, field: string): string | null {
  const url = new URL(rawUrl);
  const filter = url.searchParams.get(field);
  if (!filter?.startsWith('eq.')) return null;
  return filter.slice(3) || null;
}

async function fulfillEmptyDetail(route: Route) {
  if (route.request().method() !== 'GET') return route.fallback();
  if (!requestedEq(route.request().url(), 'product_id')) return route.fallback();
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    headers: {
      'access-control-allow-origin': '*',
      'access-control-expose-headers': 'content-range',
      'content-range': '*/0',
    },
    body: '[]',
  });
}

/** Instala interceptadores. Idempotente — pode ser chamado múltiplas vezes. */
export async function installQuickViewDataset(page: Page) {
  await page.route(PRODUCT_DETAIL_ROUTE, async (route) => {
    if (route.request().method() !== 'GET') return route.fallback();
    const productId = requestedEq(route.request().url(), 'id');
    // Listagens continuam reais; apenas `fetchProductById` é estabilizado.
    if (!productId) return route.fallback();
    const rows = [{ ...FIXTURE_PRODUCT, id: productId }];
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: {
        'access-control-allow-origin': '*',
        'access-control-expose-headers': 'content-range',
        'content-range': '0-0/1',
      },
      body: JSON.stringify(rows),
    });
  });

  await page.route(PRODUCT_IMAGES_ROUTE, fulfillEmptyDetail);
  await page.route(PRODUCT_VARIANTS_ROUTE, fulfillEmptyDetail);
  await page.route(PRODUCT_VIDEOS_ROUTE, fulfillEmptyDetail);
}

/** Restaura a rota — usar em afterAll/afterEach quando necessário. */
export async function teardownQuickViewDataset(page: Page) {
  await page.unroute(PRODUCT_DETAIL_ROUTE).catch(() => undefined);
  await page.unroute(PRODUCT_IMAGES_ROUTE).catch(() => undefined);
  await page.unroute(PRODUCT_VARIANTS_ROUTE).catch(() => undefined);
  await page.unroute(PRODUCT_VIDEOS_ROUTE).catch(() => undefined);
}
