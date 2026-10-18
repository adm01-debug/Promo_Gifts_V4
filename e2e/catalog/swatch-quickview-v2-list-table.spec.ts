/**
 * E2E — Modo V2 (flag `useColorSwatchesV2`) na Lista e na Tabela.
 *
 * Valida o pipeline V2 (`useProductColorSwatch` + `<ColorSwatchPicker size="sm" maxVisible={4}>`)
 * para as 4 rotas que consomem produtos do catálogo externo:
 *   /produtos · /filtros · /novidades · /reposicao
 *
 * Contrato vigente (FIX-SWATCH-INLINE-V2 em ProductListItem / ProductTableRow):
 *   1. V2 ON → clique numa bolinha (`aria-pressed`) seleciona a cor INLINE e NÃO
 *      abre o QuickView; o botão "Todos" (`aria-label="Ver todas as cores"`)
 *      aparece e, ao clicar, reseta a seleção.
 *   2. V2 ON → clique na foto/thumb abre o QuickView.
 *   3. V2 OFF → fallback `ProductColorSwatches` (`role="radio"`) opera inline e o
 *      ColorSwatchPicker V2 não renderiza.
 *   4. A11y V2 → bolinhas são <button>: Enter e Space selecionam.
 *   5. Smoke render → em cada uma das 4 rotas, com V2 ON, existem swatches V2 com o
 *      diâmetro do token SSOT `--swatch-size-sm` (24,2px; era 16px hard-coded antes de
 *      swatch-ssot-v2-20260627) e no máximo 4 por row (3 + chip "+N" quando há overflow).
 *
 * Histórico: a versão anterior esperava que o clique na bolinha abrisse o QuickView,
 * trocava a visão procurando `view-mode-*` fora do Popover "Layout" e media 14–20px.
 * Tudo terminava em skip silencioso. Helpers em ./helpers/swatch-view.ts.
 *
 * Falha (não faz skip) quando /produtos não traz itens/swatches: dado ausente no CI é
 * regressão a investigar. Nas rotas satélite (/novidades, /reposicao), que podem ficar
 * legitimamente vazias, o smoke continua pulando se não houver nenhuma row.
 */
import { test, expect, requireAuth } from '../fixtures/test-base';
import { gotoAndSettle } from '../helpers/nav';
import {
  DATA_TIMEOUT_MS,
  V1_SWATCH,
  V2_SWATCH,
  presetSwatchesV2,
  rowThumb,
  switchCatalogView,
  viewRows,
  waitForRowWithSwatches,
  type RowView,
} from './helpers/swatch-view';

const ROUTES = [
  { path: '/produtos', label: 'catalogo', required: true },
  { path: '/filtros', label: 'super-filtro', required: true },
  { path: '/novidades', label: 'novidades', required: false },
  { path: '/reposicao', label: 'reposicao', required: false },
] as const;

const VIEWS: RowView[] = ['list', 'table'];

/** Botão "Todos" do ColorSwatchPicker (só existe com seleção ativa). */
const V2_RESET = 'button[aria-label="Ver todas as cores"]';

