import type { Page, Route } from '@playwright/test';
import { test, expect, requireAuth } from '../fixtures/test-base';

// O PDP e o comparador leem o catálogo direto do PostgREST (dbInvoke em
// src/lib/db/postgrest.ts, alias products -> v_products_public); o
// external-db-bridge foi aposentado (410). O SupplierComparisonModal monta
// junto com o PDP e já dispara a busca por categoria no carregamento, então a
// resposta das alternativas precisa estar registrada ANTES da navegação.
const MOCK_ID = '550e8400-e29b-41d4-a716-446655440000';
const CATEGORY_ID = '550e8400-e29b-41d4-a716-4466554400c1';
const SUPPLIER_MAIN_ID = '550e8400-e29b-41d4-a716-4466554400f1';
const SUPPLIER_CHEAP_ID = '550e8400-e29b-41d4-a716-4466554400f2';
const SUPPLIER_PREMIUM_ID = '550e8400-e29b-41d4-a716-4466554400f3';
const ALT_1_ID = '550e8400-e29b-41d4-a716-4466554400a1';
const ALT_2_ID = '550e8400-e29b-41d4-a716-4466554400a2';
const CORS_HEADERS = {
  'access-control-allow-origin': '*',
  'access-control-expose-headers': 'content-range',
};

// Linhas cruas de v_products_public (snake_case), como mapPromobrindToProduct consome.
const mockBaseRow = {
  id: MOCK_ID,
  name: 'Caneca de Cerâmica 350ml',
  sale_price: 45.0,
  sku: 'CAN-001',
  stock_quantity: 100,
  colors: [{ name: 'Branco', hex: '#FFFFFF' }],
  materials: ['Cerâmica'],
  category_id: CATEGORY_ID,
  main_category_id: CATEGORY_ID,
  category_name: 'Canecas',
  supplier_id: SUPPLIER_MAIN_ID,
  supplier_name: 'Fornecedor Principal',
  images: ['/placeholder.svg'],
  min_quantity: 50,
  is_active: true,
  active: true,
  is_featured: false,
  is_new: false,
  is_on_sale: false,
  is_kit: false,
};

const mockAlternativeRows = [
  {
    ...mockBaseRow,
    id: ALT_1_ID,
    name: 'Caneca Cerâmica Branca',
    sale_price: 39.9,
    sku: 'ALT-001',
    stock_quantity: 500,
    supplier_id: SUPPLIER_CHEAP_ID,
    supplier_name: 'Fornecedor Barato',
    lead_time_days: 5,
    min_quantity: 100,
  },
  {
    ...mockBaseRow,
    id: ALT_2_ID,
    name: 'Caneca de Porcelana',
    sale_price: 55.0,
    sku: 'ALT-002',
    stock_quantity: 50,
    colors: [
      { name: 'Branco', hex: '#FFFFFF' },
      { name: 'Azul', hex: '#0000FF' },
    ],
    materials: ['Porcelana'],
    supplier_id: SUPPLIER_PREMIUM_ID,
    supplier_name: 'Premium Gifts',
    lead_time_days: 15,
    min_quantity: 10,
  },
];

async function fulfillRows(route: Route, rows: unknown[]): Promise<void> {
  await route.fulfill({
    status: 200,
    headers: { ...CORS_HEADERS, 'content-range': `*/${rows.length}` },
    contentType: 'application/json',
    body: JSON.stringify(rows),
  });
}

