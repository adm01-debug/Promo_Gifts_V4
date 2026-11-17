import { createElement, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const auth = vi.hoisted(() => ({ userId: 'user-A' }));
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: auth.userId } }),
}));

const rpc = vi.hoisted(() => ({
  // Cada chamada devolve uma promise que o teste resolve na ordem que quiser.
  pending: [] as Array<(value: { error: null }) => void>,
}));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: vi.fn(
      () =>
        new Promise<{ error: null }>((resolve) => {
          rpc.pending.push(resolve);
        }),
    ),
    from: () => ({
      select: () => ({
        eq: (_column: string, userId: string) => ({
          order: async () => ({
            data: [{ id: `kit-${userId}`, user_id: userId }],
            error: null,
          }),
        }),
      }),
    }),
  },
}));

const toastMock = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock('sonner', () => ({ toast: toastMock }));

import { useCustomKitPersistence } from '@/hooks/kit-builder/useCustomKitPersistence';

function mount() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);
  return { queryClient, ...renderHook(() => useCustomKitPersistence(), { wrapper }) };
}

describe('useCustomKitPersistence togglePinned — ordem das requisições', () => {
  beforeEach(() => {
    auth.userId = 'user-A';
    rpc.pending.length = 0;
    toastMock.success.mockClear();
    toastMock.error.mockClear();
  });

  it('resposta atrasada do pin anterior não anuncia um estado final desatualizado', async () => {
    const { result } = mount();
    await waitFor(() => expect(result.current.savedKits.length).toBeGreaterThan(0));

    // Fixar e, antes de a resposta chegar, desafixar. O estado final pedido é
    // "desafixado": é o único que a tela pode anunciar.
    const fixar = result.current.togglePinned('kit-1', true);
    const desafixar = result.current.togglePinned('kit-1', false);
    await waitFor(() => expect(rpc.pending.length).toBe(2));

    // A resposta da PRIMEIRA chamada chega por último (rede fora de ordem).
    rpc.pending[1]({ error: null });
    rpc.pending[0]({ error: null });
    await Promise.all([fixar, desafixar]);

    expect(toastMock.success).toHaveBeenCalledTimes(1);
    expect(toastMock.success).toHaveBeenCalledWith('Kit desafixado');
    expect(toastMock.error).not.toHaveBeenCalled();
  });

  it('troca de conta no meio do voo suprime a notificação da conta anterior', async () => {
    const { result, rerender } = mount();
    await waitFor(() => expect(result.current.savedKits.length).toBeGreaterThan(0));

    const emVoo = result.current.togglePinned('kit-1', true);
    await waitFor(() => expect(rpc.pending.length).toBe(1));

    auth.userId = 'user-B';
    rerender();

    rpc.pending[0]({ error: null });
    await emVoo;

    expect(toastMock.success).not.toHaveBeenCalled();
    expect(toastMock.error).not.toHaveBeenCalled();
  });
});
