/**
 * Guards pós-login — gate de IP + redirect (validação exaustiva 2026-10).
 *
 * Garantias cobertas:
 *   - IP com restrição → signOut + UMA linha de falha auditada + estado
 *     ipBlocked + sem navegação;
 *   - IP sem restrição ou permitido → passa;
 *   - validateAndRedirect(ipChecked=true) não re-checa IP e não escreve
 *     success (o caller escreve — dedup de login_attempts);
 *   - exceção no meio → fail-open com navegação.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createPostLoginGuards } from '@/pages/auth/postLoginGuards';
import type { IPValidationResult } from '@/hooks/admin/useIPValidation';

function makeDeps(overrides: Partial<Parameters<typeof createPostLoginGuards>[0]> = {}) {
  const deps = {
    validateIPForAuthenticatedUser: vi.fn((): Promise<IPValidationResult> =>
      Promise.resolve({
        isAllowed: true,
        hasRestrictions: false,
        currentIP: '1.2.3.4',
        reason: null,
        error: null,
      }),
    ),
    logLoginAttempt: vi.fn(() => Promise.resolve(undefined)),
    signOut: vi.fn(() => Promise.resolve(undefined)),
    toast: vi.fn(),
    navigate: vi.fn(),
    resolveRedirectTarget: () => '/home',
    setIpBlocked: vi.fn(),
    setBlockedIP: vi.fn(),
    setLoginStatus: vi.fn(),
    ...overrides,
  };
  return deps;
}

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

describe('ensureIPAllowed', () => {
  it('IP permitido → true, sem signOut nem linha de falha', async () => {
    const deps = makeDeps();
    const { ensureIPAllowed } = createPostLoginGuards(deps);
    expect(await ensureIPAllowed('u1', 'a@b.com')).toBe(true);
    expect(deps.signOut).not.toHaveBeenCalled();
    expect(deps.logLoginAttempt).not.toHaveBeenCalled();
  });

  it('IP bloqueado com restrição → signOut + falha auditada + ipBlocked', async () => {
    const deps = makeDeps({
      validateIPForAuthenticatedUser: vi.fn(() =>
        Promise.resolve({
          isAllowed: false,
          hasRestrictions: true,
          currentIP: '9.9.9.9',
          reason: 'ip_not_whitelisted',
          error: 'IP fora da whitelist',
        }),
      ),
    });
    const { ensureIPAllowed } = createPostLoginGuards(deps);
    expect(await ensureIPAllowed('u1', 'a@b.com')).toBe(false);
    expect(deps.signOut).toHaveBeenCalledOnce();
    // Uma linha success=false auditada — a tentativa é registrada sem virar
    // par success+failure (a linha success nunca é escrita neste caminho).
    expect(deps.logLoginAttempt).toHaveBeenCalledOnce();
    expect(deps.logLoginAttempt).toHaveBeenCalledWith(
      'a@b.com',
      'u1',
      false,
      expect.stringContaining('ip_not_whitelisted'),
    );
    expect(deps.setIpBlocked).toHaveBeenCalledWith(true);
    expect(deps.setBlockedIP).toHaveBeenCalledWith('9.9.9.9');
    expect(deps.toast).toHaveBeenCalledWith(
      expect.objectContaining({ variant: 'destructive', title: 'Acesso Bloqueado' }),
    );
  });

  it('IP bloqueado SEM restrições → passa (whitelist desligada)', async () => {
    const deps = makeDeps({
      validateIPForAuthenticatedUser: vi.fn(() =>
        Promise.resolve({
          isAllowed: false,
          hasRestrictions: false,
          currentIP: '1.2.3.4',
          reason: null,
          error: null,
        }),
      ),
    });
    const { ensureIPAllowed } = createPostLoginGuards(deps);
    expect(await ensureIPAllowed('u1', 'a@b.com')).toBe(true);
    expect(deps.signOut).not.toHaveBeenCalled();
  });

  it('sem reason no bloqueio → fallback access_blocked na linha auditada', async () => {
    const deps = makeDeps({
      validateIPForAuthenticatedUser: vi.fn(() =>
        Promise.resolve({
          isAllowed: false,
          hasRestrictions: true,
          currentIP: '9.9.9.9',
          reason: null,
          error: null,
        }),
      ),
    });
    const { ensureIPAllowed } = createPostLoginGuards(deps);
    await ensureIPAllowed('u1', 'a@b.com');
    expect(deps.logLoginAttempt).toHaveBeenCalledWith(
      'a@b.com',
      'u1',
      false,
      expect.stringContaining('access_blocked'),
    );
  });
});

describe('validateAndRedirect', () => {
  it('ipChecked=true → não re-checa IP, não escreve success, navega após 600ms', async () => {
    const deps = makeDeps();
    const { validateAndRedirect } = createPostLoginGuards(deps);
    const promise = validateAndRedirect('u1', 'a@b.com', true);
    await vi.advanceTimersByTimeAsync(600);
    expect(await promise).toBe(true);
    expect(deps.validateIPForAuthenticatedUser).not.toHaveBeenCalled();
    expect(deps.logLoginAttempt).not.toHaveBeenCalled();
    expect(deps.setLoginStatus).toHaveBeenCalledWith('success');
    expect(deps.navigate).toHaveBeenCalledWith('/home', { replace: true });
  });

  it('ipChecked=false → roda ensureIPAllowed primeiro', async () => {
    const deps = makeDeps();
    const { validateAndRedirect } = createPostLoginGuards(deps);
    const promise = validateAndRedirect('u1', 'a@b.com', false);
    await vi.advanceTimersByTimeAsync(600);
    expect(await promise).toBe(true);
    expect(deps.validateIPForAuthenticatedUser).toHaveBeenCalledWith('u1');
  });

  it('IP bloqueado → false e NÃO navega', async () => {
    const deps = makeDeps({
      validateIPForAuthenticatedUser: vi.fn(() =>
        Promise.resolve({
          isAllowed: false,
          hasRestrictions: true,
          currentIP: '9.9.9.9',
          reason: 'ip_not_whitelisted',
          error: 'bloqueado',
        }),
      ),
    });
    const { validateAndRedirect } = createPostLoginGuards(deps);
    expect(await validateAndRedirect('u1', 'a@b.com', false)).toBe(false);
    vi.advanceTimersByTime(5000);
    expect(deps.navigate).not.toHaveBeenCalled();
  });

  it('exceção no gate → fail-open com navegação', async () => {
    const deps = makeDeps({
      validateIPForAuthenticatedUser: vi.fn(() => Promise.reject(new Error('down'))),
    });
    const { validateAndRedirect } = createPostLoginGuards(deps);
    const promise = validateAndRedirect('u1', 'a@b.com', false);
    await vi.advanceTimersByTimeAsync(600);
    expect(await promise).toBe(true);
    expect(deps.navigate).toHaveBeenCalledWith('/home', { replace: true });
  });
});
