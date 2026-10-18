/**
 * Helpers compartilhados pelos specs de swatch → QuickView (Lista / Tabela / Grid).
 *
 * Contrato de produto vigente (verificado no código-fonte, FIX-SWATCH-INLINE-V1/V2):
 *  - Clicar numa bolinha NÃO abre o QuickView: seleciona a cor inline (imagem,
 *    estoque e URL `?cor=&pid=` do item). Ver ProductCard.tsx, ProductListItem.tsx
 *    e ProductTableRow.tsx.
 *  - O QuickView abre ao clicar na FOTO (thumb) e já posicionado na cor
 *    selecionada (`initialColorName`).
 *  - Os botões `view-mode-*` vivem dentro do Popover "Layout"
 *    (`layout-popover-trigger`, LayoutPopover.tsx): só existem no DOM com o
 *    popover aberto. Specs que procuravam `view-mode-*` direto nunca trocavam a
 *    visão e ficavam no grid.
 *  - `ProductColorSwatches` (V1) só aparece depois que `useProductsColorsBatch`
 *    hidrata `product.colors` (o fetch lightweight vem com `colors: []`), então
 *    a presença de swatches precisa de espera (polling), nunca de `count()` imediato.
 */
import { expect, type Locator, type Page } from '@playwright/test';

export type CatalogView = 'grid' | 'list' | 'table';
export type RowView = Exclude<CatalogView, 'grid'>;

/** Tempo generoso: o backend do CI chega a levar 15–60 s por request sob carga. */
export const DATA_TIMEOUT_MS = 60_000;

/** Seletor V1 (ProductColorSwatches): role="radio" + data-testid `color-swatch-<nome>`. */
export const V1_SWATCH = '[data-testid^="color-swatch-"]';
/** Seletor V2 (ColorSwatchPicker): <button aria-pressed title> sem role="radio". */
export const V2_SWATCH = 'button[aria-pressed][title]:not([role="radio"])';

const ROW_SELECTORS: Record<RowView, { row: string; thumbTid: string }> = {
  list: {
    row: 'article:has([data-testid="product-list-item-thumb"])',
    thumbTid: 'product-list-item-thumb',
  },
  table: {
    row: 'div[data-index]:has([data-testid="product-table-row-thumb"])',
    thumbTid: 'product-table-row-thumb',
  },
};

/**
 * Liga/desliga o pipeline V2 de swatches ANTES de qualquer navegação.
 * A flag é lida de `localStorage['ff_useColorSwatchesV2']` em modo DEV
 * (src/lib/feature-flags.ts) — o webServer do Playwright roda `npm run dev`.
 * Default de produção = ligada; o spec V1 precisa forçar OFF para exercitar
 * `ProductColorSwatches`.
 */
export async function presetSwatchesV2(page: Page, enabled: boolean): Promise<void> {
  await page.addInitScript((v: boolean) => {
    try {
      window.localStorage.setItem('ff_useColorSwatchesV2', v ? 'true' : 'false');
    } catch {
      /* ignore */
    }
  }, enabled);
}

/** Troca a visão do catálogo pelo Popover "Layout" e fecha o popover. */
export async function switchCatalogView(page: Page, mode: CatalogView): Promise<void> {
  const trigger = page.getByTestId('layout-popover-trigger');
  await expect(trigger, 'toolbar do catálogo (botão Layout) não apareceu').toBeVisible({
    timeout: DATA_TIMEOUT_MS,
  });
  const option = page.getByTestId(`view-mode-${mode}`);
  if (!(await option.isVisible())) await trigger.click();
  await expect(option).toBeVisible({ timeout: 5_000 });
  await option.click();
  await expect(option).toHaveAttribute('aria-pressed', 'true');
  await page.keyboard.press('Escape');
  await expect(option).toBeHidden({ timeout: 5_000 });
}

/** Rows (article em Lista, div[data-index] em Tabela) que contêm a thumb clicável. */
export function viewRows(page: Page, mode: RowView): Locator {
  return page.locator(ROW_SELECTORS[mode].row);
}

/** Thumb clicável (abre o QuickView) dentro de uma row. */
export function rowThumb(row: Locator, mode: RowView): Locator {
  return row.getByTestId(ROW_SELECTORS[mode].thumbTid).first();
}

/**
 * Espera (polling) até existir uma row com pelo menos 1 swatch do seletor dado e
 * devolve o índice da primeira row com >= 2 swatches (ou, na falta, a com mais).
 * Falha (não faz skip) se nada aparecer dentro do timeout — dado ausente no CI é
 * regressão a investigar, não motivo para pular.
 */
export async function waitForRowWithSwatches(
  rows: Locator,
  swatchSelector: string,
  opts: { sample?: number; timeout?: number } = {},
): Promise<{ index: number; count: number }> {
  const sample = opts.sample ?? 20;
  let best = { index: -1, count: 0 };
  await expect
    .poll(
      async () => {
        const total = Math.min(await rows.count(), sample);
        best = { index: -1, count: 0 };
        for (let i = 0; i < total; i++) {
          const n = await rows.nth(i).locator(swatchSelector).count();
          if (n > best.count) best = { index: i, count: n };
          if (n >= 2) break;
        }
        return best.count;
      },
      {
        timeout: opts.timeout ?? DATA_TIMEOUT_MS,
        message: `nenhuma row com swatches (${swatchSelector}) dentre as primeiras ${sample}`,
      },
    )
    .toBeGreaterThan(0);
  return best;
}
