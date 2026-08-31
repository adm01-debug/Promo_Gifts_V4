import { test, expect, requireAuth } from "../fixtures/test-base";
import { installMockAuth, isMockAuthEnabled } from "../helpers/mock-auth";
import { gotoAndSettle } from "../helpers/nav";

test.describe("Novo Orçamento — Validações e Tooltips", () => {
  test.beforeEach(async ({ page }) => {
    requireAuth();
    if (isMockAuthEnabled()) await installMockAuth(page);
    await gotoAndSettle(page, "/orcamentos/novo");
  });

  test("deve exibir lista de erros de validação quando o formulário está incompleto", async ({ page }) => {
    // O resumo atual é um popover: primeiro valida o indicador e então o abre.
    const pendingTrigger = page.getByTestId("quote-missing-fields-trigger");
    await expect(pendingTrigger).toBeVisible();
    await pendingTrigger.click();

    const validationBox = page.getByTestId("quote-missing-fields-popover");
    await expect(validationBox).toBeVisible();
    await expect(validationBox).toContainText("Campos obrigatórios pendentes");

    await expect(validationBox.locator("li").filter({ hasText: /^Empresa$/ })).toBeVisible();
    await expect(validationBox.locator("li").filter({ hasText: /^Contato$/ })).toBeVisible();
    await expect(
      validationBox.locator("li").filter({ hasText: /^Forma de Pagamento$/ }),
    ).toBeVisible();
  });

  test("deve exibir tooltip informativo no prazo de entrega", async ({ page }) => {
    // O trigger do tooltip tem o data-testid='delivery-info-tooltip-trigger'
    const tooltipTrigger = page.getByTestId('delivery-info-tooltip-trigger');
    await expect(tooltipTrigger).toBeVisible();

    // Hover para ativar o tooltip
    await tooltipTrigger.hover();

    // Verificar se o conteúdo do tooltip aparece
    const tooltipContent = page.getByTestId('delivery-info-tooltip-content');
    await expect(tooltipContent).toBeVisible();
    await expect(tooltipContent).toContainText("Antes de assumir o compromisso com seu Cliente");
  });

  test("deve validar valor do frete quando modalidade é FOB Pré-negociado", async ({ page }) => {
    // 1. Selecionar Frete FOB Pré-negociado
    const shippingSelect = page.getByTestId('shipping-type-select');
    await shippingSelect.click();
    await page.getByRole('option', { name: /FOB \| Valor pré negociado/i }).click();

    // 2. Abrir o resumo e verificar se o erro "Valor do Frete" aparece.
    const pendingTrigger = page.getByTestId("quote-missing-fields-trigger");
    await pendingTrigger.click();
    const pendingPopover = page.getByTestId("quote-missing-fields-popover");
    await expect(
      pendingPopover.locator("li").filter({ hasText: /^Valor do Frete$/ }),
    ).toBeVisible();
    await page.keyboard.press("Escape");

    // 3. Preencher o valor e verificar se o erro some
    const shippingInput = page.getByTestId('shipping-cost-input');
    await shippingInput.fill("150,00");

    await pendingTrigger.click();
    await expect(
      pendingPopover.locator("li").filter({ hasText: /^Valor do Frete$/ }),
    ).toHaveCount(0);
  });
});
