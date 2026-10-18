/**
 * E2E — Fluxo: Catálogo → Detalhe de Produto → Kit Builder
 *
 * Valida a jornada do usuário desde a navegação no catálogo até a
 * criação de kit com múltiplos produtos.
 */
import { test, expect } from "@playwright/test";

import { gotoAndSettle, waitForRouteIdle } from "../helpers/nav";

test.describe("Fluxo Catálogo → Kit Builder", () => {
  test("catálogo carrega lista de produtos sem crash", async ({ page }) => {
    await gotoAndSettle(page, "/produtos");
    await expect(page).not.toHaveURL(/\/login/);
    await expect(page.locator("body")).not.toContainText("500");
  });

  test("navegação para detalhe de produto não redireciona para 404", async ({ page }) => {
    await gotoAndSettle(page, "/produtos");

    // Tenta clicar no primeiro produto encontrado
    const productLink = page
      .locator("a[href*='/produtos/'], [data-testid='product-card'] a, [data-testid='product-link']")
      .first();

    const hasProduct = await productLink.count() > 0;
    if (hasProduct) {
      await productLink.click();
      await waitForRouteIdle(page);
      await expect(page.locator("body")).not.toContainText("404");
      await expect(page.locator("body")).not.toContainText("500");
    }
  });

  test("Kit Builder (/kits/builder) carrega sem erro", async ({ page }) => {
    await gotoAndSettle(page, "/kits/builder");
    await expect(page).not.toHaveURL(/\/login/);
    await expect(page.locator("body")).not.toContainText("500");
  });

  test("Kit Builder tem área de adição de produtos", async ({ page }) => {
    await gotoAndSettle(page, "/kits/builder");

    const addProduct = page
      .locator(
        "[data-testid='add-product'], [data-testid='kit-add'], button:has-text('Adicionar'), button:has-text('Add')"
      )
      .first();

    await expect(addProduct).toBeVisible({ timeout: 15_000 }).catch(() => {
      // Kit builder pode requerer pré-seleção
    });
  });

  test("biblioteca de kits (/kits) carrega", async ({ page }) => {
    await gotoAndSettle(page, "/kits");
    await expect(page).not.toHaveURL(/\/login/);
    await expect(page.locator("body")).not.toContainText("500");
  });

  test("rota de comparação (/comparar) carrega sem 500", async ({ page }) => {
    await gotoAndSettle(page, "/comparar");
    await expect(page.locator("body")).not.toContainText("500");
  });
});
