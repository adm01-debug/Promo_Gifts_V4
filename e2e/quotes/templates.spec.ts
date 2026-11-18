/**
 * Garante que "Templates de Orçamento" está DE VOLTA e alcançável:
 * - /orcamentos exibe a entrada para a rota de templates
 * - /orcamentos/templates monta a página (não redireciona mais)
 * - navegação para páginas existentes continua funcionando
 *
 * Substitui o guarda `no-templates.spec.ts`, que travava a remoção da feature.
 */
import { test, expect } from "../fixtures/test-base";
import { gotoAndSettle } from "../helpers/nav";

test.describe("Quotes — templates restaurados", () => {
  test("/orcamentos exibe a entrada para Templates", async ({ page }) => {
    await gotoAndSettle(page, "/orcamentos");
    await expect(page.getByTestId("quote-templates-button")).toBeVisible();
  });

  test("/orcamentos/templates monta a página de templates", async ({ page }) => {
    await gotoAndSettle(page, "/orcamentos/templates");
    await expect(page).toHaveURL(/\/orcamentos\/templates/);
    await expect(page.getByTestId("page-title-orcamentos-templates")).toBeVisible();
  });

  test("a entrada da lista navega para a página de templates", async ({ page }) => {
    await gotoAndSettle(page, "/orcamentos");
    await page.getByTestId("quote-templates-button").click();
    await expect(page).toHaveURL(/\/orcamentos\/templates/);
    await expect(page.getByTestId("page-title-orcamentos-templates")).toBeVisible();
  });

  test("/orcamentos/novo não expõe 'Usar template' (picker não integrado)", async ({ page }) => {
    // Decisão de escopo: aplicar template DENTRO do construtor (QuoteTemplatePicker)
    // não foi integrado — sobrescrever itens/desconto do builder é decisão do dono.
    await gotoAndSettle(page, "/orcamentos/novo");
    await expect(page.getByRole("button", { name: /usar template/i })).toHaveCount(0);
  });

  test("navegação para páginas existentes continua funcionando", async ({ page }) => {
    await gotoAndSettle(page, "/orcamentos/kanban");
    await expect(page).toHaveURL(/\/orcamentos\/kanban/);

    await gotoAndSettle(page, "/orcamentos/dashboard");
    await expect(page).toHaveURL(/\/orcamentos\/dashboard/);

    await gotoAndSettle(page, "/orcamentos/novo");
    await expect(page).toHaveURL(/\/orcamentos\/novo/);
  });
});
