import type { Page, Route } from '@playwright/test';

import { installMockAuth, isMockAuthEnabled } from './mock-auth';

const PRODUCT_ID = '10000000-0000-4000-8000-000000000001';
const CATEGORY_ID = '20000000-0000-4000-8000-000000000001';
const SUPPLIER_ID = '30000000-0000-4000-8000-000000000001';
const USER_ID = '00000000-0000-0000-0000-e2e0e2e0e2e0';
const ONBOARDING_ID = '70000000-0000-4000-8000-000000000001';

const SWATCHES = [
  {
    variant_id: '40000000-0000-4000-8000-000000000001',
    sku: 'E2E-SWATCH-AZUL',
    color_id: '50000000-0000-4000-8000-000000000001',
    color_name: 'Azul',
    color_hex: '#2563EB',
    stock_quantity: 18,
    image_url: '/placeholder.svg',
    is_in_stock: true,
  },
  {
    variant_id: '40000000-0000-4000-8000-000000000002',
    sku: 'E2E-SWATCH-VERMELHO',
    color_id: '50000000-0000-4000-8000-000000000002',
    color_name: 'Vermelho',
    color_hex: '#DC2626',
    stock_quantity: 12,
    image_url: '/placeholder.svg',
    is_in_stock: true,
  },
] as const;

const PRODUCT = {
  id: PRODUCT_ID,
  name: 'Produto E2E com cores',
  slug: 'produto-e2e-com-cores',
  sku: 'E2E-SWATCH-001',
  supplier_reference: 'REF-E2E-001',
  short_description: 'Fixture determinística para validar swatches e QuickView.',
  sale_price: 49.9,
  cost_price: 30,
  primary_image_url: '/placeholder.svg',
  primary_image_fallback_url: '/placeholder.svg',
  set_image_url: null,
  supplier_id: SUPPLIER_ID,
  supplier_name: 'Fornecedor E2E',
  supplier_code: 'E2E',
  category_id: CATEGORY_ID,
  main_category_id: CATEGORY_ID,
  brand: 'Promo E2E',
  is_active: true,
  active: true,
  stock_quantity: 30,
  total_stock: 30,
  min_quantity: 1,
  is_kit: false,
  is_new: true,
  is_stockout: false,
  is_low_stock: false,
  is_featured: true,
  is_bestseller: false,
  is_on_sale: false,
  allows_personalization: false,
  has_commercial_packaging: false,
  created_at: '2026-11-01T12:00:00.000Z',
  novelty_detected_at: '2026-11-01T12:00:00.000Z',
  novelty_expires_at: '2026-11-30T12:00:00.000Z',
  gender: null,
  price_updated_at: '2026-11-01T12:00:00.000Z',
  ai_title: null,
  ai_description: null,
  ai_summary: null,
  ai_version: null,
  ai_generated_at: null,
  leaf_category_id: CATEGORY_ID,
  leaf_category_name: 'Categoria E2E',
  leaf_category_level: 1,
  color_swatches: SWATCHES,
  has_colors: true,
};

const VARIANTS = SWATCHES.map((swatch) => ({
  id: swatch.variant_id,
  product_id: PRODUCT_ID,
  sku: swatch.sku,
  color_id: swatch.color_id,
  color_name: swatch.color_name,
  color_hex: swatch.color_hex,
  stock_quantity: swatch.stock_quantity,
  selected_thumbnail: swatch.image_url,
  primary_image_url: swatch.image_url,
  images: [swatch.image_url],
  is_active: true,
  active: true,
}));

const PROFILE_AND_ROLES = {
  profile: {
    id: USER_ID,
    user_id: USER_ID,
    email: 'e2e-mock@promogifts.local',
    full_name: 'E2E Mock User',
    role: 'vendedor',
    avatar_url: null,
    phone: null,
    department: null,
    is_active: true,
    last_login_at: null,
    preferences: {},
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
  },
  roles: ['vendedor'],
};

function json(route: Route, body: unknown, count?: number) {
  const headers: Record<string, string> =
    count === undefined ? {} : { 'content-range': count === 0 ? '*/0' : `0-${count - 1}/${count}` };
  return route.fulfill({
    status: 200,
    contentType: 'application/json',
    headers,
    body: route.request().method() === 'HEAD' ? '' : JSON.stringify(body),
  });
}

function requestedOffset(route: Route): number {
  const request = route.request();
  const url = new URL(request.url());
  const rangeStart = /^(\d+)-/.exec(request.headers().range ?? '')?.[1];
  return Number(url.searchParams.get('offset') ?? rangeStart ?? '0');
}

