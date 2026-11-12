import { test, expect } from '../fixtures/test-base';
import { loginAs } from '../helpers/auth';

test.describe('Global Search Comprehensive', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page);
    await page.goto('/');
    // Garantir que a página carregou
    await expect(page.getByRole('button', { name: 'Abrir busca global' })).toBeVisible();
  });

  test('Open palette with modifier+K and Button click', async ({ page }) => {
    // Test click trigger
    await page.getByRole('button', { name: 'Abrir busca global' }).click();
    await expect(page.locator('[role="dialog"]')).toBeVisible();
    // Na / o CatalogHeader também tem campos "Buscar produtos" (CatalogHeader.tsx:108/194): escopo na paleta
    await expect(
      page.getByRole('dialog', { name: 'Busca global' }).locator('input[placeholder*="Buscar produtos"]'),
    ).toBeFocused();
    
    // Close palette
    await page.keyboard.press('Escape');
    await expect(page.locator('[role="dialog"]')).not.toBeVisible();

    // Test shortcut trigger (modifier+K)
    const isMac = process.platform === 'darwin';
    const modifier = isMac ? 'Meta' : 'Control';
    await page.keyboard.press(`${modifier}+k`);
    await expect(page.locator('[role="dialog"]')).toBeVisible();
  });

  test('Voice search shortcut Ctrl+Shift+V', async ({ page }) => {
    // Open palette first (shortcut works both open and closed, but tooltip is in palette trigger)
    await page.keyboard.down('Control');
    await page.keyboard.down('Shift');
    await page.keyboard.press('v');
    await page.keyboard.up('Shift');
    await page.keyboard.up('Control');

    // Overlay de voz: role=dialog com nome estável (VoiceSearchOverlay.tsx:219-221); o h2 varia com a fase do microfone
    await expect(page.getByRole('dialog', { name: 'Fale com o Flow' })).toBeVisible();
  });

  test('Navigation and Selection in Idle State', async ({ page }) => {
    await page.getByRole('button', { name: 'Abrir busca global' }).click();
    
    // In Idle state we have "Mais Populares" or "Recentes"
    const items = page.locator('[cmdk-item]');
    
    // Wait for at least one item to be available (Popular products)
    await expect(items.first()).toBeVisible();

    // cmdk já abre com o 1º item selecionado; ArrowDown leva a seleção ao 2º
    await expect(items.first()).toHaveAttribute('data-selected', 'true');
    await page.keyboard.press('ArrowDown');
    await expect(items.nth(1)).toHaveAttribute('data-selected', 'true');
    await expect(items.first()).toHaveAttribute('data-selected', 'false');

    // Atalhos 1-9 agem sobre os resultados da busca (GlobalSearchPalette.tsx:106-115); o estado ocioso não tem.
    // Slash command gera resultado local, sem rede, após o debounce (useGlobalSearch.ts:818-831).
    const dialog = page.getByRole('dialog', { name: 'Busca global' });
    await dialog.locator('input[placeholder*="Buscar produtos"]').fill('/novo-orcamento');
    // O handler ignora teclas digitadas no INPUT: foco na lista (cmdk-list tem tabIndex=-1)
    await dialog.locator('[cmdk-list]').focus();
    // Sem sinal visível do fim do debounce (o cmdk filtra o item do DOM): repete o '1' até navegar
    await expect(async () => {
      await page.keyboard.press('1');
      await expect(page).toHaveURL(/\/orcamentos\/novo$/, { timeout: 1000 });
    }).toPass({ timeout: 5000 });
  });

  test('Visual Snapshots of search states', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    
    // 1. Idle State
    await page.getByRole('button', { name: 'Abrir busca global' }).click();
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveScreenshot('global-search-idle.png');

    // 2. Searching State — segura a resposta da busca semântica para o banner de IA ficar estável no snapshot
    await page.route('**/functions/v1/semantic-search', () => {});
    await dialog.locator('input[placeholder*="Buscar produtos"]').fill('caneca');
    // Check for AI processing banner
    await expect(page.locator('text=Analisando sua busca...')).toBeVisible();
    await expect(dialog).toHaveScreenshot('global-search-searching.png');
  });
});
