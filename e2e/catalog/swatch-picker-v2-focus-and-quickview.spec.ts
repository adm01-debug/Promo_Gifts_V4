/**
 * Cobertura funcional do <ColorSwatchPicker> V2 nas 4 rotas que consomem o
 * pipeline (grid): /produtos, /filtros, /novidades, /reposicao.
 *
 * Valida:
 *   1. Tab-order: foco percorre os swatches V2 na ordem do DOM e, após o último,
 *      sai do picker.
 *   2. Estado idle  → nenhum swatch com aria-pressed="true".
 *      Estado ativo → exatamente 1 com aria-pressed="true" + ring visível
 *      (outline OU box-shadow não-zero via `:focus-visible` ou classe ring).
 *   3. Contrato vigente (FIX-SWATCH-INLINE-V2 em ProductCard / BaseProductGridCard):
 *      clicar na bolinha seleciona a cor INLINE e NÃO abre o QuickView; o QuickView
 *      abre pela FOTO. Abrir e fechar (Escape) preserva o estado do picker.
 *
 * Histórico: a versão anterior esperava que o clique na bolinha abrisse o QuickView
 * (removido em FIX-SWATCH-INLINE-V2), esperava o foco voltar a um swatch após o
 * Escape (agora volta à foto) e fazia `toHaveScreenshot` sem baselines commitados
 * (com `updateSnapshots: 'none'` no CI, falha garantida). A regressão visual do
 * picker/QuickView é responsabilidade de swatch-picker-v2-visual-baseline.spec.ts,
 * cujos baselines são gerados pelo workflow dedicado de snapshots.
 *
 * Animações são congeladas globalmente para interações determinísticas.
 *
 * Flag canônica: `ff_useColorSwatchesV2=true` (ver src/lib/feature-flags.ts).
 */

import { test, expect, type Page, type Locator } from '@playwright/test';

const ROUTES = [
  { slug: 'catalogo',     path: '/produtos'  },
  { slug: 'super-filtro', path: '/filtros'   },
  { slug: 'novidades',    path: '/novidades' },
  { slug: 'reposicao',    path: '/reposicao' },
] as const;

// V2 picker: <button aria-pressed> com background inline; V1 usa role="radio".
const V2_SWATCH =
  'button[aria-pressed][title]:not([role="radio"])[style*="background-color"]';

const FREEZE_CSS = `
  *, *::before, *::after {
    animation-duration: 0ms !important;
    animation-delay: 0ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0ms !important;
    transition-delay: 0ms !important;
    scroll-behavior: auto !important;
  }
  /* Estabiliza caret e indicadores de foco padrão do user-agent. */
  *:focus { caret-color: transparent !important; }
`;

async function bootstrap(page: Page, path: string) {
  await page.addInitScript(() => {
    try { window.localStorage.setItem('ff_useColorSwatchesV2', 'true'); } catch {/* ignore */}
  });
  await page.goto(path, { waitUntil: 'domcontentloaded' });
  await page.addStyleTag({ content: FREEZE_CSS });
}

/** Rotas obrigatórias: com dado ausente o teste FALHA; nas satélites, pode pular. */
const REQUIRED_ROUTES = new Set<string>(['catalogo', 'super-filtro']);

/** Tempo generoso: o backend do CI chega a levar 15–60 s por request sob carga. */
const DATA_TIMEOUT_MS = 60_000;

async function firstPicker(page: Page): Promise<Locator | null> {
  const first = page.locator(V2_SWATCH).first();
  const ok = await first
    .waitFor({ state: 'visible', timeout: DATA_TIMEOUT_MS })
    .then(() => true)
    .catch(() => false);
  if (!ok) return null;
  return first.locator(
    'xpath=ancestor::div[contains(@class,"flex")][contains(@class,"flex-wrap")][1]'
  );
}

/** Thumbs que abrem o QuickView no grid de cada módulo (ProductCard / Novidades / Reposição). */
const GRID_THUMB = [
  '[data-testid="product-card-image-quickview"]',
  '[data-testid="novelty-grid-card-thumb"]',
  '[data-testid="replenishment-grid-card-thumb"]',
].join(', ');

const GRID_THUMB_XPATH = [
  "@data-testid='product-card-image-quickview'",
  "@data-testid='novelty-grid-card-thumb'",
  "@data-testid='replenishment-grid-card-thumb'",
].join(' or ');

