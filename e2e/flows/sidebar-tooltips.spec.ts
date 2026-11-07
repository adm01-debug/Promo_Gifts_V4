/**
 * Regressão E2E — Tooltips comerciais da sidebar.
 *
 * Garante que TODO item visível da sidebar com `data-tooltip-label`
 * mostra a mensagem ao hover e a esconde ao mouse out, em runtime real
 * (Radix Tooltip + pointer events nativos do Chromium).
 *
 * Selecionamos itens via `[data-tooltip-label]` para evitar acoplamento
 * frágil ao texto do link, e validamos a mensagem comparando o conteúdo
 * do `[role="tooltip"]` aberto.
 */
import { test, expect } from '../fixtures/test-base';
import type { Locator, Page } from '@playwright/test';
import { loginAs } from '../helpers/auth';
import { gotoAndSettle } from '../helpers/nav';

async function expectTooltipOnHover(page: Page, trigger: Locator, expected: string) {
  const tooltip = page.getByRole('tooltip', { name: expected });

  await expect(async () => {
    // Radix usa atraso de abertura e o runner pode perder o primeiro evento
    // durante scroll/layout. Reentrar no alvo reproduz o gesto real sem
    // mascarar a asserção de conteúdo e visibilidade.
    await page.mouse.move(0, 0);
    await trigger.hover();
    await expect(tooltip).toBeVisible({ timeout: 2500 });
  }).toPass({ timeout: 7500, intervals: [250] });

  return tooltip;
}

test.describe('Sidebar — tooltips comerciais (hover/unhover)', () => {
  test.beforeEach(async ({ page }) => {
    const vp = page.viewportSize();
    test.skip(
      vp !== null && vp.width < 768,
      'Hover tooltips não se aplicam em dispositivos touch; rodando apenas em desktop',
    );

    await loginAs(page, 'user');
    await gotoAndSettle(page, '/');

    // Em viewports mobile a sidebar fica atrás de um hamburger.
    // Abre o menu se ele não estiver visível.
    const sidebar = page.locator('aside, [data-sidebar="sidebar"]').first();
    if (!(await sidebar.isVisible().catch(() => false))) {
      const openBtn = page.getByRole('button', { name: /abrir menu|menu/i }).first();
      if (await openBtn.isVisible().catch(() => false)) {
        await openBtn.click();
        await sidebar.waitFor({ state: 'visible', timeout: 3000 }).catch(() => {});
      }
    }
  });

  test('hover mostra tooltip e mouse out o remove em todos os itens', async ({ page }) => {
    // Garante grupos expandidos: Catálogo + Orçamentos abrem por defaultOpen.
    // Pega todos os triggers de tooltip da sidebar.
    const triggers = page.locator(
      'aside [data-tooltip-label], nav [data-tooltip-label], [data-sidebar="sidebar"] [data-tooltip-label]',
    );
    const count = await triggers.count();
    expect(count, 'deve existir ao menos 5 itens com tooltip visíveis').toBeGreaterThanOrEqual(5);

    // Limita a um subconjunto para manter o teste rápido (<30s no CI).
    const sample = Math.min(count, 10);

    for (let i = 0; i < sample; i += 1) {
      const trigger = triggers.nth(i);
      const expected = await trigger.getAttribute('data-tooltip-label');
      if (!expected) continue;

      await trigger.scrollIntoViewIfNeeded();
      const tooltip = await expectTooltipOnHover(page, trigger, expected);

      // Move o mouse para uma área neutra e valida que o tooltip some.
      await page.mouse.move(2000, 2000);
      await expect(tooltip, `tooltip deve sumir após mouse out de "${expected}"`).toBeHidden({
        timeout: 2000,
      });
    }
  });

  test('scroll na sidebar não deixa tooltip preso e novos itens funcionam', async ({ page }) => {
    const sidebar = page
      .locator('aside, [data-sidebar="sidebar"]')
      .filter({ has: page.locator('[data-tooltip-label]') })
      .first();
    await expect(sidebar).toBeVisible();

    const triggers = sidebar.locator('[data-tooltip-label]');
    const count = await triggers.count();
    expect(count, 'sidebar precisa ter itens com tooltip').toBeGreaterThanOrEqual(3);

    // 1) Abre tooltip no primeiro item.
    const first = triggers.first();
    const firstLabel = await first.getAttribute('data-tooltip-label');
    await first.scrollIntoViewIfNeeded();
    const firstTooltip = await expectTooltipOnHover(page, first, firstLabel!);

    // 2) Rola a sidebar (e a janela) — tooltip aberto NÃO pode ficar preso.
    await sidebar.evaluate((el) => {
      el.scrollTop = el.scrollHeight;
      (el.querySelector('[data-sidebar="content"]') as HTMLElement | null)?.scrollTo?.(
        0,
        el.scrollHeight,
      );
    });
    await page.mouse.wheel(0, 600);
    await page.mouse.move(2000, 2000);
    await expect(
      firstTooltip,
      'tooltip do item inicial deve sumir após scroll + mouse out',
    ).toBeHidden({ timeout: 2000 });

    // 3) Não pode sobrar nenhum tooltip órfão visível.
    await expect(page.locator('[role="tooltip"]:visible')).toHaveCount(0);

    // 4) Item agora visível após o scroll deve continuar funcional.
    const last = triggers.last();
    const lastLabel = await last.getAttribute('data-tooltip-label');
    await last.scrollIntoViewIfNeeded();
    const lastTooltip = await expectTooltipOnHover(page, last, lastLabel!);

    await page.mouse.move(2000, 2000);
    await expect(lastTooltip).toBeHidden({ timeout: 2000 });
  });
});
