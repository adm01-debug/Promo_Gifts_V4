import { test, expect } from '@playwright/test';
import { gotoAndSettle } from './helpers/nav';
import { devOnlyRouteReason, isProductionBuild } from './helpers/dev-only-route';

/**
 * Testes de Regressão Visual para OptimizedImage.
 * Valida o efeito blur-up, fade-in e estado de erro em diferentes viewports.
 *
 * A rota /debug/images é pública (sem ProtectedRoute), mas só montada em dev
 * (import.meta.env.DEV): contra build de produção o grupo é pulado.
 * Executa no project chromium-public (chromium, sem auth).
 */
test.describe('OptimizedImage Visual Regression', () => {
  const DEBUG_URL = '/debug/images';
  test.skip(isProductionBuild, devOnlyRouteReason(DEBUG_URL));

  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(
      testInfo.project.name !== 'chromium-public',
      'Baseline canônico do OptimizedImage roda somente no Chromium público.',
    );
    await gotoAndSettle(page, DEBUG_URL);
    await expect(page.getByText('OptimizedImage Demo')).toBeVisible();
  });

  test('should match initial loading state (blur-up)', async ({ page }) => {
    // Fixa o estado de loading: segura a resposta da imagem para o snapshot ser
    // deterministico (mesmo estado em CI sem rede e local com rede).
    await page.route('**/picsum.photos/**', async (route) => {
      await new Promise((r) => setTimeout(r, 15_000));
      await route.continue();
    });

    await gotoAndSettle(page, DEBUG_URL);
    await expect(page.getByText('OptimizedImage Demo')).toBeVisible();

    const loadingImage = page.locator('div.relative.overflow-hidden').first();
    // Garante que estamos no estado de loading (spinner visivel, imagem ainda nao carregou)
    await expect(loadingImage.locator('svg.lucide-loader-2')).toBeVisible({ timeout: 10_000 });

    // Pausa animacoes para snapshot estavel
    await page.addStyleTag({
      content: `*, *::before, *::after { animation-play-state: paused !important; transition: none !important; }`,
    });

    await expect(loadingImage).toHaveScreenshot('image-loading-blur.png', {
      maxDiffPixelRatio: 0.1,
    });
  });

  test('should match loaded state (fade-in complete)', async ({ page }) => {
    const image = page.locator('img[alt="LQIP Demo"]').first();
    // Image may never reach opacity:1 in CI (no real image server); skip gracefully
    const isLoaded = await image
      .waitFor({ state: 'visible', timeout: 5000 })
      .then(() => image.evaluate((el) => (el as HTMLImageElement).complete && (el as HTMLImageElement).naturalWidth > 0))
      .catch(() => false);
    test.skip(!isLoaded, 'Image did not fully load in CI — skipping loaded-state baseline');
    await expect(image).toHaveScreenshot('image-loaded-final.png', { threshold: 0.2 });
  });

  test('should match error state', async ({ page }) => {
    // O demo expõe um Button (não um checkbox rotulado): OptimizedImageDemo.tsx:161-165
    const errorToggle = page.getByRole('button', { name: 'Simular URL inválida' });
    await expect(errorToggle).toBeVisible({ timeout: 5000 });
    await errorToggle.click();

    // `div:has-text(...)` casava com #root (ancestral mais externo), gerando
    // screenshot da pagina inteira e altura instavel (1641 vs 1665 px).
    // O fallback e o <div> imediatamente pai do <span>Erro ao carregar</span>.
    const errorCard = page.getByText('Erro ao carregar').locator('..');
    await expect(errorCard).toBeVisible({ timeout: 10000 });

    await page.addStyleTag({
      content: `*, *::before, *::after { animation-play-state: paused !important; transition: none !important; }`,
    });

    await expect(errorCard).toHaveScreenshot('image-error-state.png', {
      maxDiffPixelRatio: 0.02,
    });
  });

  test('should be responsive (mobile viewport)', async ({ page }) => {
    // Mesmo determinismo do teste de loading: segura a resposta da imagem para
    // o snapshot nao depender de rede (picsum responde diferente a cada run).
    await page.route('**/picsum.photos/**', async (route) => {
      await new Promise((r) => setTimeout(r, 15_000));
      await route.continue();
    });

    await page.setViewportSize({ width: 375, height: 667 });
    await gotoAndSettle(page, DEBUG_URL);

    const imageContainer = page.locator('div.relative.overflow-hidden').first();
    await expect(imageContainer).toBeVisible();
    await expect(imageContainer.locator('svg.lucide-loader-2')).toBeVisible({ timeout: 10_000 });

    await page.addStyleTag({
      content: `*, *::before, *::after { animation-play-state: paused !important; transition: none !important; }`,
    });

    await expect(imageContainer).toHaveScreenshot('image-responsive-mobile.png');
  });
});