for (const route of ROUTES) {
  test.describe(`V2 ColorSwatchPicker • ${route.slug}`, () => {
    test(`${route.slug}: Tab-order + foco idle/ativo + seleção inline + QuickView pela foto`, async ({ page }) => {
      test.setTimeout(240_000); // backend do CI chega a levar 15–60 s por request
      await bootstrap(page, route.path);

      const picker = await firstPicker(page);
      if (picker === null && !REQUIRED_ROUTES.has(route.slug)) {
        expect(false, `[E108] Sem produtos com color_swatches em ${route.path} (rota satélite).`).toBeTruthy();
        return;
      }
      expect(picker, `nenhum produto com color_swatches V2 em ${route.path}`).not.toBeNull();
      const pickerEl = picker!;
      await pickerEl.scrollIntoViewIfNeeded();

      const swatches = pickerEl.locator(V2_SWATCH);
      const count = await swatches.count();
      expect(count, 'pelo menos 1 swatch V2 visível').toBeGreaterThan(0);
      const dialog = page.locator('[role="dialog"]').first();

      // --- (1) Estado idle: nenhum aria-pressed="true" ---
      const pressedIdle = await swatches.evaluateAll(
        (els) => els.filter((e) => e.getAttribute('aria-pressed') === 'true').length
      );
      expect(pressedIdle, 'idle: 0 swatches pressed').toBe(0);

      // --- (2) Tab-order explícito ---
      // Foca o primeiro swatch programaticamente e tabula até o último,
      // validando a sequência por aria-label.
      const labels = await swatches.evaluateAll((els) => els.map((e) => e.getAttribute('aria-label') ?? ''));
      await swatches.first().focus();
      for (let i = 0; i < count; i++) {
        const focusedLabel = await page.evaluate(() => document.activeElement?.getAttribute('aria-label') ?? '');
        expect(focusedLabel, `tab[${i}] = swatch[${i}]`).toBe(labels[i]);
        if (i < count - 1) await page.keyboard.press('Tab');
      }
      // Após o último swatch, Tab DEVE sair do picker (focar outro elemento).
      await page.keyboard.press('Tab');
      const escapedPicker = await pickerEl.evaluate((el) => !el.contains(document.activeElement));
      expect(escapedPicker, 'Tab após último swatch sai do picker').toBe(true);

      // --- (3) Estado ativo: seleção INLINE (sem abrir QuickView) + ring visível ---
      const targetIdx = count >= 2 ? 1 : 0;
      const target = swatches.nth(targetIdx);
      const targetLabel = labels[targetIdx];
      await target.click();

      await expect(target).toHaveAttribute('aria-pressed', 'true');
      await expect(target).toHaveAttribute('aria-label', targetLabel);
      await expect(dialog, 'clique na bolinha NÃO abre o QuickView').toHaveCount(0);

      // 1 e somente 1 swatch ativo no picker.
      const pressedCount = await swatches.evaluateAll(
        (els) => els.filter((e) => e.getAttribute('aria-pressed') === 'true').length
      );
      expect(pressedCount, 'exatamente 1 swatch ativo').toBe(1);

      // Ring visível: box-shadow OU outline não-zero (cobre `ring-*` Tailwind
      // e `:focus-visible` do user-agent).
      const hasRing = await target.evaluate((el) => {
        const cs = getComputedStyle(el);
        const shadow = cs.boxShadow && cs.boxShadow !== 'none';
        const outline = cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth || '0') > 0;
        return shadow || outline;
      });
      expect(hasRing, 'swatch ativo tem ring/outline visível').toBe(true);

      // --- (4) QuickView abre pela FOTO e fecha com Escape; picker preserva o estado ---
      // Thumb do MESMO card do picker (o ancestral mais próximo que contém uma foto
      // clicável): um `.first()` global abriria o QuickView de outro produto.
      const cardThumb = pickerEl
        .locator(`xpath=ancestor::*[.//*[${GRID_THUMB_XPATH}]][1]`)
        .locator(GRID_THUMB)
        .first();
      await cardThumb.click();
      await expect(dialog).toBeVisible({ timeout: 10_000 });
      await page.keyboard.press('Escape');
      await expect(dialog).toBeHidden({ timeout: 5_000 });

      // requestAnimationFrame x2 para Radix terminar o focus-return.
      await page.evaluate(() => new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r()))));

      await expect(target, 'estado do picker preservado após abrir/fechar o QuickView').toHaveAttribute(
        'aria-pressed',
        'true',
      );
    });
  });
}
