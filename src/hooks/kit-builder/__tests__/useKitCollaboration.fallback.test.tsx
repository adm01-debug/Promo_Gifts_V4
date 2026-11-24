/**
 * Prova da etapa 088 (ACH-035): com a tabela fora da publicacao `supabase_realtime`, o canal
 * conecta (SUBSCRIBED) e nunca entrega evento. O refetch de baixa frequencia e o que faz o
 * comentario de outro usuario aparecer.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement, type ReactNode } from 'react';

vi.mock('@/integrations/supabase/client', () => {
  const builder = () => {
    const b: Record<string, unknown> = {};
    b.select = () => b;
    b.eq = () => b;
    b.order = () => b;
    b.update = () => b;
    b.insert = () => Promise.resolve({ error: null });
    b.then = (res: (v: unknown) => void) => Promise.resolve({ data: [], error: null }).then(res);
    return b;
  };
  return {
    supabase: {
      from: () => builder(),
      channel: () => {
        const c: Record<string, unknown> = {};
        c.on = () => c;
        // Sempre conecta - e exatamente o cenario que esconde o bug.
        c.subscribe = (cb: (s: string) => void) => {
          cb('SUBSCRIBED');
          return c;
        };
        return c;
      },
      removeChannel: () => Promise.resolve(),
    },
  };
});
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'u1' } }) }));
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

import {
  useKitComments,
  KIT_COMMENTS_FALLBACK_REFETCH_MS,
} from '@/hooks/kit-builder/useKitCollaboration';

function wrapper(client: QueryClient) {
  return ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client }, children);
}

describe('useKitComments - etapa 088: refetch de seguranca', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('invalida os comentarios no intervalo de fallback, mesmo com canal SUBSCRIBED', () => {
    vi.useFakeTimers();
    const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
    const invalidateSpy = vi.spyOn(client, 'invalidateQueries');

    renderHook(() => useKitComments('kit-1'), { wrapper: wrapper(client) });
    expect(invalidateSpy).not.toHaveBeenCalled();

    vi.advanceTimersByTime(KIT_COMMENTS_FALLBACK_REFETCH_MS);
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ['kit-comments', 'kit-1'],
      refetchType: 'active',
    });
  });

  it('nao agenda refetch quando nao ha kit', () => {
    vi.useFakeTimers();
    const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
    const invalidateSpy = vi.spyOn(client, 'invalidateQueries');

    renderHook(() => useKitComments(undefined), { wrapper: wrapper(client) });
    vi.advanceTimersByTime(KIT_COMMENTS_FALLBACK_REFETCH_MS * 3);
    expect(invalidateSpy).not.toHaveBeenCalled();
  });
});
