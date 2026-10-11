import { test, expect } from './fixtures/test-base';
import { loginAs } from './helpers/auth';

test.describe('QuoteBuilderPage - Delivery Field E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the new quote page
    await loginAs(page);
    await page.goto('/orcamentos/novo');

    // Wait for the page to load
    await page.waitForSelector('[data-testid="delivery-label"]', { timeout: 15000 });
  });

  test('should show and hide delivery tooltip on hover', async ({ page }) => {
    const trigger = page.getByTestId('delivery-info-tooltip-trigger');
    const tooltipContent = page.getByTestId('delivery-info-tooltip-content');

    // Initially tooltip should not be visible
    await expect(tooltipContent).not.toBeVisible();

    // Hover over the info icon
    await trigger.hover();
    
    // Tooltip should be visible and contain expected text
    await expect(tooltipContent).toBeVisible();
    await expect(tooltipContent).toContainText('Antes de assumir o compromisso com seu Cliente');

    // Move mouse away — dois movimentos: o Radix mantém o tooltip aberto
    // enquanto o ponteiro está dentro do "grace polygon" trigger→content;
    // um teleporte único pode continuar dentro dele.
    await page.mouse.move(0, 0);
    await page.mouse.move(1, 1);

    // Tooltip should disappear
    await expect(tooltipContent).not.toBeVisible();
  });

  test('should hide tooltip on Escape key', async ({ page }) => {
    const trigger = page.getByTestId('delivery-info-tooltip-trigger');
    const tooltipContent = page.getByTestId('delivery-info-tooltip-content');

    await trigger.hover();
    await expect(tooltipContent).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(tooltipContent).not.toBeVisible();
  });

  test('should verify visual alignment across viewports', async ({ page }) => {
    const viewports = [
      { name: 'mobile', width: 375, height: 667 },
      { name: 'tablet', width: 768, height: 1024 },
      { name: 'desktop', width: 1280, height: 800 }
    ];

    const container = page.getByTestId('delivery-label-container');

    for (const vp of viewports) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      // Small wait for layout stability
      await page.waitForTimeout(300);

      await expect(container).toBeVisible();
    }
  });

  test('should verify delivery warning text in tooltip', async ({ page }) => {
    // O aviso de viabilidade vive dentro do tooltip (não há banner separado na UI atual).
    const trigger = page.getByTestId('delivery-info-tooltip-trigger');
    const tooltipContent = page.getByTestId('delivery-info-tooltip-content');

    await trigger.hover();
    await expect(tooltipContent).toBeVisible();
    await expect(tooltipContent).toContainText('viabilidade do prazo');
    await expect(tooltipContent).toContainText('Fornecedores');
  });
});
