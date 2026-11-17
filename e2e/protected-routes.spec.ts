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
  // '/pedidos' saiu: nao existe no router (nenhum path="/pedidos" em src/routes).
  // Rota inexistente renderiza NotFound e nao redireciona, entao o waitForURL(/login/)
  // estourava o timeout - vermelho garantido que nao dizia nada sobre a guarda.
  '/simulador',
  '/colecoes',
  '/carrinhos',
];

test.describe('Protected Routes — Auth Guards', () => {
  for (const route of protectedRoutes) {
    test(`${route} should redirect to the auth surface`, async ({ page }) => {
      await page.goto(route);
      // ProtectedRoute redireciona para /auth (rota canonica); /login segue como
      // alias legado. Aceitar as duas evita vermelho que nao diz nada sobre a guarda.
      await page.waitForURL(/\/(?:auth|login)(?:[/?#]|$)/, { timeout: 10000 });
      expect(page.url()).toMatch(/\/(?:auth|login)(?:[/?#]|$)/);
    });
  }
});

// As publicas sao as de src/routes/public-routes.tsx. As tres antigas
// ('/proposta/test-token', '/approve/test-token', '/kit/test-token') NAO existem no
// router: rota inexistente cai em NotFound, que tambem nao redireciona para /login,
// entao o teste passava e certificava como "publica funcionando" uma rota que nao
// existe. Falso verde. '/auth' e a rota canonica e nao era coberta.
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
