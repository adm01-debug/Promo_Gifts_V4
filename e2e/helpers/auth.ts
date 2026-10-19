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
import { expect, type Page, type Request } from "@playwright/test";

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

// /login é alias legado da rota canônica /auth — ambas renderizam <Auth/>.
// Se o signIn falha, a página pode permanecer em qualquer uma das duas; checar
// só /login faria loginViaUI "passar" com sessão inexistente (specs falhavam
// depois, opacos, redirecionados para /auth).
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
  // CI: signIn encadeia check-login (6s) + GoTrue + credentials.store (3s) +
  // profile/roles + guard de IP (get-visitor-info 2x10s -> ipify 5s ->
  // validate-access 2x10s, todos fail-open). Com edge/DB lentos a soma passa de
  // 45s: medido em CI (run 38766909249), o login que concluiu levou ~38s, e os demais foram
  // abortados pelo timeout do helper ANTES de escrever a linha success em
  // login_attempts (sem linha de falha também — o login estava em voo, não
  // recusado). O orçamento abaixo cobre o pior caso documentado dessa cadeia
  // sem relaxar o assert: continuar em /login ainda reprova.
  const timeout = creds.timeoutMs ?? (process.env.CI ? 75_000 : 20_000);
  const netLog = createNetworkLog(page);

  // CI bypass: TURNSTILE_SECRET_KEY está configurado na edge function de produção,
  // mas em CI não há widget Turnstile disponível. Interceptamos check-login para
  // retornar allowed:true (o signInWithPassword do Supabase ainda roda de verdade).
  if (process.env.CI) {
    await page.route('**/functions/v1/check-login**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ allowed: true }),
      });
    });
  }

  try {
    await gotoAndSettle(page, "/login");
  } catch (err) {
    netLog.stop();
    throw err;
  }

  const emailLoc = page.locator(Sel.login.email).first();
  const passLoc = page.locator(Sel.login.password).first();
  await emailLoc.waitFor({ state: "visible", timeout: 10_000 });
  await emailLoc.fill(creds.email);
  await passLoc.fill(creds.password);

  await clickTestId(page, "login-submit");

  if (creds.expectFail) {
    netLog.stop();
    // Continua em /login OU mostra mensagem de erro — auto-retry expect.
    await expect(page, "esperado falhar e permanecer em /login").toHaveURL(
      LOGIN_URL_RE,
      { timeout: 8_000 },
    );
    return false;
  }

  // Sucesso = saiu da tela de auth (login falho também permanece em /auth,
  // então checar só /login abriria falso-positivo).
  // E02: captura URL e status atual no timeout para diagnóstico em 1 run.
  try {
    await expect(page, "esperado redirect para fora da tela de login").not.toHaveURL(
      AUTH_LIKE_URL_RE,
      { timeout },
    );
  } catch (err) {
    const currentUrl = page.url();
    // O início do body é só o painel de marca (igual em qualquer estado do
    // form) — o que diferencia "em voo" de "recusado" é o botão de submit e os
    // toasts, além da linha do tempo das chamadas Supabase.
    const submitText = await page
      .getByTestId("login-submit")
      .first()
      .textContent({ timeout: 2_000 })
      .catch(() => "(botão ausente)");
    const toastText = await page
      .locator('[data-sonner-toast], [role="status"], [role="alert"]')
      .allTextContents()
      .catch(() => [] as string[]);
    throw new Error(
      `[loginViaUI] Timeout aguardando redirect pós-login.\n` +
        `  URL atual: ${currentUrl}\n` +
        `  Botão submit: ${String(submitText).trim().slice(0, 80)}\n` +
        `  Toasts: ${toastText.map((t) => t.trim().slice(0, 160)).join(" | ") || "(nenhum)"}\n` +
        `  Chamadas Supabase (${timeout}ms de espera):\n${netLog.dump()}\n` +
        `  Causa original: ${String(err)}`,
    );
  } finally {
    if (process.env.CI) await page.unroute('**/functions/v1/check-login**').catch(() => undefined);
    netLog.stop();
  }
  await waitForRouteIdle(page);
  return true;
}

/**
 * Linha do tempo das chamadas ao Supabase (auth/functions/rest) durante o login:
 * duração e status das concluídas e idade das ainda pendentes. Só é lida no
 * caminho de falha — diferencia login lento (requests pendentes/lentas) de login
 * recusado (toast + 4xx) sem precisar de trace (que fica fora dos artefatos).
 */
function createNetworkLog(page: Page) {
  const startedAt = Date.now();
  const pending = new Map<unknown, { label: string; t0: number }>();
  const done: string[] = [];
  const label = (url: string, method: string): string | null => {
    const m = /\/(auth\/v1|functions\/v1|rest\/v1)\/([^?]*)/.exec(url);
    return m ? `${method} ${m[1]}/${m[2]}` : url.includes("api.ipify.org") ? `${method} ipify` : null;
  };
  const onRequest = (req: Request) => {
    const l = label(req.url(), req.method());
    if (l) pending.set(req, { label: l, t0: Date.now() });
  };
  const finish = (req: Request, status: string) => {
    const p = pending.get(req);
    if (!p) return;
    pending.delete(req);
    done.push(`    +${p.t0 - startedAt}ms ${p.label} -> ${status} (${Date.now() - p.t0}ms)`);
  };
  const onFinished = async (req: Request) => {
    const res = await req.response().catch(() => null);
    finish(req, String(res?.status() ?? "?"));
  };
  const onFailed = (req: Request) =>
    finish(req, `FAILED ${req.failure()?.errorText ?? ""}`.trim());
  page.on("request", onRequest);
  page.on("requestfinished", onFinished);
  page.on("requestfailed", onFailed);
  return {
    dump(): string {
      const now = Date.now();
      const open = [...pending.values()].map(
        (p) => `    +${p.t0 - startedAt}ms ${p.label} -> PENDENTE há ${now - p.t0}ms`,
      );
      return [...done.slice(-25), ...open].join("\n") || "    (nenhuma chamada observada)";
    },
    stop() {
      page.off("request", onRequest);
      page.off("requestfinished", onFinished);
      page.off("requestfailed", onFailed);
    },
  };
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
