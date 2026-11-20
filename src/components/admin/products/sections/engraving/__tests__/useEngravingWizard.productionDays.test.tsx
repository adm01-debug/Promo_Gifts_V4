/** Assistente de gravação: o prazo digitado vai (ou não) no INSERT de print_area_techniques. */
import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => {
  const state: {
    insert: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    updateSelectResult: { data: Array<{ id: string }> | null; error: null };
  } = {
    insert: vi.fn(),
    update: vi.fn(),
    updateSelectResult: { data: [{ id: 'row' }], error: null },
  };
  return state;
});

vi.mock('@/lib/db/postgrest', () => ({
  dbInvoke: (opts: { table: string }) =>
    Promise.resolve({
      records:
        opts.table === 'tabela_preco_gravacao_oficial'
          ? [{ id: 'tab-1', nome: 'Laser', codigo_curto: 'LASER' }]
          : [],
    }),
  dbInvokeDelete: vi.fn(),
}));

vi.mock('@/lib/supabase-untyped', () => ({
  untypedFrom: () => ({
    insert: (payload: unknown) => {
      h.insert(payload);
      return Promise.resolve({ error: null });
    },
    update: (payload: unknown) => ({
      eq: (_col: string, id: string) => ({
        select: (_col2: string) => {
          h.update(id, payload);
          return Promise.resolve(h.updateSelectResult);
        },
      }),
    }),
  }),
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { useEngravingWizard } from '../useEngravingWizard';

let client = new QueryClient();
function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  vi.clearAllMocks();
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  h.updateSelectResult = { data: [{ id: 'row' }], error: null };
});

async function percorrerAssistente(prazo: string) {
  const hook = renderHook(() => useEngravingWizard('p1', true), { wrapper });
  await waitFor(() => expect(hook.result.current.techniques).toHaveLength(1));
  act(() => hook.result.current.handleSelectComponent({ code: 'CORPO', name: 'Corpo' }));
  act(() => hook.result.current.handleSelectLocation({ code: 'FRENTE', name: 'Frente' }));
  act(() => hook.result.current.handleSelectTechnique(hook.result.current.techniques[0]));
  act(() => hook.result.current.setDetailForm((f) => ({ ...f, production_days: prazo })));
  act(() => hook.result.current.handleSaveArea());
  return hook;
}

describe('prazo de personalização ao adicionar uma área', () => {
  it.each([
    ['7', 7],
    ['', null],
    ['0', 0],
  ])('prazo digitado "%s" grava production_days = %s', async (digitado, esperado) => {
    await percorrerAssistente(digitado);
    await waitFor(() => expect(h.insert).toHaveBeenCalledOnce());
    expect(h.insert.mock.calls[0]?.[0]).toMatchObject({
      product_id: 'p1',
      tabela_preco_id: 'tab-1',
      production_days: esperado,
    });
  });

  it('prazo inválido não grava nada', async () => {
    await percorrerAssistente('abc');
    expect(h.insert).not.toHaveBeenCalled();
  });

  it('editar o prazo de uma área salva envia só production_days', async () => {
    const { result } = await percorrerAssistente('');
    act(() =>
      result.current.handleChangeProductionDays(
        // área já salva (id real): só os campos que o handler lê
        { id: 'pat-9' },
        null,
      ),
    );
    await waitFor(() => expect(h.update).toHaveBeenCalledOnce());
    expect(h.update).toHaveBeenCalledWith('pat-9', { production_days: null });
  });

  it('RLS nega o update em silêncio (0 linhas, sem erro do Postgres): mostra erro, não sucesso', async () => {
    const { toast } = await import('sonner');
    h.updateSelectResult = { data: [], error: null };
    const { result } = await percorrerAssistente('');
    act(() => result.current.handleChangeProductionDays({ id: 'pat-9' }, 9));
    await waitFor(() => expect(h.update).toHaveBeenCalledOnce());
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        'Sem permissão para alterar esta área de gravação. Apenas administradores podem salvar.',
      ),
    );
    expect(toast.success).not.toHaveBeenCalledWith('Área atualizada');
  });
});