test.describe('Swatch V2 → QuickView (Lista e Tabela)', () => {
  test.beforeEach(() => {
    requireAuth();
    // Backend do CI chega a levar 15–60 s por request: folga sobre o timeout padrão (120 s).
    test.setTimeout(240_000);
  });

  // ── (1) + (2) — Seleção inline, reset e QuickView pela foto ───────────────
  for (const mode of VIEWS) {
    test(`[${mode}] V2 ON · swatch seleciona inline, "Todos" reseta, foto abre QV`, async ({
      page,
    }) => {
      await presetSwatchesV2(page, true);
      await page.setViewportSize({ width: 1366, height: 900 });
      await gotoAndSettle(page, '/produtos');
      await switchCatalogView(page, mode);

      const rows = viewRows(page, mode);
      await expect(rows.first(), `nenhum item em /produtos (${mode})`).toBeVisible({
        timeout: DATA_TIMEOUT_MS,
      });
      const { index } = await waitForRowWithSwatches(rows, V2_SWATCH);

      const row = rows.nth(index);
      const swatch = row.locator(V2_SWATCH).first();
      const dialog = page.getByRole('dialog');
      expect(await swatch.getAttribute('aria-label')).toBeTruthy();

      await swatch.scrollIntoViewIfNeeded();
      await expect(swatch).toHaveAttribute('aria-pressed', 'false');

      // Clique: seleciona inline, sem abrir QuickView.
      await swatch.click();
      await expect(swatch).toHaveAttribute('aria-pressed', 'true');
      await expect(dialog).toHaveCount(0);

      // "Todos" aparece com seleção ativa e reseta.
      const reset = row.locator(V2_RESET);
      await expect(reset).toBeVisible();
      await reset.click();
      await expect(reset).toBeHidden();
      await expect(swatch).toHaveAttribute('aria-pressed', 'false');

      // Foto abre o QuickView (com e sem cor selecionada).
      await swatch.click();
      await expect(swatch).toHaveAttribute('aria-pressed', 'true');
      await rowThumb(row, mode).click();
      await expect(dialog).toBeVisible({ timeout: 8_000 });
      await expect(dialog.getByTestId('quickview-stock')).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(dialog).toBeHidden({ timeout: 5_000 });
    });
  }

  // ── (3) — Fallback com V2 OFF ────────────────────────────────────────────
  test('V2 OFF · fallback ProductColorSwatches continua operando (inline)', async ({ page }) => {
    await presetSwatchesV2(page, false);
    await page.setViewportSize({ width: 1366, height: 900 });
    await gotoAndSettle(page, '/produtos');
    await switchCatalogView(page, 'list');

    const rows = viewRows(page, 'list');
    await expect(rows.first(), 'nenhum item em /produtos (list)').toBeVisible({
      timeout: DATA_TIMEOUT_MS,
    });
    const { index } = await waitForRowWithSwatches(rows, V1_SWATCH);

    expect(await page.locator(V2_SWATCH).count(), 'V2 não deve renderizar com flag OFF').toBe(0);

    const row = rows.nth(index);
    const fallback = row.locator('[role="radio"][aria-label^="Opção de cor"]').first();
    await fallback.click();
    await expect(fallback).toHaveAttribute('aria-checked', 'true');
    await expect(page.getByRole('dialog')).toHaveCount(0);
  });

  // ── (4) — A11y V2 ─────────────────────────────────────────────────────────
  test('V2 ON · a11y: Space e Enter selecionam a bolinha (botão nativo)', async ({ page }) => {
    await presetSwatchesV2(page, true);
    await page.setViewportSize({ width: 1366, height: 900 });
    await gotoAndSettle(page, '/produtos');
    await switchCatalogView(page, 'list');

    const rows = viewRows(page, 'list');
    await expect(rows.first(), 'nenhum item em /produtos (list)').toBeVisible({
      timeout: DATA_TIMEOUT_MS,
    });
    const { index, count } = await waitForRowWithSwatches(rows, V2_SWATCH);

    const row = rows.nth(index);
    const swatches = row.locator(V2_SWATCH);
    const dialog = page.getByRole('dialog');

    const first = swatches.first();
    await first.focus();
    await expect(first).toBeFocused();
    await page.keyboard.press('Space');
    await expect(first).toHaveAttribute('aria-pressed', 'true');
    await expect(dialog).toHaveCount(0);

    if (count >= 2) {
      const second = swatches.nth(1);
      await second.focus();
      await page.keyboard.press('Enter');
      await expect(second).toHaveAttribute('aria-pressed', 'true');
      await expect(first).toHaveAttribute('aria-pressed', 'false');
    }
  });

  // ── (5) — Smoke render nas 4 rotas ────────────────────────────────────────
  for (const r of ROUTES) {
    test(`[smoke][${r.label}] V2 ON · ColorSwatchPicker renderiza (sm/maxVisible=4)`, async ({
      page,
    }) => {
      await presetSwatchesV2(page, true);
      await page.setViewportSize({ width: 1366, height: 900 });
      await gotoAndSettle(page, r.path);
      const switched = await switchCatalogView(page, 'list')
        .then(() => true)
        .catch((err: unknown) => {
          // Rota satélite sem dados pode nem montar a toolbar; rotas obrigatórias falham.
          if (r.required) throw err;
          return false;
        });
      if (!switched) {
        test.skip(true, `Toolbar de layout ausente em ${r.path} (rota satélite sem dados).`);
        return;
      }

      const rows = viewRows(page, 'list');
      const hasRows = await rows
        .first()
        .waitFor({ state: 'visible', timeout: DATA_TIMEOUT_MS })
        .then(() => true)
        .catch(() => false);
      if (!r.required && !hasRows) {
        test.skip(true, `Sem itens em ${r.path} (rota satélite sem dados).`);
        return;
      }
      expect(hasRows, `nenhum item em ${r.path}`).toBe(true);

      const { index } = await waitForRowWithSwatches(rows, V2_SWATCH);
      const row = rows.nth(index);
      const swatch = row.locator(V2_SWATCH).first();

      // Diâmetro = token SSOT --swatch-size-sm (index.css), tolerância de 1px.
      const tokenPx = await swatch.evaluate((el) =>
        parseFloat(getComputedStyle(el).getPropertyValue('--swatch-size-sm')),
      );
      expect(Number.isFinite(tokenPx), 'token --swatch-size-sm precisa resolver em px').toBe(true);
      const box = await swatch.boundingBox();
      expect(box?.width ?? 0).toBeGreaterThanOrEqual(tokenPx - 1);
      expect(box?.width ?? 0).toBeLessThanOrEqual(tokenPx + 1);

      // maxVisible=4: no máximo 4 bolinhas V2 por row (3 + chip "+N" no overflow).
      expect(await row.locator(V2_SWATCH).count()).toBeLessThanOrEqual(4);
    });
  }
});
