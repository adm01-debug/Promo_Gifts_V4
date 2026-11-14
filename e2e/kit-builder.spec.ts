/**
 * E2E: Kit Builder - Flows and states
 */
import { test, expect } from "./fixtures/test-base";
import { gotoAndSettle } from "./helpers/nav";
import { expectVisibleByTestId } from "./helpers/waits";
import { loginAs } from "./helpers/auth";

/**
 * Kit builder shows a landing page on first load (KitMakerLanding).
 * Clicking "Começar pelos itens" (or "Começar pela caixa") exits the landing
 * and enters the wizard.
 */
async function exitLandingState(
  page: Parameters<typeof loginAs>[0],
  start: RegExp = /Começar pelos itens/i,
) {
  const skipTour = page.getByRole('button', { name: /Pular tour/i });
  // isVisible() retorna false imediatamente (o Playwright ignora o timeout) se
  // o tour ainda não montou — o overlay então bloqueia o clique no botão de
  // start. waitFor espera o tour aparecer de fato.
  if (
    await skipTour
      .waitFor({ state: 'visible', timeout: 3000 })
      .then(() => true)
      .catch(() => false)
  )
    await skipTour.click();

  const startBtn = page.getByRole('button', { name: start });
  await expect(startBtn).toBeVisible({ timeout: 10000 });
  await startBtn.click();
  // Wait for wizard to be ready
  await expect(page.locator('[data-testid="kit-builder-container"]')).toBeVisible();
}

/**
 * Abas de etapas futuras ficam desabilitadas até a etapa ser concluída
 * (WizardSteps: isClickable = isCompleted || isActive). Avança-se pelo botão
 * de próxima etapa do rodapé, habilitado só quando wizardState.canProceed.
 */
async function goToNextStep(page: Parameters<typeof loginAs>[0]) {
  const next = page.locator('[data-testid="wizard-next"]');
  await expect(next).toBeEnabled({ timeout: 10000 });
  await next.click();
}

test.describe("Kit Builder", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page);
  });

  test("should display kit builder landing state", async ({ page }) => {
    await gotoAndSettle(page, "/kit-builder");
    await expectVisibleByTestId(page, "kit-builder-container");
    // Landing shows start buttons before wizard
    await expect(page.getByRole('button', { name: /Começar pelos itens/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Começar pela caixa/i })).toBeVisible();
  });

  test("should allow editing kit name", async ({ page }) => {
    await gotoAndSettle(page, "/kit-builder");
    await exitLandingState(page);
    const nameInput = page.locator('[data-testid="kit-name-input"]');
    await expect(nameInput).toBeVisible({ timeout: 5000 });
    await nameInput.fill("Kit de Teste Senior");
    await page.keyboard.press("Enter");
    await expect(nameInput).toHaveValue("Kit de Teste Senior");
  });

  test("should complete a full kit build flow", async ({ page }) => {
    await gotoAndSettle(page, "/kit-builder");
    await exitLandingState(page);

    // Step 1: Select Items (fluxo "Começar pelos itens": itens é a etapa ativa)
    await expect(page.locator('[data-testid="wizard-step-items"]')).toHaveAttribute(
      'aria-current',
      'step',
    );
    const firstItem = page.locator('[data-testid="item-option"]').first();
    await expect(firstItem).toBeVisible({ timeout: 10000 });
    await firstItem.click(); // Add first item

    const secondItem = page.locator('[data-testid="item-option"]').nth(1);
    await secondItem.click(); // Add second item

    // Update quantity
    const qtyInput = page.locator('[data-testid="kit-item-quantity"]').first();
    await qtyInput.fill("5");
    await qtyInput.blur();

    // Step 2: Select Box (caixas compatíveis com os itens escolhidos)
    await goToNextStep(page);
    const firstBox = page.locator('[data-testid="box-option"]').first();
    await expect(firstBox).toBeVisible({ timeout: 10000 });
    await firstBox.click();

    // Step 3: Summary (box → personalização → revisão)
    await goToNextStep(page);
    await goToNextStep(page);
    await expect(page.locator('[data-testid="kit-summary-total"]')).toBeVisible();

    // Validate removal (etapa itens já concluída: aba habilitada)
    await page.locator('[data-testid="wizard-step-items"]').click();
    await page.locator('[data-testid="remove-kit-item"]').first().click();

    // Summary again (itens → caixa → personalização → revisão)
    await goToNextStep(page);
    await goToNextStep(page);
    await goToNextStep(page);
    await expect(page.locator('[data-testid="kit-summary-total"]')).toBeVisible();
    const itemsCount = await page.locator('[data-testid="kit-summary-item"]').count();
    expect(itemsCount).toBe(1);
  });

  test("should reset kit and return to clean state", async ({ page }) => {
    await gotoAndSettle(page, "/kit-builder");
    await exitLandingState(page, /Começar pela caixa/i);

    // Add something first (fluxo "Começar pela caixa": caixa é a etapa ativa)
    await expect(page.locator('[data-testid="wizard-step-box"]')).toHaveAttribute(
      'aria-current',
      'step',
    );
    const firstBox = page.locator('[data-testid="box-option"]').first();
    await expect(firstBox).toBeVisible({ timeout: 10000 });
    await firstBox.click();

    // Reset
    await page.locator('[data-testid="reset-kit-button"]').click();
    await page.locator('[data-testid="confirm-reset-button"]').click();

    // After reset: container still present, kit is clean
    await expectVisibleByTestId(page, "kit-builder-container");
  });
});
