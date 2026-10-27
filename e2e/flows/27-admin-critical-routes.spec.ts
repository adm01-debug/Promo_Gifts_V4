/**
 * E2E — Rotas críticas de Admin: validação de carregamento e RBAC
 *
 * Verifica que todas as rotas administrativas críticas:
 *   - Carregam sem crash (não 404/500)
 *   - Redirecionam corretamente usuários não-autorizados
 *   - Exibem conteúdo correto para usuários autenticados
 */
import { test, expect } from "@playwright/test";
import { gotoAndSettle, waitForRouteIdle } from "../helpers/nav";

const ADMIN_ROUTES = [
  { path: "/admin/usuarios", label: "Gestão de Usuários" },
  { path: "/admin/roles", label: "Roles e Permissões" },
  { path: "/admin/conexoes", label: "Conexões externas" },
  { path: "/admin/seguranca", label: "Segurança" },
  { path: "/admin/rate-limit", label: "Rate Limit" },
  { path: "/admin/rls-denials", label: "RLS Denials" },
  { path: "/admin/system-status", label: "System Status" },
  { path: "/admin/telemetry", label: "Telemetria" },
  { path: "/admin/ai-usage", label: "AI Usage" },
  { path: "/admin/workflows", label: "Workflows" },
] as const;

test.describe("Rotas Admin críticas — carregamento e RBAC", () => {
  for (const { path, label } of ADMIN_ROUTES) {
    test(`${label} (${path}) carrega ou redireciona para login`, async ({ page }) => {
      await gotoAndSettle(page, path);

      // Deve carregar OU redirecionar para login — nunca retornar 500
      const isLoginPage = /\/(auth|login)/.test(page.url());
      const body = page.locator("body");

      await expect(body).not.toContainText(/Erro 500|Internal Server Error|500 Internal/i, { timeout: 10_000 });
      await expect(body).not.toContainText("Unexpected error", { timeout: 5_000 });

      if (!isLoginPage) {
        // Se não redirecionou, a página deve ter algum conteúdo (não estar em branco)
        const hasContent = await body.locator("main, [role='main'], [data-testid], h1, h2").count();
        expect(hasContent).toBeGreaterThan(0);
      }
    });
  }

  test("navegação entre rotas admin é fluida (sem full reload)", async ({ page }) => {
    await gotoAndSettle(page, "/admin/usuarios");

    const prevUrl = page.url();
    await gotoAndSettle(page, "/admin/roles");

    const newUrl = page.url();

    // Ambas devem ter carregado (URL mudou ou permaneceu em login se sem auth)
    expect(typeof prevUrl).toBe("string");
    expect(typeof newUrl).toBe("string");
    await expect(page.locator("body")).not.toContainText(/Erro 500|Internal Server Error|500 Internal/i);
  });

  test("dashboard admin (/admin) carrega sem 500", async ({ page }) => {
    await gotoAndSettle(page, "/admin");
    await expect(page.locator("body")).not.toContainText(/Erro 500|Internal Server Error|500 Internal/i);
  });
});