/**
 * Isola as suítes de swatch de Auth/PostgREST externos. Os componentes, rotas,
 * modos de layout e interações continuam reais; apenas os dados são fixos.
 */
export async function installSwatchCatalogMocks(
  page: Page,
  options: { force?: boolean } = {},
): Promise<void> {
  if (!options.force && !isMockAuthEnabled()) return;

  await installMockAuth(page);

  // Fallback REST primeiro; handlers específicos registrados depois têm
  // precedência no Playwright (ordem LIFO).
  await page.route(/\/rest\/v1\//, (route) => json(route, [], 0));

  await page.route(/\/rest\/v1\/(?:v_products_public|products)(?:\?|$)/, (route) => {
    const firstPage = requestedOffset(route) === 0;
    return json(route, firstPage ? [PRODUCT] : [], firstPage ? 1 : 0);
  });
  await page.route(/\/rest\/v1\/product_variants(?:\?|$)/, (route) => {
    const firstPage = requestedOffset(route) === 0;
    return json(route, firstPage ? VARIANTS : [], firstPage ? VARIANTS.length : 0);
  });
  await page.route(/\/rest\/v1\/product_images(?:\?|$)/, (route) =>
    json(
      route,
      [
        {
          id: '60000000-0000-4000-8000-000000000001',
          product_id: PRODUCT_ID,
          variant_id: SWATCHES[0].variant_id,
          url: '/placeholder.svg',
          image_url: '/placeholder.svg',
          is_primary: true,
          sort_order: 0,
        },
      ],
      1,
    ),
  );
  await page.route(/\/rest\/v1\/categories(?:\?|$)/, (route) =>
    json(route, [{ id: CATEGORY_ID, name: 'Categoria E2E', active: true }], 1),
  );
  await page.route(/\/rest\/v1\/suppliers(?:\?|$)/, (route) =>
    json(route, [{ id: SUPPLIER_ID, name: 'Fornecedor E2E', code: 'E2E', active: true }], 1),
  );
  await page.route(/\/rest\/v1\/system_settings(?:\?|$)/, (route) => json(route, [], 0));
  await page.route(/\/rest\/v1\/user_onboarding(?:\?|$)/, (route) =>
    json(
      route,
      [
        {
          id: ONBOARDING_ID,
          user_id: USER_ID,
          has_completed_tour: true,
          current_step: 12,
          completed_at: '2026-01-01T00:00:00.000Z',
          created_at: '2026-01-01T00:00:00.000Z',
          updated_at: '2026-01-01T00:00:00.000Z',
        },
      ],
      1,
    ),
  );

  await page.route(/\/rest\/v1\/rpc\/get_profile_and_roles(?:\?|$)/, (route) =>
    json(route, PROFILE_AND_ROLES),
  );
  await page.route(/\/rest\/v1\/rpc\/fn_get_color_swatches_batch(?:\?|$)/, (route) =>
    json(route, [{ product_id: PRODUCT_ID, color_swatches: SWATCHES }]),
  );
  await page.route(/\/rest\/v1\/rpc\/fn_get_reposicao_listing(?:\?|$)/, (route) =>
    json(route, [
      {
        product_id: PRODUCT_ID,
        name: PRODUCT.name,
        slug: PRODUCT.slug,
        sku: PRODUCT.sku,
        sale_price: PRODUCT.sale_price,
        is_stockout: false,
        is_new: true,
        total_stock: PRODUCT.total_stock,
        primary_image_url: PRODUCT.primary_image_url,
        primary_image_cdn: PRODUCT.primary_image_url,
        supplier_id: SUPPLIER_ID,
        supplier_name: PRODUCT.supplier_name,
        supplier_code: PRODUCT.supplier_code,
        ultimo_restock_date: '2026-11-01',
        earliest_restock_date: null,
        earliest_restock_qty: null,
        has_upcoming_restock: false,
        category_names: ['Categoria E2E'],
        primary_category_id: CATEGORY_ID,
        primary_category_name: 'Categoria E2E',
        is_low_stock: false,
      },
    ]),
  );

  await page.route('**/functions/v1/get-visitor-info**', (route) =>
    json(route, { ip: '127.0.0.1' }),
  );
  await page.route('**/functions/v1/validate-access**', (route) =>
    json(route, { allowed: true, reason: 'e2e_mock' }),
  );
}
