/**
 * Rota: /montar-kit (Kit Builder)
 * Suíte padrão via factory + cenários críticos do fluxo de montagem de kit.
 */
import { test, expect } from "../../fixtures/test-base";
import type { Page } from "@playwright/test";
import { buildAuthedRouteSuite } from "../_factories";
import { gotoAndSettle } from "../../helpers/nav";
import { waitRouteReady, basicA11yChecks } from "../_shared";
import { installMockAuth, isMockAuthEnabled } from "../../helpers/mock-auth";

// The authenticated suite must be executable with the repository's declared
// mock-auth mode. Without this interceptor the synthetic storage state is
// refreshed against the real Supabase Auth endpoint and the route redirects
// before the Kit Maker assertions can exercise the UI.
test.beforeEach(async ({ page }) => {
  if (isMockAuthEnabled()) await installMockAuth(page);
  // The tour is covered separately. It deliberately captures the first visit,
  // so these workflow assertions must start with it completed rather than
  // force-clicking through an unrelated overlay.
  await page.addInitScript(() => localStorage.setItem('kit-tour-completed', '1'));
});

buildAuthedRouteSuite({
  name: "/montar-kit",
  path: "/montar-kit",
  // Kit Maker no longer uses the retired external-db-bridge. It reads the
  // public Gold projection directly through dbInvoke(products ->
  // v_products_public); keeping the old function here made the E2E suite
  // green without exercising its actual data dependency.
  primary: { kind: "rest", key: "v_products_public", successBody: [] },
  happyAssert: async (page) => {
    await expect(page.getByRole("heading", { name: "Kit Maker", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: /começar pelos itens/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /começar pela caixa/i })).toBeVisible();
  },
});

// ---------------------------------------------------------------------------
// Cenários específicos do Kit Builder
// ---------------------------------------------------------------------------

const SAMPLE_PRODUCTS = [
  {
    id: "p1", sku: "CAN-001", name: "Caneta azul", sale_price: 3.5,
    primary_image_url: null, images: [], product_type: "product", active: true, is_featured: true,
  },
  {
    id: "p2", sku: "MOC-001", name: "Mochila", sale_price: 89.9,
    primary_image_url: null, images: [], product_type: "product", active: true, is_featured: true,
  },
  {
    id: "p3", sku: "CAD-001", name: "Caderno", sale_price: 12.0,
    primary_image_url: null, images: [], product_type: "product", active: true, is_featured: true,
  },
];

// This value is only an in-memory prompt sent to a mocked Edge Function; it
// is not persisted and therefore must not be generated as a cleanup resource.
const SAMPLE_AI_PROMPT = "Kit de onboarding sustentável";

async function mockKitCatalog(page: Page, products = SAMPLE_PRODUCTS) {
  await page.route(/\/rest\/v1\/v_products_public(\?|$)/, async (route) => {
    const url = new URL(route.request().url());
    const packagingOnly = url.searchParams.get("product_type") === "eq.packaging";
    const body = packagingOnly ? [] : products;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      headers: { "content-range": `0-${Math.max(body.length - 1, 0)}/${body.length}` },
      body: JSON.stringify(body),
    });
  });
}

test.describe("/montar-kit — fluxos críticos", () => {
  test("happy: página carrega com produtos disponíveis para o kit", async ({ page }) => {
    await mockKitCatalog(page);
    await gotoAndSettle(page, "/montar-kit");
    await waitRouteReady(page);
    await expect(page.getByRole("heading", { name: "Kit Maker", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: /começar pelos itens/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /começar pela caixa/i })).toBeVisible();
  });

  test("as duas jornadas de montagem são ações reais e não cards decorativos", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", e => errors.push(e.message));
    await mockKitCatalog(page);
    await gotoAndSettle(page, "/montar-kit");
    await waitRouteReady(page);
    await page.getByRole("button", { name: /começar pelos itens/i }).click();
    await expect(page.getByPlaceholder("Buscar item...")).toBeVisible();
    expect(errors).toHaveLength(0);
  });

  test("landing não apresenta embalagem como produto em destaque", async ({ page }) => {
    await mockKitCatalog(page, [
      ...SAMPLE_PRODUCTS,
      { ...SAMPLE_PRODUCTS[0], id: "box-1", name: "Caixa Premium", product_type: "packaging" },
    ]);
    await gotoAndSettle(page, "/montar-kit");
    await waitRouteReady(page);
    await expect(page.getByText("Caixa Premium", { exact: true })).toHaveCount(0);
  });

  test("catálogo vazio mantém uma saída acionável, sem estado enganoso", async ({ page }) => {
    await mockKitCatalog(page, []);
    await gotoAndSettle(page, "/montar-kit");
    await waitRouteReady(page);
    await expect(page.getByText("Os destaques ainda não foram definidos no catálogo.")).toBeVisible();
    await expect(page.getByRole("link", { name: /abrir biblioteca/i })).toBeVisible();
  });

  test("AI suggestions: erro 500 na sugestão não quebra o kit builder", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", e => errors.push(e.message));
    await mockKitCatalog(page);
    await page.route(/\/functions\/v1\/kit-ai-builder(\?|$)/, route =>
      route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ error: "internal" }) }),
    );
    await gotoAndSettle(page, "/montar-kit");
    await waitRouteReady(page);
    await page.getByRole("button", { name: /montar com ia/i }).click();
    await page.getByPlaceholder(/kit para 50 colaboradores/i).fill(SAMPLE_AI_PROMPT);
    await page.getByRole("button", { name: /gerar sugestão/i }).click();
    // Radix hides the landing from the accessibility tree while the modal is
    // open; assert the still-interactive dialog instead of a background h1.
    await expect(page.getByRole("heading", { name: /montar kit com ia/i })).toBeVisible();
    await expect(page.getByText("Erro ao gerar sugestão")).toBeVisible();
    expect(errors).toHaveLength(0);
  });

  test("@mobile: kit builder não tem overflow horizontal em 375px", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await mockKitCatalog(page);
    await gotoAndSettle(page, "/montar-kit");
    await waitRouteReady(page);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 2);
    expect(overflow).toBe(false);
  });

  test("landing passa a checagem básica de acessibilidade", async ({ page }) => {
    await mockKitCatalog(page);
    await gotoAndSettle(page, "/montar-kit");
    await waitRouteReady(page);
    await basicA11yChecks(page);
  });
});
