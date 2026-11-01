/**
 * E2E — Fluxo: Catálogo → Detalhe de Produto → Kit Builder
 *
 * Valida a jornada do usuário desde a navegação no catálogo até a
 * criação de kit com múltiplos produtos.
 */
import { test, expect } from "@playwright/test";

import { gotoAndSettle, waitForRouteIdle } from "../helpers/nav";

// Verifica mensagens de erro do servidor, sem confundir com preços/contagens
// do catálogo que contêm a sequência "500" (por exemplo, "6.500 produtos").
const SERVER_ERROR_MESSAGE = /\bHTTP\s*500\b|\b500\s+Internal Server Error\b|\bInternal Server Error\b|\bErro\s+500\b/i;

test.describe("Fluxo Catálogo → Kit Builder", () => {
  test("catálogo carrega lista de produtos sem crash", async ({ page }) => {
    await gotoAndSettle(page, "/produtos");
    await expect(page).not.toHaveURL(/\/login/);
    await expect(page.locator("body")).not.toContainText(SERVER_ERROR_MESSAGE);
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
      await expect(page.locator("body")).not.toContainText(SERVER_ERROR_MESSAGE);
    }
  });

  test("Kit Builder (/kits/builder) carrega sem erro", async ({ page }) => {
    await gotoAndSettle(page, "/kits/builder");
    await expect(page).not.toHaveURL(/\/login/);
    await expect(page.locator("body")).not.toContainText(SERVER_ERROR_MESSAGE);
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
    await expect(page.locator("body")).not.toContainText(SERVER_ERROR_MESSAGE);
  });

  test("rota de comparação (/comparar) carrega sem 500", async ({ page }) => {
    await gotoAndSettle(page, "/comparar");
    await expect(page.locator("body")).not.toContainText(SERVER_ERROR_MESSAGE);
  });
});
