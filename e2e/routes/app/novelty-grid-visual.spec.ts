import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { gotoAndSettle } from '../../helpers/nav';

const viewports = [
  { width: 360, height: 800, name: 'mobile-360' },
  { width: 768, height: 1024, name: 'tablet-768' },
  { width: 1024, height: 768, name: 'tablet-1024' },
  { width: 1440, height: 900, name: 'desktop-1440' },
];

test.describe('Novelty Grid Advanced Visual & A11y @mobile', () => {
  test.beforeEach(async ({ context }) => {
    // Regressão visual autenticada: requer login real (E2E_USER_*) e baselines
    // commitados. Sem credenciais (full-ci / visual-tests sem secrets) pula
    // limpo em vez de falhar — espelha requireAuth() do test-base.
    test.skip(
      !process.env.E2E_USER_EMAIL || !process.env.E2E_USER_PASSWORD,
      'E2E_USER_EMAIL/PASSWORD não configurados — baseline visual autenticada indisponível',
    );
    await context.addInitScript(() => {
      const defaultFlags = {
        'mfa': 'false',
        'ai_recommendations': 'true',
        'presentation_mode': 'true',
        'voice_commands': 'true',
        'magic_up': 'true',
        'e2e_tests': 'true',
        'advanced_analytics': 'true',
        'custom_kits_v2': 'false'
      };

      Object.entries(defaultFlags).forEach(([flag, value]) => {
        localStorage.setItem(`ff_${flag}`, value);
      });

      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then(registrations => {
          for (const registration of registrations) {
            registration.unregister();
          }
        });
      }
    });
  });

  for (const viewport of viewports) {
    test.describe(`Viewport: ${viewport.name}`, () => {
      test.use({ viewport: { width: viewport.width, height: viewport.height } });

      test('Header Immediate Rendering & Visual', async ({ page }) => {
        await gotoAndSettle(page, '/novidades');

        const title = page.getByTestId('page-title-novidades');
        const desc = page.getByTestId('novelty-description');

        await expect(title).toBeVisible();
        await expect(title).toHaveText('Novidades');
        await expect(desc).toHaveText(
          'Produtos recém-chegados, destacados como novidade pelos fornecedores',
        );

        // Container real do cabecalho (NoveltiesPage.tsx: <div class="flex min-w-0 items-center gap-3">)
        const header = title.locator('xpath=ancestor::div[contains(@class,"items-center")][1]');
        await expect(header).toHaveScreenshot(`novelty-header-only-${viewport.name}.png`);
      });

      test('Grid Visual Regression & Scroll', async ({ page }) => {
        await gotoAndSettle(page, '/novidades');
        const grid = page.locator('div[role="list"]');
        await grid.waitFor({ state: 'visible', timeout: 20_000 });
        await page.waitForTimeout(1000);

        await expect(grid).toHaveScreenshot(`novelty-grid-initial-${viewport.name}.png`, {
          maxDiffPixelRatio: 0.02,
        });

        await grid.evaluate(el => el.scrollTop = 1000);
        await page.waitForTimeout(800);

        await expect(grid).toHaveScreenshot(`novelty-grid-scrolled-${viewport.name}.png`, {
          maxDiffPixelRatio: 0.02,
        });
      });

      test('Accessibility Scan', async ({ page }) => {
        await gotoAndSettle(page, '/novidades');
        const grid = page.locator('div[role="list"]');
        await grid.waitFor({ state: 'visible', timeout: 20_000 });

        const results = await new AxeBuilder({ page })
          .include('div[role="list"]')
          .analyze();

        if (results.violations.length > 0) {
          console.error(`A11y Violations for viewport ${viewport.name}:`);
          results.violations.forEach(v => {
            console.error(`- [${v.id}] ${v.help} (${v.impact})`);
            console.error(`  URL: ${v.helpUrl}`);
            console.error(`  Nodes: ${v.nodes.length}`);
          });
        }

        expect(results.violations, `A11y violations found in ${viewport.name}: ${results.violations.map(v => v.id).join(', ')}`).toEqual([]);
      });

      test('Browser Preferences - Accessibility Consistency', async ({ page }) => {
        await page.addStyleTag({
          content: `
            html { font-size: 20px !important; }
            * { transition: none !important; animation: none !important; }
          `
        });

        await gotoAndSettle(page, '/novidades');
        const grid = page.locator('div[role="list"]');
        await grid.waitFor({ state: 'visible', timeout: 20_000 });

        await expect(grid).toHaveScreenshot(`novelty-grid-a11y-prefs-${viewport.name}.png`);
      });

      test('Keyboard Navigation', async ({ page }) => {
        await gotoAndSettle(page, '/novidades');
        await page.keyboard.press('Tab');

        const activeElement = await page.evaluate(() => document.activeElement?.tagName);
        expect(activeElement).toBeDefined();

        await page.keyboard.press('Tab');
        await expect(page).toHaveScreenshot(`novelty-keyboard-focus-${viewport.name}.png`);
      });
    });
  }

  test('Skeleton State & Layout Stability', async ({ page }) => {
    // O fetch de novidades vai direto ao Supabase (useNovelties.helpers.ts:387),
    // nao por /api/external-db — o mock HTTP antigo nunca era consumido.
    // Aqui atrasamos a resposta REST real para capturar o skeleton.
    await page.route('**/rest/v1/products**', async route => {
      await new Promise(resolve => setTimeout(resolve, 2000));
      await route.continue();
    });

    await page.goto('/novidades', { waitUntil: 'domcontentloaded' });

    const skeleton = page.locator('.animate-spin').first();
    await expect(skeleton).toBeVisible({ timeout: 20_000 });

    await page.waitForSelector('div[role="list"]', { timeout: 30_000 });
    const realGrid = page.locator('div[role="list"]');
    await expect(realGrid).toBeVisible();
    await expect(realGrid).toHaveScreenshot('novelty-data-loaded-stability.png', {
      maxDiffPixelRatio: 0.02,
    });
  });

  test('Card Variations: Long Title & Consultation Price', async ({ page }) => {
    // Mock no endpoint REST real consumido pelo client Supabase.
    const nowIso = new Date().toISOString();
    const expiresIso = new Date(Date.now() + 20 * 24 * 3600 * 1000).toISOString();
    const base = {
      set_image_url: null,
      category_id: null,
      supplier_id: null,
      is_new: true,
      novelty_detected_at: nowIso,
      novelty_expires_at: expiresIso,
      stock_quantity: 100,
      min_quantity: 10,
      primary_image_url: 'https://placehold.co/64x64.png',
    };
    const mockProducts = [
      { ...base, id: 'var-1', name: 'Short Title', sku: 'SKU-1', sale_price: 100 },
      {
        ...base,
        id: 'var-2',
        name: 'This is a very long product name that should definitely wrap to multiple lines and potentially push the layout down if not handled correctly by min-height constraints',
        sku: 'SKU-2',
        sale_price: 200,
      },
      { ...base, id: 'var-3', name: 'Consultation Price Item', sku: 'SKU-3', sale_price: 150 },
    ];

    await page.route('**/rest/v1/products**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: { 'content-range': '0-2/3' },
        body: JSON.stringify(mockProducts),
      });
    });

    await gotoAndSettle(page, '/novidades');

    const cards = page.locator('div[role="listitem"]');
    await expect(cards).toHaveCount(3, { timeout: 20_000 });

    await expect(page.locator('div[role="list"]')).toHaveScreenshot('novelty-card-variations.png', {
      maxDiffPixelRatio: 0.02,
    });
  });
});
