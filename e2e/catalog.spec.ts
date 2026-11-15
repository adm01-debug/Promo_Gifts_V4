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
    const isOpen = await categoryTrigger.getAttribute('data-state-open');
    if (isOpen !== 'true') {
      await categoryTrigger.click();
    }

    // Click first available category checkbox
    const firstCategoryCheckbox = page.locator('[role="checkbox"]').first();
    await expect(firstCategoryCheckbox).toBeVisible({ timeout: 5000 });
    await firstCategoryCheckbox.click();

    // Apply price filter
    const priceTrigger = page.locator('[data-testid="filter-section-trigger-preco"]');
    const isPriceOpen = await priceTrigger.getAttribute('data-state-open');
    if (isPriceOpen !== 'true') {
      await priceTrigger.click();
    }
    // O input de mínimo não tem placeholder (só o de máximo tem "Sem limite").
    await page.locator('input[type="number"]').first().fill("50");
    await page.locator('input[placeholder="Sem limite"]').first().fill("200");

    // Wait for network/results update
    await page.waitForTimeout(1000);

    // Check URL contains price filter params
    // useFiltersPageState serializa a faixa de preço como priceMin/priceMax.
    await expect(page).toHaveURL(/[?&]priceMin=50(&|$)/);
    await expect(page).toHaveURL(/[?&]priceMax=200(&|$)/);
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
    // /produtos lê só search e priceMin/priceMax. Há produto a R$ 0,00, então a
    // faixa começa em 0.01 para a combinação ser de fato impossível.
    await gotoAndSettle(page, "/produtos?search=zzz-impossible-product-xyz&priceMin=0.01&priceMax=0.02");
    const body = page.locator("body");
    await expect(body).toContainText("Nenhum produto encontrado", { timeout: 15000 });
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

    // Mede só a <img> principal do OptimizedImage: exclui o placeholder
    // (aria-hidden) e a imagem "todas as cores" do hover (pointer-events-none,
    // opacity-0 até o hover). Cards fora do viewport/overscan ficam sem src
    // (IntersectionObserver) e não disparam onLoad por design — por isso só
    // contam imagens que o browser de fato carregou.
    const mainImgs = page.locator(
      '[data-testid="virtualized-product-grid"] img[src]:not([aria-hidden]):not(.pointer-events-none)',
    );
    const loadedStats = () =>
      mainImgs.evaluateAll((els) => {
        const loaded = (els as HTMLImageElement[]).filter((el) => el.complete && el.naturalWidth > 0);
        return {
          loaded: loaded.length,
          opacityZero: loaded.filter((el) => el.classList.contains("opacity-0")).length,
        };
      });

    // Aguarda ao menos uma imagem principal carregar (event 'load' real do browser)
    await expect
      .poll(async () => (await loadedStats()).loaded, {
        message: "[E108] Nenhuma <img> principal carregada no grid — provavelmente sem dados.",
        timeout: 15_000,
      })
      .toBeGreaterThan(0);

    // Regressão: imagem já carregada que permanece em opacity-0.
    await expect
      .poll(
        async () => {
          const { loaded, opacityZero } = await loadedStats();
          return `${opacityZero}/${loaded} imgs carregadas ficaram com opacity-0`;
        },
        { timeout: 10_000 },
      )
      .toMatch(/^0\//);
  });
});
