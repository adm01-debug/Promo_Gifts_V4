/**
 * E2E — Risco de Ruptura: matriz de cenários com `current`/`min`/`max`
 * indefinidos e diferentes combinações de alvo × horizonte.
 *
 * Usa fixture determinística → comportamento idêntico em qualquer ambiente.
 * Dados efetivos (stockFetcher): HEALTHY 5000 un, 5/dia · RISK 800 un, 20/dia ·
 * MISSING 0 un, sem velocidade (status `out_of_stock`, fora da fórmula).
 * Projeção = atual − média × horizonte; `low_stock` quando projeção < alvo
 * (src/lib/inventory/rupture-risk.ts). "Preciso de X un" é estrito: esconde o
 * produto cujo disponível < alvo (src/lib/inventory/stock-filter.ts).
 *
 * Tabela de cenários (linhas visíveis → SKUs com chip low_stock):
 *  | alvo | horiz | proj RISK | visíveis                 | low_stock |
 *  | —    | 3d    | —         | HEALTHY, RISK, MISSING   | nenhuma   |
 *  | —    | 30d   | —         | HEALTHY, RISK, MISSING   | nenhuma   |  (sem alvo: fórmula não roda)
 *  | 100  | 3d    | 740       | HEALTHY, RISK            | nenhuma   |
 *  | 500  | 3d    | 740       | HEALTHY, RISK            | nenhuma   |
 *  | 500  | 7d    | 660       | HEALTHY, RISK            | nenhuma   |
 *  | 500  | 15d   | 500       | HEALTHY, RISK            | nenhuma   |  (limite: 500 não é < 500)
 *  | 500  | 30d   | 200       | HEALTHY, RISK            | RISK      |
 *  | 700  | 7d    | 660       | HEALTHY, RISK            | RISK      |
 *  | 700  | 3d    | 740       | HEALTHY, RISK            | nenhuma   |
 *  | 1000 | 30d   | —         | HEALTHY                  | nenhuma   |  (RISK 800 < 1000 sai da lista)
 *
 * Invariantes:
 *  - SKU MISSING NUNCA entra em low_stock (pré-condição inválida).
 *  - SKU HEALTHY fica `in_stock` em todas as combinações.
 *  - Nenhum pageerror em qualquer troca de horizonte/alvo.
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
  type RuptureHorizon,
} from '../../helpers/rupture-horizon';

const HEALTHY = 'FX-HEALTHY-001-A';
const RISK = 'FX-RISK-001-A';
const MISSING = 'FX-MISSING-001-A';
const ALL_SKUS = [HEALTHY, RISK, MISSING];

interface Case {
  target: string;
  horizon: RuptureHorizon;
  visible: string[];
  lowStock: string[];
}

const CASES: Case[] = [
  { target: '', horizon: 3, visible: [HEALTHY, RISK, MISSING], lowStock: [] },
  { target: '', horizon: 30, visible: [HEALTHY, RISK, MISSING], lowStock: [] },
  { target: '100', horizon: 3, visible: [HEALTHY, RISK], lowStock: [] },
  { target: '500', horizon: 3, visible: [HEALTHY, RISK], lowStock: [] },
  { target: '500', horizon: 7, visible: [HEALTHY, RISK], lowStock: [] },
  { target: '500', horizon: 15, visible: [HEALTHY, RISK], lowStock: [] },
  { target: '500', horizon: 30, visible: [HEALTHY, RISK], lowStock: [RISK] },
  { target: '700', horizon: 7, visible: [HEALTHY, RISK], lowStock: [RISK] },
  { target: '700', horizon: 3, visible: [HEALTHY, RISK], lowStock: [] },
  { target: '1000', horizon: 30, visible: [HEALTHY], lowStock: [] },
];

test.describe('@regression /estoque — matriz: campos indefinidos × alvo × horizonte', () => {
  test('@rupture-horizon fallback consistente em todas as combinações', async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));

    await installRuptureFixture(page);
    await loginAs(page, 'admin');
    await gotoAndSettle(page, '/estoque');

    const qtyInput = page.getByPlaceholder(/Preciso de X un/i);
    const rows = stockRows(page);
    await expect(page.getByTestId('rupture-horizon-control')).toBeVisible();
    await expect(rows).toHaveCount(ALL_SKUS.length, { timeout: 60_000 });

    for (const c of CASES) {
      const label = `alvo=${c.target || '—'} horiz=${c.horizon}d`;

      // Sincroniza o debounce (500ms) do alvo pela contagem de linhas: zera
      // (3 linhas) e aplica o alvo do caso (linhas visíveis do caso).
      await qtyInput.fill('');
      await expect(rows, `${label}: reset do alvo`).toHaveCount(ALL_SKUS.length);
      await qtyInput.fill(c.target);
      await expect(rows, `${label}: linhas visíveis`).toHaveCount(c.visible.length);

      await selectRuptureHorizon(page, c.horizon);

      await expect(lowStockChips(page), `${label}: total low_stock`).toHaveCount(
        c.lowStock.length,
      );
      for (const sku of ALL_SKUS) {
        const row = stockRowBySku(page, sku);
        if (!c.visible.includes(sku)) {
          await expect(row, `${label}: ${sku} fora da lista`).toHaveCount(0);
          continue;
        }
        await expect(row, `${label}: ${sku} visível`).toHaveCount(1);
        const expectedStatus = c.lowStock.includes(sku)
          ? 'low_stock'
          : sku === MISSING
            ? 'out_of_stock'
            : 'in_stock';
        await expect(
          row.getByTestId(`stock-status-chip-${expectedStatus}`),
          `${label}: ${sku} com status ${expectedStatus}`,
        ).toBeVisible();
      }
    }

    expect(errors, `pageerrors: ${errors.join(' | ')}`).toHaveLength(0);
  });
});
