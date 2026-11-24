/**
 * Prova da etapa 086 (ACH-035): comentar/resolver no kit invalida a lista de comentarios.
 *
 * Causa raiz: `kit_comments` NAO esta na publicacao `supabase_realtime`, entao a assinatura
 * realtime conecta mas nunca entrega evento. A invalidacao no sucesso das duas mutations e o
 * que faz o comentario aparecer sem recarregar.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement, type ReactNode } from 'react';

const inserted: { kit_id?: string; body?: string }[] = [];

vi.mock('@/integrations/supabase/client', () => {
  const builder = () => {
    const b: Record<string, unknown> = {};
    b.select = () => b;
    b.eq = () => b;
    b.order = () => b;
    b.update = () => b;
    b.insert = (row: { kit_id?: string; body?: string }) => {
      inserted.push(row);
      return Promise.resolve({ error: null });
    };
    b.then = (res: (v: unknown) => void) => Promise.resolve({ data: [], error: null }).then(res);
    return b;
  };
  return {
    supabase: {
      from: () => builder(),
      channel: () => {
        const c: Record<string, unknown> = {};
        c.on = () => c;
        c.subscribe = () => c;
        return c;
      },
      removeChannel: () => Promise.resolve(),
    },
  };
});
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'u1' } }) }));
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

import { useKitComments } from '@/hooks/kit-builder/useKitCollaboration';

const KEY = ['kit-comments', 'kit-1'];

function wrapper(client: QueryClient) {
  return ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client }, children);
}

describe('useKitComments - etapa 086', () => {
  let client: QueryClient;

  beforeEach(() => {
    inserted.length = 0;
    client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  });

  it('invalida a lista de comentarios depois de comentar', async () => {
    const invalidateSpy = vi.spyOn(client, 'invalidateQueries');
    const { result } = renderHook(() => useKitComments('kit-1'), {
      wrapper: wrapper(client),
    });

    await act(async () => {
      await result.current.postComment('primeiro comentario');
    });

    expect(inserted).toHaveLength(1);
    await waitFor(() => expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: KEY }));
  });

  it('invalida a lista de comentarios depois de resolver', async () => {
    const invalidateSpy = vi.spyOn(client, 'invalidateQueries');
    const { result } = renderHook(() => useKitComments('kit-1'), {
      wrapper: wrapper(client),
    });

    await act(async () => {
      await result.current.resolveComment('c-1');
    });

    await waitFor(() => expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: KEY }));
  });
});
