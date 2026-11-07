/**
 * E2E: Protected Routes — Verify auth guards on all critical routes
 */
import { test, expect } from '@playwright/test';

const protectedRoutes = [
  '/',
  '/dashboard',
  '/produtos',
  '/orcamentos',
  '/orcamentos/novo',
  '/orcamentos/kanban',
  '/orcamentos/dashboard',
  '/simulador',
  '/colecoes',
  '/carrinhos',
];

test.describe('Protected Routes — Auth Guards', () => {
  for (const route of protectedRoutes) {
    test(`${route} should redirect to the auth surface`, async ({ page }) => {
      await page.goto(route);
      // `/auth` is canonical; `/login` remains a supported legacy alias.
      await page.waitForURL(/\/(?:auth|login)(?:[/?#]|$)/, { timeout: 10000 });
      expect(page.url()).toMatch(/\/(?:auth|login)(?:[/?#]|$)/);
    });
  }
});

const publicRoutes = [
  '/auth',
  '/login',
  '/reset-password',
  '/forgot-password-confirmation',
  '/unauthorized',
  '/termos',
  '/privacidade',
  '/revista-publica/test-token',
];

test.describe('Public Routes — No Auth Required', () => {
  for (const route of publicRoutes) {
    test(`${route} should remain accessible without a session`, async ({ page }) => {
      await page.goto(route);
      await expect(page).toHaveURL(new RegExp(`${route.replaceAll('/', '\\/')}(?:[?#]|$)`));
      await expect(page.getByTestId('app-not-found')).toHaveCount(0);
    });
  }
});
