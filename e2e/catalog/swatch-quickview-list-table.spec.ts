/**
 * E2E — Swatch (V1) → QuickView nas views Lista e Tabela.
 *
 * Contrato vigente (FIX-SWATCH-INLINE-V1 em ProductListItem / ProductTableRow):
 *  1. Clique numa bolinha seleciona a cor INLINE (aria-checked="true") e NÃO
 *     abre o QuickView.
 *  2. Botão "Todos" da própria row (`color-swatches-clear`) limpa a seleção.
 *  3. Clique na foto/thumb abre o QuickView já posicionado na cor selecionada
 *     (header "Cor: <nome>" + botão "Todas as cores" + estoque com `data-color-id`).
 *  4. "Todas as cores" no QuickView limpa a cor (header volta a "Cor").
 *  5. A11y: swatches expõem role="radio" + aria-label "Opção de cor: ..." e
 *     respondem a Enter e Space.
 *
 * Histórico: a versão anterior esperava que o clique na bolinha abrisse o QuickView
 * (comportamento removido em FIX-SWATCH-INLINE), procurava os botões `view-mode-*`
 * fora do Popover "Layout" (nunca trocava a visão) e contava swatches imediatamente
 * (`product.colors` só hidrata depois, via useProductsColorsBatch). Resultado: todos
 * os testes terminavam em skip silencioso. Helpers em ./helpers/swatch-view.ts.
 *
 * O pipeline V2 vem LIGADO por padrão (feature-flags.ts); este spec força OFF para
 * exercitar o fallback `ProductColorSwatches`. A cobertura V2 está em
 * swatch-quickview-v2-list-table.spec.ts.
 */
import { test, expect, requireAuth } from '../fixtures/test-base';
import { gotoAndSettle } from '../helpers/nav';
import {
  DATA_TIMEOUT_MS,
  V1_SWATCH,
  presetSwatchesV2,
  rowThumb,
  switchCatalogView,
  viewRows,
  waitForRowWithSwatches,
  type RowView,
} from './helpers/swatch-view';

const ROUTE = '/produtos';
const VIEWS: RowView[] = ['list', 'table'];

test.describe('Swatch → QuickView (Lista e Tabela)', () => {
  test.beforeEach(() => {
    requireAuth();
    // Backend do CI chega a levar 15–60 s por request: folga sobre o timeout padrão (120 s).
    test.setTimeout(240_000);
  });

  for (const mode of VIEWS) {
    test(`[${mode}] swatch seleciona cor inline + "Todos" limpa + foto abre QV na cor`, async ({
      page,
    }) => {
      await presetSwatchesV2(page, false);
      await page.setViewportSize({ width: 1366, height: 900 });
      await gotoAndSettle(page, ROUTE);
      await switchCatalogView(page, mode);

      const rows = viewRows(page, mode);
      await expect(rows.first(), `nenhum item em ${ROUTE} (${mode})`).toBeVisible({
        timeout: DATA_TIMEOUT_MS,
      });
      const { index, count: rowSwatches } = await waitForRowWithSwatches(rows, V1_SWATCH);

      const row = rows.nth(index);
      const swatches = row.locator(V1_SWATCH);
      const firstSwatch = swatches.first();
      const dialog = page.getByRole('dialog');

      // ── A11y: role + aria-label canônicos ─────────────────────────────────
      await firstSwatch.scrollIntoViewIfNeeded();
      await expect(firstSwatch).toHaveAttribute('role', 'radio');
      expect((await firstSwatch.getAttribute('aria-label')) ?? '').toMatch(/Op[cç][aã]o de cor:/i);
      const colorName = ((await firstSwatch.getAttribute('data-color-name')) ?? '').trim();
      expect(colorName, 'swatch precisa expor data-color-name').toBeTruthy();
      await expect(firstSwatch).toHaveAttribute('aria-checked', 'false');

      // ── 1) Clique na bolinha: seleção inline, SEM abrir QuickView ─────────
      await firstSwatch.click();
      await expect(firstSwatch).toHaveAttribute('aria-checked', 'true');
      await expect(dialog).toHaveCount(0);

      // ── 2) "Todos" da row limpa a seleção ─────────────────────────────────
      const rowClear = row.getByTestId('color-swatches-clear');
      await expect(rowClear).toBeVisible();
      await rowClear.click();
      await expect(rowClear).toBeHidden();
      await expect(firstSwatch).toHaveAttribute('aria-checked', 'false');

      // ── 3) Foto abre o QuickView usando a cor selecionada na row ─────────
      await firstSwatch.click();
      await expect(firstSwatch).toHaveAttribute('aria-checked', 'true');
      await rowThumb(row, mode).click();
      await expect(dialog).toBeVisible({ timeout: 8_000 });

      const colorHeader = dialog.getByText(/^Cor:\s*/i).first();
      await expect(colorHeader).toBeVisible();
      await expect(colorHeader).toContainText(new RegExp(escapeRegExp(colorName), 'i'));

      const stockBadge = dialog.getByTestId('quickview-stock');
      await expect(stockBadge).toHaveAttribute('data-color-id', /.+/);

      // ── 4) "Todas as cores" no QuickView limpa a cor do QuickView ────────
      const clearBtn = dialog.getByTestId('quickview-clear-color');
      await expect(clearBtn).toBeVisible();
      await clearBtn.click();
      await expect(clearBtn).toBeHidden();
      await expect(dialog.locator('p').filter({ hasText: /^Cor$/ }).first()).toBeVisible();
      await expect(stockBadge).toHaveAttribute('data-color-id', '');

      await page.keyboard.press('Escape');
      await expect(dialog).toBeHidden({ timeout: 5_000 });

      // ── 5) Teclado: Enter e Space selecionam (sem abrir QuickView) ───────
      // Reseta a seleção anterior para um estado conhecido.
      if (await rowClear.isVisible()) await rowClear.click();
      const target = rowSwatches >= 2 ? swatches.nth(1) : firstSwatch;

      await target.focus();
      await expect(target).toBeFocused();
      await page.keyboard.press('Enter');
      await expect(target).toHaveAttribute('aria-checked', 'true');
      await expect(dialog).toHaveCount(0);

      if (await rowClear.isVisible()) await rowClear.click();
      await expect(target).toHaveAttribute('aria-checked', 'false');
      await target.focus();
      await page.keyboard.press(' ');
      await expect(target).toHaveAttribute('aria-checked', 'true');
      await expect(dialog).toHaveCount(0);
    });
  }
});

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
