/**
 * E2E — Estado vazio do /estoque.
 *
 * Mocka o bridge externo para devolver `rows: []` e valida:
 * - badge Saúde renderiza 100% (faixa good — não há nada a alertar)
 * - dialog "Como é calculado" mostra "0 / 0 = 100%"
 * - drawer abre e cada tab mostra empty state determinístico
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
import { test, expect } from '../fixtures/test-base';
import { loginAs } from '../helpers/auth';
import { gotoAndSettle } from '../helpers/nav';

test.describe.skip('Estoque — estado vazio (sem registros)', () => {
  test.beforeEach(async ({ page }) => {
    // Intercepta a edge que alimenta o dashboard ANTES do login + navegação.
    await page.route('**/functions/v1/external-db-bridge*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: { 'access-control-allow-origin': '*' },
        body: JSON.stringify({ rows: [], data: [], count: 0 }),
      });
    });

    await loginAs(page);
    await gotoAndSettle(page, '/estoque');
  });

  test('badge Saúde mostra 100% (faixa good) sem produtos', async ({ page }) => {
    const badge = page.getByTestId('health-score-badge');
    await expect(badge).toBeVisible({ timeout: 15_000 });
    await expect(badge).toHaveText(/Saúde:\s*100\s*%/);
  });

  test('dialog "Como é calculado" mostra 0 / 0 = 100%', async ({ page }) => {
    await page.getByTestId('health-score-info-trigger').click();
    const dialog = page.getByTestId('health-score-info-dialog');
    await expect(dialog).toBeVisible();
    await expect(page.getByTestId('health-score-live-example')).toHaveText(/0\s*\/\s*0\s*=\s*100\s*%/);
  });

  test('drawer abre e tab "Crítico" exibe empty state', async ({ page }) => {
    await page.getByTestId('health-score-badge').click();
    const drawer = page.getByTestId('stock-breakdown-drawer');
    await expect(drawer).toBeVisible();

    await page.getByTestId('tab-critical').click();
    await expect(page.getByTestId('tab-critical')).toHaveAttribute('data-state', 'active');
    await expect(page.getByTestId('stock-breakdown-empty')).toBeVisible();
  });
});
