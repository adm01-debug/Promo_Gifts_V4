import { test, expect } from '../fixtures/test-base';
import { loginAs } from '../helpers/auth';

test.describe('Global Search Comprehensive', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page);
    await page.goto('/');
    // Garantir que a página carregou
    await expect(page.getByRole('button', { name: 'Abrir busca global' })).toBeVisible();
  });

  test('Open palette with modifier+K and Button click', async ({ page }, testInfo) => {
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
    // FIX BUG-E2E-GS-01: process.platform é sempre 'linux' em CI mesmo rodando webkit.
    // Webkit emula Desktop Safari (Mac) e espera Meta+K; detectar via project name.
    const isWebkit = testInfo.project.name.includes('webkit');
    const modifier = isWebkit ? 'Meta' : 'Control';
    await page.keyboard.press(`${modifier}+k`);
    await expect(page.locator('[role="dialog"]')).toBeVisible();
  });

  test('Voice search shortcut Ctrl+Shift+V', async ({ page }, testInfo) => {
    // FIX BUG-E2E-GS-02: Control+Shift+V não funciona em webkit (Safari intercepta o atalho).
    // useGlobalSearch.ts aceita (e.metaKey || e.ctrlKey) + e.shiftKey + e.key==='V',
    // portanto Meta+Shift+V é equivalente e funciona em webkit.
    const isWebkit = testInfo.project.name.includes('webkit');
    await page.keyboard.press(isWebkit ? 'Meta+Shift+V' : 'Control+Shift+V');

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

  test('Visual Snapshots of search states', async ({ page }, testInfo) => {
    // FIX BUG-E2E-GS-03: Sem baselines para firefox/webkit no repo e CI bloqueia criação
    // (updateSnapshots:'none' em playwright.config.ts). Limitar snapshots ao chromium.
    if (!testInfo.project.name.includes('chromium')) {
      test.skip();
    }

    await page.setViewportSize({ width: 1280, height: 800 });
    
    // 1. Idle State
    await page.getByRole('button', { name: 'Abrir busca global' }).click();
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible();
    // "Atalhos" vem do banco (useCategoryIcons) e entra depois da abertura (~200px de altura):
    // sem esperar, o snapshot alterna entre a paleta sem e com a seção
    await expect(dialog.getByRole('group', { name: 'Atalhos rápidos' })).toBeVisible();
    await expect(dialog).toHaveScreenshot('global-search-idle.png');

    // 2. Searching State — segura a resposta da busca semântica para o banner de IA ficar estável no snapshot
    await page.route('**/functions/v1/semantic-search', () => {});
    await dialog.locator('input[placeholder*="Buscar produtos"]').fill('caneca');
    // Check for AI processing banner
    await expect(page.locator('text=Analisando sua busca...')).toBeVisible();
    await expect(dialog).toHaveScreenshot('global-search-searching.png');
  });
});
