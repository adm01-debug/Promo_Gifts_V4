/**
 * e2e/freight/simulator.spec.ts — Simulador de Volumes de Frete (etapa 60).
 *
 * Cobre o fluxo real da página `/simulador-frete`:
 *  1. Abre a rota com o guard autenticado e o título visível.
 *  2. Busca e adiciona um produto; edita a quantidade.
 *  3. Preenche o CEP (máscara) e vê o plano de volumes.
 *  4. "Levar para orçamento" grava o autosave e navega para o builder.
 *
 * Tags: @freight @simulator @e2e
 */
import { test, expect } from '../fixtures/test-base';
import { gotoAndSettle } from '../helpers/nav';

test.describe('Simulador de Volumes de Frete @freight', () => {
  test.skip(
    !process.env.VITE_SUPABASE_URL || process.env.CI_SKIP_FREIGHT_E2E === '1',
    'Pulando: credenciais não configuradas ou CI_SKIP_FREIGHT_E2E=1',
  );

  test.beforeEach(() => requireAuth());

  test('abre a rota com título e estado vazio', async ({ page }) => {
    await gotoAndSettle(page, '/simulador-frete');

    await expect(page.getByTestId('page-title-simulador-frete')).toBeVisible({ timeout: 10_000 });
    await expect(
      page.getByText(/nenhum produto ainda\. adicione para calcular o plano de volumes/i),
    ).toBeVisible();
  });

  test('adiciona produto, altera quantidade e preenche o CEP', async ({ page }) => {
    await gotoAndSettle(page, '/simulador-frete');

    await page.getByTestId('simulator-open-search').click();
    const searchInput = page.getByPlaceholder(/buscar por nome, sku/i);
    await searchInput.waitFor({ state: 'visible', timeout: 10_000 });
    await searchInput.fill('caneta');
    const firstOption = page.getByTestId(/product-search-option-/).first();
    await firstOption.waitFor({ state: 'visible', timeout: 10_000 });
    await firstOption.click();

    const qty = page.getByTestId(/simulator-qty-/).first();
    await expect(qty).toBeVisible({ timeout: 10_000 });
    await qty.fill('4');
    await expect(qty).toHaveValue('4');

    const cep = page.getByTestId('simulator-cep');
    await cep.fill('13015000');
    await expect(cep).toHaveValue('13015-000');

    const hint = page.getByTestId('simulator-cep-hint');
    await expect(hint).toContainText(/cotação: disponível em breve/i, { timeout: 10_000 });
  });

  test('leva para o orçamento com autosave', async ({ page }) => {
    await gotoAndSettle(page, '/simulador-frete');

    await page.getByTestId('simulator-open-search').click();
    const searchInput = page.getByPlaceholder(/buscar por nome, sku/i);
    await searchInput.waitFor({ state: 'visible', timeout: 10_000 });
    await searchInput.fill('caneta');
    const firstOption = page.getByTestId(/product-search-option-/).first();
    await firstOption.waitFor({ state: 'visible', timeout: 10_000 });
    await firstOption.click();

    const carry = page.getByTestId('simulator-carry-to-quote');
    await expect(carry).toBeEnabled({ timeout: 10_000 });
    await carry.click();

    await page.waitForURL(/\/orcamentos\/novo/, { timeout: 15_000 });
    const autosave = await page.evaluate(() => localStorage.getItem('quote_builder_autosave'));
    expect(autosave).toBeTruthy();
    const payload = JSON.parse(autosave as string);
    expect(payload.data.items.length).toBeGreaterThan(0);
  });
});