/** Mocka o PostgREST do PDP e navega; `respondAlternatives` responde a busca por categoria. */
async function gotoProductDetail(
  page: Page,
  respondAlternatives: (route: Route) => Promise<void>,
): Promise<void> {
  await page.route('**/rest/v1/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    // Nada do PostgREST sai para a produção: RPC devolve null e escrita é aceita localmente.
    if (request.method() !== 'GET' && request.method() !== 'HEAD') {
      if (url.pathname.includes('/rest/v1/rpc/')) {
        return route.fulfill({
          status: 200,
          headers: CORS_HEADERS,
          contentType: 'application/json',
          body: 'null',
        });
      }
      return route.fulfill({ status: 204, headers: CORS_HEADERS, body: '' });
    }

    if (url.pathname.endsWith('/v_products_public')) {
      if (url.searchParams.get('id') === `eq.${MOCK_ID}`) return fulfillRows(route, [mockBaseRow]);
      if (url.searchParams.get('main_category_id') === `eq.${CATEGORY_ID}`) {
        return respondAlternatives(route);
      }
    }

    // Enriquecimentos (imagens, variantes, cores, fornecedores…) e consultas globais
    // do layout: sem resposta local, iriam ao banco real e o modal dependeria dele.
    return fulfillRows(route, []);
  });

  await page.goto(`/produto/${MOCK_ID}`);

  // Ensure page is loaded
  await expect(page.getByText('Caneca de Cerâmica 350ml').first()).toBeVisible();
}

test.describe('Supplier Comparison Modal Visual Regression', () => {
  // Use storageState to ensure we are logged in (handled by playwright.config project)
  test.beforeEach(() => {
    requireAuth();
  });

  test('should match visual snapshot for the comparison modal - List State', async ({ page }) => {
    await gotoProductDetail(page, (route) =>
      fulfillRows(route, [mockBaseRow, ...mockAlternativeRows]),
    );

    // Open modal (find the button)
    await page.click('button:has-text("Comparar Fornecedores")');

    // Wait for modal to be visible and stable
    const modal = page.locator('div[role="dialog"]');
    await expect(modal).toBeVisible();
    await expect(modal.getByText('Comparador de Fornecedores')).toBeVisible();
    await expect(modal.getByText('Fornecedor Barato').first()).toBeVisible();
    await expect(modal).toHaveScreenshot('supplier-comparison-list.png');
  });

  test('should match visual snapshot for the comparison modal - Empty State', async ({ page }) => {
    // Only base product
    await gotoProductDetail(page, (route) => fulfillRows(route, [mockBaseRow]));

    await page.click('button:has-text("Comparar Fornecedores")');
    const modal = page.locator('div[role="dialog"]');
    await expect(modal).toBeVisible();
    await expect(modal.getByText('Nenhuma alternativa encontrada')).toBeVisible();
    await expect(modal).toHaveScreenshot('supplier-comparison-empty.png');
  });

  test('should match visual snapshot for the comparison modal - Loading State', async ({
    page,
  }) => {
    // Just return a promise that never resolves
    await gotoProductDetail(page, () => new Promise(() => {}));

    await page.click('button:has-text("Comparar Fornecedores")');
    const modal = page.locator('div[role="dialog"]');
    await expect(modal).toBeVisible();

    // Check for skeletons (Skeleton de src/components/ui/skeleton.tsx usa .skeleton-shimmer)
    await expect(modal.locator('.skeleton-shimmer').first()).toBeVisible();
    await expect(modal).toHaveScreenshot('supplier-comparison-loading.png');
  });

  test('should match visual snapshot for the comparison modal - Error State', async ({ page }) => {
    // Intercept to return error
    await gotoProductDetail(page, (route) =>
      route.fulfill({
        status: 500,
        headers: CORS_HEADERS,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Internal Server Error' }),
      }),
    );

    // Sem estado de erro no modal: useProducts lança (throwOnError padrão) e o
    // EnhancedErrorBoundary do ProtectedRoute assume a tela. A busca dispara na
    // montagem do PDP, então o fallback aparece sem depender do clique.
    await expect(page.getByText('Falha no Módulo')).toBeVisible({ timeout: 30_000 });
    await expect(
      page.getByText('Ocorreu um erro inesperado ao carregar esta seção.'),
    ).toBeVisible();
    await expect(page).toHaveScreenshot('supplier-comparison-error.png');
  });
});
