/**
 * E2E — Risco de Ruptura com CAMPOS DE SKU INDEFINIDOS.
 *
 * Garante que `current`, `min` ou `max` ausentes (null/undefined) não
 * quebram o chip de status nem a renderização da tabela. A SKU sem dados
 * chega com estoque 0 e sem velocidade → status `out_of_stock`; a fórmula
 * `computeRuptureRisk` não a reavalia (só reavalia `in_stock`/`overstocked`)
 * e ela nunca vira `low_stock`.
 *
 * Usa fixture determinística (`installRuptureFixture`) para garantir que
 * existe pelo menos uma SKU com campos nulos em qualquer ambiente.
 */
import { test, expect } from '../../fixtures/test-base';
import { gotoAndSettle } from '../../helpers/nav';
import { loginAs } from '../../helpers/auth';
import { installRuptureFixture } from '../../fixtures/stock-rupture-fixture';
import {
  lowStockChips,
  selectRuptureHorizon,
  stockRowBySku,
  stockRows,
} from '../../helpers/rupture-horizon';

const MISSING = 'FX-MISSING-001-A';
const RISK = 'FX-RISK-001-A';
const HEALTHY = 'FX-HEALTHY-001-A';

test.describe('@regression /estoque — Risco de Ruptura com SKU sem current/min/max', () => {
  test('@rupture-horizon SKU com campos nulos não crasha chip nem tabela', async ({
    page,
  }) => {
    // Não pode lançar erro JS em nenhuma etapa (carga, alvo, horizonte).
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));

    await installRuptureFixture(page);
    await loginAs(page, 'admin');
    await gotoAndSettle(page, '/estoque');

    // Tabela renderiza as 3 SKUs, inclusive a "incompleta", com chip de status.
    const rows = stockRows(page);
    await expect(rows).toHaveCount(3, { timeout: 60_000 });
    const missingRow = stockRowBySku(page, MISSING);
    await expect(missingRow).toHaveCount(1);
    await expect(missingRow.getByTestId('stock-status-chip-out_of_stock')).toBeVisible();
    await expect(lowStockChips(page)).toHaveCount(0);

    // Aplica alvo + horizonte 30d para forçar recomputo em todas as linhas.
    const qtyInput = page.getByPlaceholder(/Preciso de X un/i);
    await qtyInput.fill('500');
    // "Preciso de X un" é estrito: a SKU sem estoque (0 < 500) sai da lista.
    await expect(rows).toHaveCount(2);
    await expect(missingRow).toHaveCount(0);
    await selectRuptureHorizon(page, 30);

    // A fórmula rodou nas linhas válidas: só a RISK (800 − 20×30 = 200 < 500) vira low_stock.
    await expect(lowStockChips(page)).toHaveCount(1);
    await expect(
      stockRowBySku(page, RISK).getByTestId('stock-status-chip-low_stock'),
    ).toBeVisible();
    await expect(
      stockRowBySku(page, HEALTHY).getByTestId('stock-status-chip-in_stock'),
    ).toBeVisible();

    // Sem alvo, com horizonte 30d mantido: SKU sem dados volta, segue fora do risco.
    await qtyInput.fill('');
    await expect(rows).toHaveCount(3);
    await expect(missingRow.getByTestId('stock-status-chip-out_of_stock')).toBeVisible();
    await expect(missingRow.getByTestId('stock-status-chip-low_stock')).toHaveCount(0);
    await expect(lowStockChips(page)).toHaveCount(0);

    expect(errors, `pageerrors: ${errors.join(' | ')}`).toHaveLength(0);
  });
});
