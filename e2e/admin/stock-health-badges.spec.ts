/**
 * E2E — Transparência dos badges Saúde e Alertas em /estoque.
 *
 * - badge "Saúde" visível com %, cor coerente, e clicável para abrir o drawer
 * - botão "Info" abre modal com fórmula + números do dataset
 * - drawer: troca de tab muda contagem, busca filtra
 * - legenda dos thresholds visível
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

test.describe.skip('Estoque — transparência Saúde/Alertas', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page);
    await gotoAndSettle(page, '/estoque');
  });

  test('badge Saúde mostra % numérica e a legenda de faixas está visível', async ({ page }) => {
    const badge = page.getByTestId('health-score-badge');
    await expect(badge).toBeVisible();
    await expect(badge).toHaveText(/Saúde:\s*\d{1,3}%/);

    await expect(page.getByTestId('stock-thresholds-legend').first()).toBeVisible();
    await expect(page.getByTestId('stock-threshold-chip-healthy').first()).toBeVisible();
    await expect(page.getByTestId('stock-threshold-chip-critical').first()).toBeVisible();
  });

  test('botão "Como é calculado" abre modal com fórmula e exemplo do dataset', async ({ page }) => {
    await page.getByTestId('health-score-info-trigger').click();

    const dialog = page.getByTestId('health-score-info-dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText(/Saúde\s*=\s*round/i);

    const example = page.getByTestId('health-score-live-example');
    await expect(example).toBeVisible();
    // formato "X / Y = Z%"
    await expect(example).toHaveText(/\d[\d.,]*\s*\/\s*\d[\d.,]*\s*=\s*\d{1,3}%/);
  });

  test('clicar no badge Saúde abre o drawer; tab e busca funcionam', async ({ page }) => {
    await page.getByTestId('health-score-badge').click();

    const drawer = page.getByTestId('stock-breakdown-drawer');
    await expect(drawer).toBeVisible();

    // legenda compacta dentro do drawer
    await expect(drawer.getByTestId('stock-thresholds-legend')).toBeVisible();

    // trocar para "Crítico" e confirmar que a aba mudou
    const criticalTab = page.getByTestId('tab-critical');
    await criticalTab.click();
    await expect(criticalTab).toHaveAttribute('data-state', 'active');

    // busca filtra (ou mostra empty)
    const search = page.getByTestId('stock-breakdown-search');
    await search.fill('___zzz_no_match_zzz___');
    await expect(page.getByTestId('stock-breakdown-empty')).toBeVisible();
  });
});
