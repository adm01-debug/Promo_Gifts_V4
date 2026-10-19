/**
 * P0 — Auth: recovery de sessão, MFA, logout global, password reset.
 */
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createSupabaseClientMock, resetExternalMocks } from "./_mocks";

describe("P0 — Auth recovery", () => {
  beforeEach(() => {
    createSupabaseClientMock();
  });
  afterEach(() => resetExternalMocks());

  it.todo("login: erro 503 do auth NÃO trava UI — botão volta ao estado idle");

  it.todo("session expired: redireciona para /login preservando returnTo");

  it.todo("force-global-logout: invalida refresh token de TODAS as sessões do usuário");

  it.todo("password reset: fluxo de 3 fases (mem://security/password-recovery-flow) não pula etapas");

  it.todo("MFA: totp inválido NÃO conta como tentativa de senha errada");

  it.todo("signup público: bloqueado (closed-platform-policy)");

  it.todo("detect-new-device: dispara notificação no primeiro login de novo IP");
});
