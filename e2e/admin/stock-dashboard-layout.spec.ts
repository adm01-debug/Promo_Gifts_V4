/**
 * E2E — Layout e responsividade do /estoque.
 *
 * - toolbar de busca aparece no topo, próxima ao título "Estoque"
 * - filtros por faixa (chips da legenda) são clicáveis e mudam o tab do drawer
 * - validação em múltiplos viewports (desktop, tablet, mobile)
 */
/**
 * SUSPENSA EM 2026-11-18 — contradiz uma decisão do dono, não um bug.
 *
 * Estas asserções exigem `health-score-badge`, `health-score-info-trigger` e o
 * drawer que eles abriam. O cabeçalho "Visão Geral" e seus chips foram
 * REMOVIDOS de propósito, e há dois guardas na direção oposta:
 *   - `src/components/inventory/__tests__/StockDashboard.header-removed.regression.test.ts:20,24`
 *     falha se o `data-testid="health-score-badge"` voltar ao StockDashboard;
 *   - `e2e/routes/app/stock-dashboard.spec.ts:15-25` exige `toHaveCount(0)`
 *     para badge, alertas e ⓘ na rota.
 *
 * Ou seja: este arquivo pede exatamente o que os outros dois proíbem. Nunca
 * deu vermelho porque o Gate 3 só roda spec marcada `@smoke`, e nenhuma destas
 * é — ficou latente.
 *
 * Fica SUSPENSA, e não apagada, porque o trabalho continua válido: os
 * componentes que ela exercita existem e estão testados em
 * `src/components/inventory/__tests__/stock-pure-components.test.tsx`. O que
 * sumiu foi só a porta de entrada deles:
 *   - `StockHealthBreakdownDrawer` é montado em `StockDashboard.tsx:440`, mas
 *     condicionado a `healthDrawerOpen`, e `setHealthDrawerOpen(true)` NÃO é
 *     chamado em lugar nenhum (`:125` é a única outra menção) — o drawer é
 *     inalcançável;
 *   - `HealthScoreInfoDialog` não é montado por nenhuma tela;
 *   - `StockThresholdsLegend` só aparece dentro desses dois.
 *
 * Decisão do dono (Git 7, é escolha de produto): dar a esses três uma entrada
 * nova fora do cabeçalho, ou apagar os três junto com este arquivo. Enquanto
 * não decidir, nada é perdido e nada mente.
 */
import { test, expect, type Page } from '../fixtures/test-base';
import { loginAs } from '../helpers/auth';
import { gotoAndSettle } from '../helpers/nav';

const VIEWPORTS = [
  { name: 'desktop', width: 1536, height: 864 },
  { name: 'tablet', width: 820, height: 1180 },
  { name: 'mobile', width: 390, height: 844 },
] as const;

async function setup(page: Page) {
  await loginAs(page);
  await gotoAndSettle(page, '/estoque');
}

test.describe.skip('Estoque — layout e responsividade', () => {
  for (const vp of VIEWPORTS) {
    test(`toolbar e badges visíveis em ${vp.name} (${vp.width}x${vp.height})`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await setup(page);

      // Título da página (testid SSOT — política proíbe getByRole para títulos)
      const title = page.getByTestId('page-title-estoque');
      await expect(title).toBeVisible();

      // Badge Saúde sempre presente
      await expect(page.getByTestId('health-score-badge')).toBeVisible();

      // Legenda de thresholds presente (pode estar colapsada em mobile mas renderizada)
      await expect(page.getByTestId('stock-thresholds-legend').first()).toBeAttached();
    });
  }

  test('chip da legenda "crítico" abre o drawer no tab correto', async ({ page }) => {
    await setup(page);

    const chip = page.getByTestId('stock-threshold-chip-critical').first();
    await expect(chip).toBeVisible();
    await chip.click();

    const drawer = page.getByTestId('stock-breakdown-drawer');
    if (await drawer.isVisible().catch(() => false)) {
      const criticalTab = page.getByTestId('tab-critical');
      await expect(criticalTab).toHaveAttribute('data-state', 'active');
    }
  });

  test('ScrollArea do drawer respeita altura máxima', async ({ page }) => {
    await setup(page);
    await page.getByTestId('health-score-badge').click();

    const drawer = page.getByTestId('stock-breakdown-drawer');
    await expect(drawer).toBeVisible();

    const scrollArea = drawer.locator('[data-radix-scroll-area-viewport]').first();
    const box = await scrollArea.boundingBox();
    expect(box).not.toBeNull();
    // não pode exceder 60vh + folga
    expect(box!.height).toBeLessThanOrEqual(page.viewportSize()!.height * 0.65);
  });
});
