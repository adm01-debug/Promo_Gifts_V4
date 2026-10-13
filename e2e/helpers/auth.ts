/**
 * Helpers SSOT de autenticação para a suíte E2E.
 *
 * Política:
 *  - **Todo login UI** deve passar por `loginViaUI` ou `loginAs` — nunca usar
 *    `page.fill('#login-…')` ou `input[type=email]` em specs.
 *  - `loginAs` reaproveita `storageState` global gerado pelo `auth.setup`,
 *    apenas refazendo UI se a sessão não estiver presente.
 *  - Seletores vêm exclusivamente do SSOT `e2e/fixtures/selectors.ts`.
 *  - Asserts via `expect(page).toHaveURL(...)` (auto-retry do Playwright) —
 *    evita `waitForTimeout`.
 *
 * Uso típico:
 *   import { loginAs, loginViaUI, expectAuthenticated } from "../helpers/auth";
 *   await loginAs(page);                          // user comum
 *   await loginAs(page, "admin");                 // admin
 *   await loginViaUI(page, { email, password, expectFail: true });
 */
import { expect, type Page } from "@playwright/test";

import { Sel } from "../fixtures/selectors";
import { test } from "../fixtures/test-base";
import { gotoAndSettle, waitForRouteIdle } from "./nav";
import { clickTestId } from "./waits";

export interface LoginCreds {
  email: string;
  password: string;
  /** Quando true, espera permanecer em /login (validação/erro). */
  expectFail?: boolean;
  /** Timeout customizado para o redirect pós-login. */
  timeoutMs?: number;
}

export type Role = "user" | "admin" | "dev" | "editor";

const LOGIN_URL_RE = /\/(login|auth)(\?|#|$)/;
// Rotas públicas protegidas redirecionam para /auth (além de /login): a
// checagem de "já autenticado" precisa cobrir ambos ou o login nunca acontece.
const AUTH_LIKE_URL_RE = /\/(login|auth)(\?|#|$)/;

/**
 * Executa o fluxo de login via UI usando seletores SSOT.
 * Retorna `true` se autenticado, `false` se ficou na tela de login (esperado em
 * `expectFail: true`).
 */
export async function loginViaUI(page: Page, creds: LoginCreds): Promise<boolean> {
  // CI: signIn encadeia check-login + GoTrue + profile/roles/IP — em edge fria
  // passa de 20s fácil (botão fica "Iniciando Sistemas..." travado).
  const timeout = creds.timeoutMs ?? (process.env.CI ? 45_000 : 20_000);
  await gotoAndSettle(page, "/login");

  const emailLoc = page.locator(Sel.login.email).first();
  const passLoc = page.locator(Sel.login.password).first();
  await emailLoc.waitFor({ state: "visible", timeout: 10_000 });
  await emailLoc.fill(creds.email);
  await passLoc.fill(creds.password);

  await clickTestId(page, "login-submit");

  if (creds.expectFail) {
    // Continua em /login OU mostra mensagem de erro — auto-retry expect.
    await expect(page, "esperado falhar e permanecer em /login").toHaveURL(
      LOGIN_URL_RE,
      { timeout: 8_000 },
    );
    return false;
  }

  // Sucesso = saiu da tela de auth (login falho também permanece em /auth,
  // então checar só /login abriria falso-positivo).
  await expect(page, "esperado redirect para fora da tela de login").not.toHaveURL(
    AUTH_LIKE_URL_RE,
    { timeout },
  );
  await waitForRouteIdle(page);
  return true;
}

/**
 * Faz login com a credencial do papel solicitado, reaproveitando o
 * `storageState` quando já existe sessão. Marca o teste como `skip` se as
 * variáveis de ambiente não estiverem configuradas.
 */
export async function loginAs(page: Page, role: Role = "user"): Promise<void> {
  const email = role === "dev" ? process.env.E2E_DEV_EMAIL : 
                role === "admin" ? process.env.E2E_ADMIN_EMAIL : 
                role === "editor" ? (process.env.E2E_MANAGER_EMAIL || process.env.E2E_ADMIN_EMAIL) : 
                process.env.E2E_USER_EMAIL;
  const password = role === "dev" ? process.env.E2E_DEV_PASSWORD : 
                   role === "admin" ? process.env.E2E_ADMIN_PASSWORD : 
                   role === "editor" ? (process.env.E2E_MANAGER_PASSWORD || process.env.E2E_ADMIN_PASSWORD) : 
                   process.env.E2E_USER_PASSWORD;

  if (!email || !password) {
    // E21 — modo estrito: em CI, credentials ausentes = falha imediata.
    if (process.env.CI) {
      throw new Error(
        `[loginAs] E21 — modo estrito: E2E_${role.toUpperCase()}_EMAIL/PASSWORD ausentes em CI.`,
      );
    }
    test.skip(true, `Credenciais E2E_${role.toUpperCase()}_EMAIL/PASSWORD ausentes`);
  }

  // Se já estamos autenticados (storageState aplicado pelo project), uma
  // visita rápida à home não deve cair em tela de auth nem exibir o form.
  // URL sozinha não basta: "/" pode não redirecionar (landing pública) ou ir
  // para /auth em vez de /login — em ambos os casos URL diz "autenticado" sem
  // sessão, e os specs corriam deslogados (falso-negativo silencioso).
  await gotoAndSettle(page, "/");
  const onAuthPage = AUTH_LIKE_URL_RE.test(page.url());
  const loginFormVisible = await page
    .locator(Sel.login.email)
    .first()
    .isVisible()
    .catch(() => false);
  if (onAuthPage || loginFormVisible) {
    await loginViaUI(page, { email: email!, password: password! });
  }

  await dismissOnboardingTour(page);
}

/**
 * O tour de onboarding (`user_onboarding.has_completed_tour=false`) abre um
 * overlay full-screen ("Passo 1 de 13") que intercepta cliques em qualquer
 * página autenticada. Clica em "Pular" se aparecer — marca o tour como
 * concluído para a conta E2E e libera a interação com a página.
 */
export async function dismissOnboardingTour(page: Page): Promise<void> {
  const skipBtn = page.getByRole("button", { name: "Pular" }).first();
  try {
    // O tour aparece de forma assíncrona (fetch de user_onboarding).
    await skipBtn.waitFor({ state: "visible", timeout: 4_000 });
    await skipBtn.click();
    await skipBtn.waitFor({ state: "hidden", timeout: 5_000 }).catch(() => {});
  } catch {
    // Tour não apareceu — nada a fazer.
  }
}

/**
 * Encerra a sessão atual via UI (best-effort). Se não houver controle de
 * usuário visível, faz fallback removendo o storage manualmente.
 */
export async function logout(page: Page): Promise<void> {
  await page.context().clearCookies().catch(() => {});
  await page.evaluate(() => {
    try { localStorage.clear(); sessionStorage.clear(); } catch { /* noop */ }
  }).catch(() => {});
  await gotoAndSettle(page, "/login");
  await expect(page).toHaveURL(LOGIN_URL_RE, { timeout: 8_000 });
}

/** Asserts reutilizáveis. */
export async function expectAuthenticated(page: Page): Promise<void> {
  await expect(page, "deveria estar autenticado").not.toHaveURL(LOGIN_URL_RE, {
    timeout: 5_000,
  });
}

export async function expectUnauthenticated(page: Page): Promise<void> {
  await expect(page, "deveria estar deslogado / em /login").toHaveURL(LOGIN_URL_RE, {
    timeout: 5_000,
  });
}
