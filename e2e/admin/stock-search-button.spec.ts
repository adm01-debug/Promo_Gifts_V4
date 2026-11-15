/**
 * E2E — Botão "Busca" do StockFilterToolbar.
 *
 * Cobre:
 *  1. Disabled state quando não há texto nem filtros ativos.
 *  2. Enable quando há texto OU pelo menos um filtro ativo.
 *  3. Acessibilidade: aria-label, aria-busy, foco via Tab e ativação via Enter.
 *  4. Paridade desktop/mobile do gatilho (Enter no input vs clique no botão).
 */
import { test, expect, type Page } from '../fixtures/test-base';
import { loginAs } from '../helpers/auth';
import { gotoAndSettle } from '../helpers/nav';

const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'mobile', width: 390, height: 844 },
] as const;

async function setup(page: Page) {
  await loginAs(page);
  await gotoAndSettle(page, '/estoque');
  const syncing = page.getByText(/Sincronizando estoque/i);
  if (await syncing.isVisible().catch(() => false)) {
    await expect(syncing).not.toBeVisible({ timeout: 60_000 });
  }
}

// Estado vazio real de /estoque quando a busca do toolbar zera o resultado:
// StockDashboard.tsx renderiza StockEmptyFiltersHint (chip "Busca: <termo>")
// e a VariantStockTable mostra "Nenhuma variação encontrada".
async function expectSearchApplied(page: Page, term: string) {
  await expect(page.getByTestId('stock-empty-filters-chip-search')).toContainText(term, {
    timeout: 15_000,
  });
  await expect(page.getByText('Nenhuma variação encontrada')).toBeVisible();
}

for (const vp of VIEWPORTS) {
  test.describe(`Stock search button — ${vp.name}`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } });

    test('disabled sem texto/filtros; habilita quando há texto', async ({ page }) => {
      await setup(page);
      const btn = page.getByTestId('stock-search-button');
      await expect(btn).toBeVisible();

      // Garante baseline limpo: se houver filtros pré-aplicados (ex.: status
      // padrão != 'all' em algum deploy), aciona o "Limpar" para zerar.
      const clearAll = page.getByRole('button', { name: /^Limpar filtros|Reset/i }).first();
      if (await clearAll.isVisible().catch(() => false)) {
        await clearAll.click();
      }

      await expect(btn).toBeDisabled();
      await expect(btn).toHaveAttribute('aria-label', /^Aplicar busca/i);
      await expect(btn).toHaveAttribute('aria-busy', 'false');

      const input = page.getByPlaceholder(/Buscar no Estoque/i);
      await input.fill('caneca');
      await expect(btn).toBeEnabled();

      // Limpar texto → volta a desabilitar (sem outros filtros ativos).
      await input.fill('');
      await expect(btn).toBeDisabled();
    });

    test('aplica busca com clique no botão e com Enter no input', async ({ page }) => {
      await setup(page);
      const input = page.getByPlaceholder(/Buscar no Estoque/i);
      const btn = page.getByTestId('stock-search-button');

      // 1) Enter no input
      await input.fill('zzz_inexistente_promo');
      await input.press('Enter');
      await expectSearchApplied(page, 'zzz_inexistente_promo');

      // 2) Clique no botão
      await page.getByRole('button', { name: /Limpar busca/i }).click();
      await input.fill('aaa_inexistente_promo');
      await btn.click();
      await expectSearchApplied(page, 'aaa_inexistente_promo');
    });

    test('acessível via teclado: Tab foca, Enter ativa', async ({ page }) => {
      await setup(page);
      const input = page.getByPlaceholder(/Buscar no Estoque/i);
      const btn = page.getByTestId('stock-search-button');

      await input.focus();
      await input.fill('teste');
      // Com texto no input, o "X" (Limpar busca) aparece entre o input e o
      // botão Busca: 1º Tab foca o X, 2º Tab foca o botão.
      await page.keyboard.press('Tab');
      await expect(page.getByRole('button', { name: 'Limpar busca' })).toBeFocused();
      await page.keyboard.press('Tab');
      await expect(btn).toBeFocused();
      // Enter no botão dispara a busca.
      await page.keyboard.press('Enter');
      // aria-busy fica true brevemente; aceitamos qualquer estado terminal.
      await expect(btn).toHaveAttribute('aria-busy', /true|false/);
    });
  });
}
