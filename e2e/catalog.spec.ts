/**
 * E2E: Catalog & Filters - All critical routes
 */
import { test, expect } from "./fixtures/test-base";
import { gotoAndSettle } from "./helpers/nav";
import { expectVisibleByTestId } from "./helpers/waits";
import { loginAs } from "./helpers/auth";

test.describe("Catalog & Filters", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page);
  });

  test("should display product list and filters", async ({ page }) => {
    await gotoAndSettle(page, "/produtos");
    await expectVisibleByTestId(page, "virtualized-product-grid");
    await expectVisibleByTestId(page, "filter-section-trigger-categorias");
  });

  test("should apply combined filters and preserve state in URL", async ({ page }) => {
    await gotoAndSettle(page, "/produtos");

    // Open categories section (click only if not already expanded)
    const categoryTrigger = page.locator('[data-testid="filter-section-trigger-categorias"]');
    await expect(categoryTrigger).toBeVisible();
    const isOpen = await categoryTrigger.getAttribute('aria-expanded');
    if (isOpen !== 'true') {
      await categoryTrigger.click();
    }

    // Click first available category checkbox
    const firstCategoryCheckbox = page.locator('[role="checkbox"]').first();
    await expect(firstCategoryCheckbox).toBeVisible({ timeout: 5000 });
    await firstCategoryCheckbox.click();

    // Apply price filter
    const priceTrigger = page.locator('[data-testid="filter-section-trigger-preco"]');
    const isPriceOpen = await priceTrigger.getAttribute('aria-expanded');
    if (isPriceOpen !== 'true') {
      await priceTrigger.click();
    }
    await page.locator('input[placeholder="Ex: 0"]').first().fill("50");
    await page.locator('input[placeholder="Sem limite"]').first().fill("200");

    // Wait for network/results update
    await page.waitForTimeout(1000);

    // Check URL contains price filter params
    expect(page.url()).toContain("priceRange=50");
    expect(page.url()).toContain("priceRange=200");
  });

  test("should handle sorting options", async ({ page }) => {
    await gotoAndSettle(page, "/produtos");
    const sortTrigger = page.locator('[data-testid="catalog-sort-trigger"]');
    await expect(sortTrigger).toBeVisible();
    await sortTrigger.click();
    await page.locator('[data-testid="catalog-sort-item-price-asc"]').click();

    await page.waitForTimeout(500);
    expect(page.url()).toContain("sortBy=price-asc");
  });

  test("should display correct empty state for impossible filter combination", async ({ page }) => {
    await gotoAndSettle(page, "/produtos?priceRange=0&priceRange=1&q=impossibleproductname");
    const body = page.locator("body");
    await expect(body).toContainText("Nenhum produto encontrado", { timeout: 10000 });
  });

  test("should scroll to load more products", async ({ page }) => {
    await gotoAndSettle(page, "/produtos");
    await expectVisibleByTestId(page, "virtualized-product-grid");
    // Verify products loaded
    const productCards = page.locator('[data-testid="product-card"]');
    await expect(productCards.first()).toBeVisible({ timeout: 15000 });
    // If load-more-trigger exists, scroll to it (infinite scroll)
    const loadMore = page.locator('[data-testid="load-more-trigger"]');
    if (await loadMore.isVisible()) {
      await loadMore.scrollIntoViewIfNeeded();
    }
  });

  // ────────────────────────────────────────────────────────────────────
  // Regression — Fix #40 (commit 208e80a)
  // mapLightweightToProduct() retornava "Sem categoria" hardcoded para
  // 100% dos cards. Após o fix, a maioria carrega o nome real via map
  // pré-fetch. O threshold aceita ≤5% para tolerar produtos sem
  // category_id ou queries em paralelo.
  // ────────────────────────────────────────────────────────────────────
  test("catalog cards exibem o nome real da categoria (não 'Sem categoria')", async ({ page }) => {
    await gotoAndSettle(page, "/produtos");
    await expectVisibleByTestId(page, "virtualized-product-grid");

    // Aguarda primeiro card hidratar
    const firstCard = page.locator('[data-testid="product-card"]').first();
    await expect(firstCard).toBeVisible({ timeout: 15_000 });
    const totalCards = await page.locator('[data-testid="product-card"]').count();
    if (totalCards === 0) {
      expect(false, "[E108] Sem cards renderizados — provavelmente sem dados.").toBeTruthy();
      return;
    }

    // Conta cards cujo badge de categoria diz literalmente "Sem categoria".
    // Antes do fix #40, isso era 100% dos cards.
    const badgesSemCat = page.locator('[data-testid="product-card"]').locator("text=Sem categoria");
    const countSem = await badgesSemCat.count();
    const ratio = countSem / totalCards;
    expect(
      ratio,
      `${countSem}/${totalCards} cards ainda exibem 'Sem categoria' (regressão do fix #40)`,
    ).toBeLessThanOrEqual(0.05);
  });

  // ────────────────────────────────────────────────────────────────────
  // Regression — Fix #41 (commit 0676f73)
  // OptimizedImage perdia o onLoad interno quando o consumer passava o
  // próprio. Resultado: opacity-0 permanente em todos os <img>.
  // Aqui asseguramos que após carga, imagens estão visíveis
  // (opacity-100 ou sem classe opacity-0).
  // ────────────────────────────────────────────────────────────────────
  test("OptimizedImage transiciona para opacity-100 após carregar", async ({ page }) => {
    await gotoAndSettle(page, "/produtos");
    await expectVisibleByTestId(page, "virtualized-product-grid");

    // Aguarda primeira imagem do grid carregar (event 'load' real do browser)
    const firstImg = page.locator('[data-testid="virtualized-product-grid"] img').first();
    await expect(firstImg).toBeVisible({ timeout: 15_000 });
    await firstImg.evaluate((el: HTMLImageElement) => {
      if (el.complete && el.naturalWidth > 0) return;
      return new Promise<void>((resolve) => {
        el.addEventListener("load", () => resolve(), { once: true });
        el.addEventListener("error", () => resolve(), { once: true });
      });
    });

    // Conta quantas imagens permaneceram em opacity-0 (regressão)
    const opacityZero = await page.locator('[data-testid="virtualized-product-grid"] img.opacity-0').count();
    const totalImgs = await page.locator('[data-testid="virtualized-product-grid"] img').count();
    if (totalImgs === 0) {
      expect(false, "[E108] Sem <img> no grid — provavelmente sem dados.").toBeTruthy();
      return;
    }
    // Permitimos até 20% ainda em opacity-0 (cards abaixo do viewport / lazy load).
    expect(
      opacityZero / totalImgs,
      `${opacityZero}/${totalImgs} imgs ficaram com opacity-0 após carga`,
    ).toBeLessThanOrEqual(0.2);
  });
});
