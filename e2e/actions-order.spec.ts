import type { Locator, Page } from '@playwright/test';
import { expect, requireAuth, test } from './fixtures/test-base';
import { gotoAndSettle } from './helpers/nav';
import { installSwatchCatalogMocks } from './helpers/swatch-catalog-mocks';
import { switchCatalogView, viewRows, type RowView } from './catalog/helpers/swatch-view';

/**
 * E2E: valida a ordem padronizada dos botões de ação na visualização em lista
 * e na tabela em diversos módulos (Catálogo, Super Filtro, Novidades e Reposição).
 * Valida acessibilidade (aria-label e foco), tooltips no hover, navegação via
 * teclado e responsividade (mobile).
 */

const EXPECTED_ACTIONS: ReadonlyArray<{ ariaLabel: string; tooltip: string }> = [
  { ariaLabel: 'Adicionar ao Carrinho', tooltip: 'Adicionar ao Carrinho' },
  { ariaLabel: 'Orçamento', tooltip: 'Orçamento' },
  { ariaLabel: 'Coleção', tooltip: 'Coleção' },
  { ariaLabel: 'Favoritar', tooltip: 'Favoritar' },
  { ariaLabel: 'Comparar', tooltip: 'Comparar' },
  { ariaLabel: 'Quick View', tooltip: 'Quick View' },
  { ariaLabel: 'Compartilhar', tooltip: 'Compartilhar' },
];

const MOBILE_ACTIONS = [EXPECTED_ACTIONS[0], EXPECTED_ACTIONS[3], EXPECTED_ACTIONS[4]];

const MODULES = [
  { name: 'Catálogo', path: '/produtos', hasTableActions: true },
  { name: 'Super Filtro', path: '/filtros', hasTableActions: true },
  // As tabelas especializadas de Novidades/Reposição são informativas e não
  // renderizam TableRowActions; a barra de ações existe nas respectivas listas.
  { name: 'Novidades', path: '/novidades', hasTableActions: false },
  { name: 'Reposição', path: '/reposicao', hasTableActions: false },
];

async function gotoModule(page: Page, path: string, view: RowView) {
  await gotoAndSettle(page, path);
  await switchCatalogView(page, view);
}

/**
 * Retorna os botões de ação do primeiro item visível.
 */
async function getFirstRowActionButtons(
  page: Page,
  view: RowView,
  expectedActions: ReadonlyArray<{ ariaLabel: string }>,
  revealOnHover = true,
): Promise<Locator> {
  const row = viewRows(page, view).first();
  await expect(row, `nenhum produto renderizado na visão ${view}`).toBeVisible({ timeout: 15_000 });
  await row.scrollIntoViewIfNeeded();
  if (revealOnHover) await row.hover();

  const selector = expectedActions
    .map(({ ariaLabel }) => `button[aria-label="${ariaLabel}"]`)
    .join(', ');
  return row.locator(selector);
}

async function assertOrderAndA11y(
  page: Page,
  buttons: Locator,
  moduleName: string,
  isMobile: boolean,
) {
  const expectedActions = isMobile ? MOBILE_ACTIONS : EXPECTED_ACTIONS;
  await expect(
    buttons,
    `Módulo ${moduleName}: quantidade de ações visíveis no ${isMobile ? 'mobile' : 'desktop'}`,
  ).toHaveCount(expectedActions.length);

  for (let i = 0; i < expectedActions.length; i++) {
    const expected = expectedActions[i];
    const btn = buttons.nth(i);

    try {
      // 1. aria-label
      await expect(btn).toHaveAttribute('aria-label', expected.ariaLabel);

      // 2. Foco por teclado em todas as ações.
      await btn.focus();
      await expect(btn).toBeFocused();
      if (!isMobile) {
        // 3. Hover exibe o tooltip canônico.
        await btn.hover();
        await expect(page.getByRole('tooltip', { name: expected.tooltip }).first()).toBeVisible({
          timeout: 2000,
        });
        await page.mouse.move(0, 0);
      }

      // 4. Teclado (Enter/Space) - Valida que o botão aceita a interação.
      // Aqui apenas validamos que o elemento aceita o evento de teclado.
      await btn.dispatchEvent('keydown', { key: 'Enter' });
    } catch (error) {
      // Screenshot em caso de falha específica no loop
      await page.screenshot({
        path: `test-results/failure-${moduleName}-${i}-${isMobile ? 'mobile' : 'desktop'}.png`,
        fullPage: true,
      });
      throw error;
    }
  }
}

test.describe('Ações do Produto: Ordem, Tooltips e Acessibilidade Cross-Module', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(
      testInfo.project.name !== 'chromium-authed',
      'As rotas auditadas são protegidas; a cobertura pública pertence aos fluxos de login/redirect.',
    );
    requireAuth();
    await installSwatchCatalogMocks(page, { force: true });
  });

  for (const module of MODULES) {
    test.describe(`${module.name}`, () => {
      // Desktop Tests
      test(`Desktop (1366x800): Ordem e Tooltips em Lista`, async ({ page }) => {
        await page.setViewportSize({ width: 1366, height: 800 });
        await gotoModule(page, module.path, 'list');
        const buttons = await getFirstRowActionButtons(page, 'list', EXPECTED_ACTIONS);
        await assertOrderAndA11y(page, buttons, module.name, false);
      });

      if (module.hasTableActions) {
        test(`Desktop (1366x800): Ordem e Tooltips em Tabela`, async ({ page }) => {
          await page.setViewportSize({ width: 1366, height: 800 });
          await gotoModule(page, module.path, 'table');
          const buttons = await getFirstRowActionButtons(page, 'table', EXPECTED_ACTIONS);
          await assertOrderAndA11y(page, buttons, module.name, false);
        });
      }

      // Mobile Tests
      test(`Mobile (375x667): Ordem e Acessibilidade em Lista`, async ({ page }) => {
        // Alguns módulos ocultam o seletor de layout no breakpoint mobile.
        // Seleciona Lista no desktop e só então valida a renderização mobile.
        await page.setViewportSize({ width: 1366, height: 800 });
        await gotoModule(page, module.path, 'list');
        await page.setViewportSize({ width: 375, height: 667 });
        const buttons = await getFirstRowActionButtons(page, 'list', MOBILE_ACTIONS, false);
        await assertOrderAndA11y(page, buttons, module.name, true);
      });
    });
  }
});
