/**
 * Regressão da race de identidade de deps (BUG real encontrado na
 * validação exaustiva): `refreshSession` e `checkDevice` são useCallback
 * com `[user]` no AuthContext — quando a sessão OAuth propaga, as
 * identidades mudam. Antes do fix, elas estavam nas deps do useEffect:
 * o cleanup marcava `cancelled`, `handledRef` impedia restart e a página
 * travava em "confirming" para sempre (navegação nunca acontecia).
 *
 * Depois do fix os callbacks são lidos via ref e o efeito roda uma vez.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import SSOCallbackPage from '../auth/SSOCallbackPage';
import type * as ReactRouterDom from 'react-router-dom';

const navigateMock = vi.fn();
let refreshSessionImpl: () => Promise<void>;
const refreshSessionMockA = vi.fn();
const refreshSessionMockB = vi.fn();

const exchangeCodeForSessionMock = vi.fn();
const getSessionMock = vi.fn();
const onAuthStateChangeMock = vi.fn();
const unsubscribeMock = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof ReactRouterDom>('react-router-dom');
  return { ...actual, useNavigate: () => navigateMock };
});

// A cada render, useAuth devolve a identidade ATUAL de refreshSession —
// simula o useCallback([user,...]) do AuthContext mudando quando o user chega.
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ refreshSession: refreshSessionImpl }),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      exchangeCodeForSession: (...args: unknown[]) => exchangeCodeForSessionMock(...args),
      getSession: () => getSessionMock(),
      onAuthStateChange: (...args: unknown[]) => onAuthStateChangeMock(...args),
    },
  },
}));

vi.mock('@/components/seo/PageSEO', () => ({ PageSEO: () => null }));

function fakeSession() {
  return {
    access_token: 'h.eyJzdWIiOiJ1MSJ9.s',
    refresh_token: 'r',
    token_type: 'bearer',
    expires_at: 0,
    expires_in: 3600,
    user: { id: 'u1', email: 'a@b.com', app_metadata: { provider: 'google' } },
  };
}

describe('SSOCallbackPage — race de identidade de deps', () => {
  beforeEach(() => {
    navigateMock.mockClear();
    refreshSessionMockA.mockReset().mockResolvedValue(undefined);
    refreshSessionMockB.mockReset().mockResolvedValue(undefined);
    refreshSessionImpl = refreshSessionMockA;
    exchangeCodeForSessionMock.mockReset();
    getSessionMock.mockReset();
    onAuthStateChangeMock.mockReset().mockImplementation(() => ({
      data: { subscription: { unsubscribe: unsubscribeMock } },
    }));
    unsubscribeMock.mockClear();
    sessionStorage.clear();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('re-render com refreshSession de nova identidade durante goHome NÃO trava a navegação', async () => {
    // refreshSession pendurado — goHome fica em voo esperando o await.
    let resolveRefresh: (() => void) | null = null;
    refreshSessionMockA.mockImplementation(
      () =>
        new Promise<void>((r) => {
          resolveRefresh = r;
        }),
    );
    exchangeCodeForSessionMock.mockResolvedValue({
      data: { session: fakeSession() },
      error: null,
    });

    const el = (
      <MemoryRouter initialEntries={['/auth/callback?code=abc123']}>
        <Routes>
          <Route path="/auth/callback" element={<SSOCallbackPage />} />
        </Routes>
      </MemoryRouter>
    );
    const { rerender } = render(el);

    await waitFor(() => expect(refreshSessionMockA).toHaveBeenCalled());

    // user propagou no AuthContext → refreshSession ganha nova identidade.
    // Com o fix, o efeito não re-executa: o run() em voo segue até navegar.
    refreshSessionImpl = refreshSessionMockB;
    rerender(el);

    resolveRefresh?.();
    await waitFor(() => expect(navigateMock).toHaveBeenCalledWith('/', { replace: true }));
  });
});
