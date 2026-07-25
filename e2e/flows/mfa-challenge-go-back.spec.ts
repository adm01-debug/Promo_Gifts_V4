/**
 * Fluxo: MfaChallengeDialog — botão "Voltar".
 *
 * Valida a UX pós-refactor do MfaChallengeDialog:
 *  - Clicar em "Voltar" NÃO desloga o usuário (sessão Supabase permanece)
 *  - Com histórico → retorna à rota anterior
 *  - Sem histórico (entrada direta) → fallback para "/"
 *  - Guard AAL2 continua ativo: nova visita à área protegida reabre o dialog
 *
 * Pré-condição: admin de teste com MFA já enrolado (currentAAL === 'aal1'
 * após login por senha). Skip automático caso o dialog não apareça — típico
 * de ambientes onde o admin não tem MFA cadastrado.
 */
import { test, expect } from "../fixtures/test-base";
import { Sel } from "../fixtures/selectors";
import { loginAs } from "../helpers/auth";
import { gotoAndSettle, expectOnRoute, waitForRouteIdle } from "../helpers/nav";
import { clickTestId, waitForTestIdVisible, waitForTestIdHidden } from "../helpers/waits";

const ADMIN_ROUTE = "/admin/usuarios";
const HOME_ROUTE = "/";

async function hasSupabaseSession(page: import("@playwright/test").Page): Promise<boolean> {
  return page.evaluate(() =>
    Object.keys(window.localStorage).some(
      (k) => k.startsWith("sb-") && k.endsWith("-auth-token"),
    ),
  );
}

async function dialogAppearedOrSkip(page: import("@playwright/test").Page): Promise<void> {
  const dialog = page.locator(Sel.mfa.challengeDialog).first();
  try {
    await dialog.waitFor({ state: "visible", timeout: 6_000 });
  } catch {
    test.skip(
      true,
      "MfaChallengeDialog não abriu — admin do ambiente não tem MFA enrolado ou já está em AAL2.",
    );
  }
}

test.describe("MfaChallengeDialog — botão Voltar", () => {
  test("com histórico: retorna à rota anterior mantendo a sessão", async ({ page }) => {
    await loginAs(page, "admin");

    // Cria histórico partindo da home antes de tocar a área AAL2.
    await gotoAndSettle(page, HOME_ROUTE);
    await waitForRouteIdle(page);
    await expectOnRoute(page, /\/$/);

    await gotoAndSettle(page, ADMIN_ROUTE);
    await dialogAppearedOrSkip(page);

    expect(await hasSupabaseSession(page)).toBe(true);

    await clickTestId(page, "mfa-challenge-go-back");

    await waitForTestIdHidden(page, "mfa-challenge-dialog");
    await expectOnRoute(page, /\/$/);
    // Sessão preservada — nada de /login nem /auth.
    await expect(page).not.toHaveURL(/\/(login|auth)(\?|#|$)/);
    expect(await hasSupabaseSession(page)).toBe(true);
  });

  test("sem histórico: fallback para / mantendo a sessão", async ({ page, context }) => {
    await loginAs(page, "admin");
    // Reutiliza a mesma sessão em uma aba nova sem histórico do app.
    const fresh = await context.newPage();
    try {
      await gotoAndSettle(fresh, ADMIN_ROUTE);
      const dialog = fresh.locator(Sel.mfa.challengeDialog).first();
      try {
        await dialog.waitFor({ state: "visible", timeout: 6_000 });
      } catch {
        test.skip(true, "MfaChallengeDialog não abriu — admin sem MFA enrolado.");
      }

      await clickTestId(fresh, "mfa-challenge-go-back");
      await waitForTestIdHidden(fresh, "mfa-challenge-dialog");
      await expectOnRoute(fresh, /\/$/);
      await expect(fresh).not.toHaveURL(/\/(login|auth)(\?|#|$)/);
      expect(await hasSupabaseSession(fresh)).toBe(true);
    } finally {
      await fresh.close();
    }
  });

  test("guard readmite: revisitar a área AAL2 reabre o dialog", async ({ page }) => {
    await loginAs(page, "admin");
    await gotoAndSettle(page, HOME_ROUTE);
    await gotoAndSettle(page, ADMIN_ROUTE);
    await dialogAppearedOrSkip(page);

    await clickTestId(page, "mfa-challenge-go-back");
    await waitForTestIdHidden(page, "mfa-challenge-dialog");

    // Sessão continua válida → nova visita deve reabrir (não deslogou).
    await gotoAndSettle(page, ADMIN_ROUTE);
    await waitForTestIdVisible(page, "mfa-challenge-dialog");
    expect(await hasSupabaseSession(page)).toBe(true);
  });
});
