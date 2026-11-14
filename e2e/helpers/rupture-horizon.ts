/**
 * Helpers do controle "Risco de Ruptura" do /estoque (contrato atual da UI).
 *
 * - O horizonte é um PopoverTrigger `rupture-horizon-control` que abre radios
 *   `rupture-horizon-{3,7,15,30}` (rótulos "3d", "7d"…) —
 *   src/components/inventory/StockFilterToolbar.tsx (bloco "Risco de Ruptura").
 * - `stock-status-chip-<status>` é o chip de status POR LINHA (`stock-row`), não
 *   um contador — src/components/inventory/VariantStockVisuals.tsx. Quantas
 *   SKUs estão em risco = quantos chips `low_stock` há nas linhas.
 */
import { expect, type Locator, type Page } from '@playwright/test';

export type RuptureHorizon = 3 | 7 | 15 | 30;

/** Abre o popover (se fechado), escolhe o horizonte e fecha o popover. */
export async function selectRuptureHorizon(page: Page, days: RuptureHorizon): Promise<void> {
  const radio = page.getByTestId(`rupture-horizon-${days}`);
  if (!(await radio.isVisible().catch(() => false))) {
    await page.getByTestId('rupture-horizon-control').click();
  }
  await radio.click();
  await expect(radio).toHaveAttribute('aria-checked', 'true');
  await page.keyboard.press('Escape');
  await expect(radio).toBeHidden();
}

/** Linhas da tabela de estoque (1 linha = 1 SKU/variação). */
export function stockRows(page: Page): Locator {
  return page.getByTestId('stock-row');
}

/** Linha da SKU de variação informada. */
export function stockRowBySku(page: Page, variantSku: string): Locator {
  return stockRows(page).filter({ hasText: variantSku });
}

/** Chips `low_stock` (Risco de Ruptura) presentes nas linhas renderizadas. */
export function lowStockChips(page: Page): Locator {
  return stockRows(page).getByTestId('stock-status-chip-low_stock');
}
