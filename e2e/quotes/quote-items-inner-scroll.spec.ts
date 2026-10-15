/**
 * QuoteItemsTable · scroll interno (>5 itens) e scroll de página.
 *
 * Valida sobre `/__visual/quote-view-order`:
 *  - Fixture `quote-items-table-fixture` (3 itens): scroll interno DESLIGADO.
 *  - Fixture `quote-items-table-fixture-many` (8 itens): scroll interno LIGADO,
 *    `tabIndex=0`, `role=region`, `aria-label`, scrollHeight > clientHeight.
 *  - Página continua rolando até a seção "Versões do Orçamento".
 *  - thead (fora do scroller, em `quote-items-table-header-wrap`) permanece
 *    fixo e visível enquanto o body rola internamente.
 */
import { test, expect, type Page } from '@playwright/test';
import { gotoAndSettle } from '../helpers/nav';

const ROUTE = '/__visual/quote-view-order';

async function open(page: Page) {
  await gotoAndSettle(page, ROUTE);
  await expect(page.getByTestId('quote-view-order-harness')).toBeVisible();
}

test('≤5 itens: scroll interno não é ativado', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await open(page);
  const scroller = page
    .getByTestId('quote-items-table-fixture')
    .getByTestId('quote-items-table-scroll');
  await expect(scroller).toHaveAttribute('data-inner-scroll', 'false');
});

test('>5 itens: scroll interno ativo, a11y e thead sticky', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await open(page);

  const scroller = page
    .getByTestId('quote-items-table-fixture-many')
    .getByTestId('quote-items-table-scroll');
  await expect(scroller).toBeVisible();
  await expect(scroller).toHaveAttribute('data-inner-scroll', 'true');
  await expect(scroller).toHaveAttribute('role', 'region');
  await expect(scroller).toHaveAttribute('tabindex', '0');
  await expect(scroller).toHaveAttribute('aria-label', /rolável de 8 itens/);

  const metrics = await scroller.evaluate((el) => ({
    scrollH: el.scrollHeight,
    clientH: el.clientHeight,
  }));
  expect(metrics.scrollH).toBeGreaterThan(metrics.clientH);

  // Estado inicial: topo da rolagem interna.
  await expect(scroller).toHaveAttribute('data-scroll-at-top', 'true');

  // O header NÃO vive dentro do scroller: `QuoteItemsTable` renderiza o <thead>
  // numa <table> própria (`quote-items-table-header-wrap`) acima da área
  // rolável (ver quote-items-table-header-radius.spec.ts). Ele permanece fixo
  // por construção enquanto o body rola internamente.
  const fixture = page.getByTestId('quote-items-table-fixture-many');
  const thead = fixture.getByTestId('quote-items-table-header-wrap').locator('thead').first();
  await expect(scroller.locator('thead')).toHaveCount(0);
  const headBefore = await thead.boundingBox();
  await scroller.evaluate((el) => {
    el.scrollTop = el.scrollHeight;
  });
  await expect(scroller).toHaveAttribute('data-scroll-at-bottom', 'true');
  const headAfter = await thead.boundingBox();
  const scrollerBox = await scroller.boundingBox();
  expect(headBefore && headAfter && scrollerBox).toBeTruthy();
  // Header fixo: não se move com a rolagem interna (±2px) e termina onde o
  // scroller começa (colado ao topo da área rolável, ±2px).
  expect(Math.abs(headAfter!.y - headBefore!.y)).toBeLessThanOrEqual(2);
  expect(Math.abs(headAfter!.y + headAfter!.height - scrollerBox!.y)).toBeLessThanOrEqual(2);
});

test('página continua rolando até "Versões do Orçamento"', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await open(page);
  const versions = page.getByTestId('harness-quote-versions');
  await versions.scrollIntoViewIfNeeded();
  await expect(versions).toBeInViewport();
});
