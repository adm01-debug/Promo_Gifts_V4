import { test, expect } from '@playwright/test';
import { gotoAndSettle } from './helpers/nav';

/**
 * E2E tests for OptimizedImage detection logic and placeholder generation.
 * Validates Cloudflare imagedelivery.net handling and other CDN providers.
 *
 * A rota /debug/images é pública (sem ProtectedRoute) em todos os ambientes.
 * Executa no project chromium-public (chromium, sem auth).
 */
test.describe('OptimizedImage Detection & Placeholders', () => {
  const DEMO_URL = '/debug/images';

  test.beforeEach(async ({ page }) => {
    await gotoAndSettle(page, DEMO_URL);
    await expect(page.getByText('OptimizedImage Demo')).toBeVisible();
  });

  test('should detect Cloudflare images and request /thumbnail placeholder', async ({ page }) => {
    // O host de demonstração é intencionalmente sintético. A imagem principal
    // e o thumbnail podem falhar rápido e desmontar o placeholder antes de uma
    // asserção DOM. O contrato estável é a URL que o browser efetivamente pede.
    const thumbnailRequests: string[] = [];
    page.on('request', (request) => {
      try {
        const url = new URL(request.url());
        if (url.hostname === 'imagedelivery.net' && url.pathname.endsWith('/thumbnail')) {
          thumbnailRequests.push(url.toString());
        }
      } catch {
        // URLs não absolutas não fazem parte do contrato Cloudflare.
      }
    });

    await page.setContent('<!doctype html><title>reset</title>');
    await gotoAndSettle(page, DEMO_URL);

    // BUG-OI-1 evita carregar thumbnails fora da viewport. O card precisa
    // entrar em visão antes de esperarmos a requisição de placeholder.
    const container = page
      .locator('[data-detection-rule]')
      .filter({ has: page.locator('img[alt="Cloudflare CDN Demo"]') })
      .first();
    await expect(container).toHaveAttribute('data-detection-rule', 'cloudflare');
    await container.scrollIntoViewIfNeeded();
    await expect
      .poll(() => thumbnailRequests.length, {
        message: 'o card Cloudflare visível deve solicitar a variante /thumbnail',
        timeout: 15_000,
      })
      .toBeGreaterThan(0);

    const thumbnailUrl = thumbnailRequests[0];
    expect(thumbnailUrl).toContain('/thumbnail');
    expect(thumbnailUrl).not.toContain('/public');
  });

  test('should emit console.info only for debug mode or CF detection', async ({ page }) => {
    const logs: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'info' && msg.text().includes('[OptimizedImage]')) {
        logs.push(msg.text());
      }
    });

    await gotoAndSettle(page, DEMO_URL);
    await expect(page.getByText('OptimizedImage Demo')).toBeVisible();

    // O card Cloudflare tem debug={true} → deve emitir os logs
    expect(logs.some((log) => log.includes('Cloudflare Image detected'))).toBe(true);
    expect(logs.some((log) => log.includes('CF_VARIANT_REPLACEMENT'))).toBe(true);
    expect(logs.some((log) => log.includes('/thumbnail'))).toBe(true);
  });

  test('should handle edge cases for Cloudflare URLs', async ({ page }) => {
    // 3 linhas com data-testid="row-cloudflare" (Padrão, c/ Query, c/ Barra)
    const cfQueryRow = page.locator('tr[data-testid="row-cloudflare"]').nth(1);
    const cfSlashRow = page.locator('tr[data-testid="row-cloudflare"]').nth(2);

    await expect(cfQueryRow).toBeVisible();
    await expect(cfSlashRow).toBeVisible();

    await expect(cfQueryRow.locator('div.relative.overflow-hidden')).toHaveAttribute(
      'data-detection-rule',
      'cloudflare',
    );
    await expect(cfSlashRow.locator('div.relative.overflow-hidden')).toHaveAttribute(
      'data-detection-rule',
      'cloudflare',
    );
  });

  test('should correctly identify other providers', async ({ page }) => {
    await expect(
      page.locator('tr[data-testid="row-unsplash"] div.relative.overflow-hidden'),
    ).toHaveAttribute('data-detection-rule', 'unsplash');
    await expect(
      page.locator('tr[data-testid="row-supabase"] div.relative.overflow-hidden'),
    ).toHaveAttribute('data-detection-rule', 'supabase');
    await expect(
      page.locator('tr[data-testid="row-generic"] div.relative.overflow-hidden'),
    ).toHaveAttribute('data-detection-rule', 'generic');
  });
});
