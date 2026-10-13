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

    // Move mouse to another element — Radix keeps the tooltip open while
    // pointer is over trigger OR content; hovering a sibling reliably closes it.
    await page.getByTestId('delivery-label').hover();

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
      // Structural check instead of pixel baselines: label must be horizontally
      // aligned inside its container and the page must not overflow sideways.
      const labelBox = await page.getByTestId('delivery-label').boundingBox();
      const containerBox = await container.boundingBox();
      expect(labelBox, `label visível em ${vp.name}`).not.toBeNull();
      expect(containerBox, `container visível em ${vp.name}`).not.toBeNull();
      expect(labelBox!.x).toBeGreaterThanOrEqual(containerBox!.x - 1);
      const overflow = await page.evaluate(() =>
        document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow, `scroll horizontal em ${vp.name}`).toBeLessThanOrEqual(0);
    }
  });

  test('should verify warning guidance via delivery tooltip', async ({ page }) => {
    // Contract updated (#2112): the warning is no longer a standalone banner —
    // it lives inside the info tooltip next to the delivery label.
    const trigger = page.getByTestId('delivery-info-tooltip-trigger');
    const tooltipContent = page.getByTestId('delivery-info-tooltip-content');

    await expect(trigger).toBeVisible();
    await trigger.hover();
    await expect(tooltipContent).toBeVisible();
    await expect(tooltipContent).toContainText('Fornecedores');
    await expect(tooltipContent).toContainText('viabilidade do prazo');
  });
});
