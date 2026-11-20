/**
 * Hooks das caixas de transporte. O serviço é mockado (não o Supabase): aqui o
 * que se trava é qual listagem cada hook chama, a chave de cache do plano, a
 * tradução para o motor, a invalidação e o texto que chega ao toast.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, waitFor } from '@testing-library/react';

import type * as ShippingBoxServiceModule from '@/services/shippingBoxService';

const h = vi.hoisted(() => ({
  service: {
    listActive: vi.fn(),
    listAll: vi.fn(),
    listDeleted: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    softDelete: vi.fn(),
    restore: vi.fn(),
  },
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('@/integrations/supabase/client', () => ({ supabase: {} }));
vi.mock('sonner', () => ({ toast: h.toast }));
vi.mock('@/services/shippingBoxService', async (importOriginal) => ({
  ...(await importOriginal<typeof ShippingBoxServiceModule>()),
  shippingBoxService: h.service,
}));

import {
  FREIGHT_QUERY_KEYS,
  FREIGHT_STALE_TIME_MS,
  useDeletedShippingBoxes,
  useShippingBoxes,
  useShippingBoxMutations,
} from '@/hooks/freight';
import {
  ShippingBoxError,
  type ShippingBoxRow,
  type ShippingBoxWrite,
} from '@/services/shippingBoxService';
import { createTestQueryClient, renderHookWithProviders } from '../_helpers/render-hook-providers';

/**
 * Linha do banco. Internas = externa − 2 × 3 mm de parede (0,6 cm por eixo).
 */
function linha(overrides: Partial<ShippingBoxRow>): ShippingBoxRow {
  return {
    id: 'box-p',
    code: 'P',
    name: 'Caixa P',
    outer_height_cm: 27,
    outer_width_cm: 33,
    outer_length_cm: 33,
    wall_thickness_mm: 3,
    // 27 − 0,6 = 26,4 ; 33 − 0,6 = 32,4
    inner_height_cm: 26.4,
    inner_width_cm: 32.4,
    inner_length_cm: 32.4,
    empty_weight_g: 0,
    max_weight_g: 10000,
    fill_factor: 0.9,
    is_active: true,
    sort_order: 1,
    created_at: '2026-11-19T21:30:00Z',
    updated_at: '2026-11-19T21:30:00Z',
    deleted_at: null,
    ...overrides,
  };
}

const LINHA_P = linha({});
const LINHA_M_INATIVA = linha({
  id: 'box-m',
  code: 'M',
  name: 'Caixa M',
  // Externa 33 × 33 × 47: 33 − 0,6 = 32,4 ; 47 − 0,6 = 46,4
  outer_height_cm: 33,
  outer_length_cm: 47,
  inner_height_cm: 32.4,
  inner_length_cm: 46.4,
  max_weight_g: 20000,
  is_active: false,
  sort_order: 2,
});
const LINHA_SEM_INTERNA = linha({ id: 'box-x', code: 'X', inner_height_cm: null, sort_order: 3 });

const CAIXA_P_NO_MOTOR = {
  id: 'box-p',
  code: 'P',
  name: 'Caixa P',
  inner: { heightCm: 26.4, widthCm: 32.4, lengthCm: 32.4 },
  outer: { heightCm: 27, widthCm: 33, lengthCm: 33 },
  emptyWeightG: 0,
  maxWeightG: 10000,
  fillFactor: 0.9,
};

const NOVA_CAIXA: ShippingBoxWrite = {
  code: 'G',
  name: 'Caixa G',
  outer_height_cm: 36,
  outer_width_cm: 36,
  outer_length_cm: 54,
  max_weight_g: 25000,
};

beforeEach(() => {
  vi.clearAllMocks();
  h.service.listActive.mockResolvedValue([LINHA_P]);
  h.service.listAll.mockResolvedValue([LINHA_P, LINHA_M_INATIVA, LINHA_SEM_INTERNA]);
  h.service.listDeleted.mockResolvedValue([]);
  h.service.create.mockResolvedValue('box-g');
  h.service.update.mockResolvedValue(undefined);
  h.service.softDelete.mockResolvedValue(undefined);
  h.service.restore.mockResolvedValue(undefined);
});

describe('useShippingBoxes', () => {
  it('por padrão lê só as ativas e devolve linhas e caixas do motor', async () => {
    const { result } = renderHookWithProviders(() => useShippingBoxes());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(h.service.listActive).toHaveBeenCalledTimes(1);
    expect(h.service.listAll).not.toHaveBeenCalled();
    expect(result.current.rows).toEqual([LINHA_P]);
    expect(result.current.boxes).toEqual([CAIXA_P_NO_MOTOR]);
    expect(result.current.isError).toBe(false);
  });

  it('includeInactive traz as inativas nas linhas, mas o motor só recebe ativa e mapeável', async () => {
    const { result } = renderHookWithProviders(() => useShippingBoxes({ includeInactive: true }));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(h.service.listAll).toHaveBeenCalledTimes(1);
    expect(h.service.listActive).not.toHaveBeenCalled();
    expect(result.current.rows.map((row) => row.code)).toEqual(['P', 'M', 'X']);
    // M está inativa e X não tem altura interna: sobra só a P.
    expect(result.current.boxes).toEqual([CAIXA_P_NO_MOTOR]);
  });

  it('caixa excluída que chegue na lista não vai para o motor', async () => {
    h.service.listAll.mockResolvedValue([linha({ deleted_at: '2026-11-19T22:00:00Z' })]);
    const { result } = renderHookWithProviders(() => useShippingBoxes({ includeInactive: true }));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.rows).toHaveLength(1);
    expect(result.current.boxes).toEqual([]);
  });

  it.each([
    [false, [LINHA_P]],
    [true, [LINHA_P, LINHA_M_INATIVA, LINHA_SEM_INTERNA]],
  ])("usa a chave ['shipping-boxes', { includeInactive: %s }]", async (includeInactive, esperado) => {
    const { result, queryClient } = renderHookWithProviders(() =>
      useShippingBoxes({ includeInactive }),
    );
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(queryClient.getQueryData(['shipping-boxes', { includeInactive }])).toEqual(esperado);
  });

  it('guarda o resultado por 10 minutos', async () => {
    // 10 min × 60 s × 1000 ms = 600.000 ms
    expect(FREIGHT_STALE_TIME_MS).toBe(600000);

    const { result, queryClient } = renderHookWithProviders(() => useShippingBoxes());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const query = queryClient
      .getQueryCache()
      .find({ queryKey: FREIGHT_QUERY_KEYS.shippingBoxes.list(false) });
    // O cliente de teste tem staleTime 0: só o do hook explica o dado ainda fresco.
    expect(query?.isStale()).toBe(false);
  });

  it('erro do serviço: listas vazias e a mensagem amigável disponível', async () => {
    h.service.listActive.mockRejectedValue(
      new ShippingBoxError('unknown', 'Não foi possível carregar as caixas de transporte.'),
    );
    const { result } = renderHookWithProviders(() => useShippingBoxes());
    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.rows).toEqual([]);
    expect(result.current.boxes).toEqual([]);
    expect(result.current.error?.message).toBe('Não foi possível carregar as caixas de transporte.');
  });
});

describe('useDeletedShippingBoxes', () => {
  it('lê só as excluídas, na chave própria da lixeira', async () => {
    const excluida = linha({ deleted_at: '2026-11-19T22:00:00Z' });
    h.service.listDeleted.mockResolvedValue([excluida]);
    const { result, queryClient } = renderHookWithProviders(() => useDeletedShippingBoxes());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(h.service.listDeleted).toHaveBeenCalledTimes(1);
    expect(h.service.listActive).not.toHaveBeenCalled();
    expect(h.service.listAll).not.toHaveBeenCalled();
    expect(result.current.rows).toEqual([excluida]);
    expect(queryClient.getQueryData(['shipping-boxes', 'deleted'])).toEqual([excluida]);
  });

  it('enabled: false não consulta', () => {
    const { result } = renderHookWithProviders(() => useDeletedShippingBoxes({ enabled: false }));

    expect(h.service.listDeleted).not.toHaveBeenCalled();
    expect(result.current.rows).toEqual([]);
  });
});

describe('useShippingBoxMutations — sucesso', () => {
  it('create: chama o serviço, devolve o id, avisa e invalida todas as listas de caixas', async () => {
    const queryClient = createTestQueryClient();
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHookWithProviders(() => useShippingBoxMutations(), { queryClient });

    let id: string | undefined;
    await act(async () => {
      id = await result.current.create.mutateAsync(NOVA_CAIXA);
    });

    expect(id).toBe('box-g');
    expect(h.service.create).toHaveBeenCalledWith(NOVA_CAIXA);
    expect(h.toast.success).toHaveBeenCalledWith('Caixa criada');
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['shipping-boxes'] });
    expect(h.toast.error).not.toHaveBeenCalled();
  });

  it.each([
    ['um campo comum', { name: 'Caixa P nova' }, 'Caixa atualizada'],
    ['só is_active = false', { is_active: false }, 'Caixa desativada'],
    ['só is_active = true', { is_active: true }, 'Caixa ativada'],
    ['is_active junto com outro campo', { is_active: false, name: 'Caixa P' }, 'Caixa atualizada'],
  ])('update com %s: avisa "%s" e invalida', async (_caso, patch, aviso) => {
    const queryClient = createTestQueryClient();
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHookWithProviders(() => useShippingBoxMutations(), { queryClient });

    await act(async () => {
      await result.current.update.mutateAsync({ id: 'box-p', patch });
    });

    expect(h.service.update).toHaveBeenCalledWith('box-p', patch);
    expect(h.toast.success).toHaveBeenCalledWith(aviso);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['shipping-boxes'] });
  });

  it.each([
    ['softDelete', 'Caixa excluída'],
    ['restore', 'Caixa restaurada'],
  ] as const)('%s: chama o serviço com o id, avisa "%s" e invalida', async (operacao, aviso) => {
    const queryClient = createTestQueryClient();
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHookWithProviders(() => useShippingBoxMutations(), { queryClient });

    await act(async () => {
      await result.current[operacao].mutateAsync('box-p');
    });

    expect(h.service[operacao]).toHaveBeenCalledWith('box-p');
    expect(h.toast.success).toHaveBeenCalledWith(aviso);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['shipping-boxes'] });
  });

  it('depois de salvar, a lista montada na tela é buscada de novo', async () => {
    const queryClient = createTestQueryClient();
    const { result } = renderHookWithProviders(
      () => ({ lista: useShippingBoxes(), escrita: useShippingBoxMutations() }),
      { queryClient },
    );
    await waitFor(() => expect(result.current.lista.isLoading).toBe(false));
    expect(h.service.listActive).toHaveBeenCalledTimes(1);

    await act(async () => {
      await result.current.escrita.softDelete.mutateAsync('box-p');
    });

    await waitFor(() => expect(h.service.listActive).toHaveBeenCalledTimes(2));
  });
});

describe('useShippingBoxMutations — erro', () => {
  const DUPLICADO = 'Já existe uma caixa com o código P. Caixas inativas também contam.';

  const OPERACOES = [
    ['create', 'Falha ao criar caixa'],
    ['update', 'Falha ao salvar caixa'],
    ['softDelete', 'Falha ao excluir caixa'],
    ['restore', 'Falha ao restaurar caixa'],
  ] as const;

  type Hook = ReturnType<typeof useShippingBoxMutations>;

  function disparar(hook: Hook, operacao: (typeof OPERACOES)[number][0]): Promise<unknown> {
    if (operacao === 'create') return hook.create.mutateAsync(NOVA_CAIXA);
    if (operacao === 'update') return hook.update.mutateAsync({ id: 'box-p', patch: { code: 'P' } });
    return hook[operacao].mutateAsync('box-p');
  }

  it.each(OPERACOES)(
    '%s: a mensagem do serviço vai no TÍTULO do toast, sem description',
    async (operacao) => {
      const erro = new ShippingBoxError('duplicate_code', DUPLICADO);
      h.service[operacao].mockRejectedValue(erro);
      const { result } = renderHookWithProviders(() => useShippingBoxMutations());

      let rejeicao: unknown;
      await act(async () => {
        rejeicao = await disparar(result.current, operacao).catch((err: unknown) => err);
      });

      expect(rejeicao).toBe(erro);
      expect(h.toast.error).toHaveBeenCalledTimes(1);
      expect(h.toast.error).toHaveBeenCalledWith(DUPLICADO);
      expect(h.toast.success).not.toHaveBeenCalled();
    },
  );

  it.each(OPERACOES)(
    '%s: erro que não é do serviço mostra "%s", nunca o texto técnico',
    async (operacao, fallback) => {
      h.service[operacao].mockRejectedValue(new Error('TypeError: Failed to fetch db.internal'));
      const { result } = renderHookWithProviders(() => useShippingBoxMutations());

      await act(async () => {
        await disparar(result.current, operacao).catch(() => undefined);
      });

      expect(h.toast.error).toHaveBeenCalledTimes(1);
      expect(h.toast.error).toHaveBeenCalledWith(fallback);
    },
  );

  it('erro não invalida as listas', async () => {
    h.service.create.mockRejectedValue(new ShippingBoxError('duplicate_code', DUPLICADO));
    const queryClient = createTestQueryClient();
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHookWithProviders(() => useShippingBoxMutations(), { queryClient });

    await act(async () => {
      await result.current.create.mutateAsync(NOVA_CAIXA).catch(() => undefined);
    });

    expect(invalidate).not.toHaveBeenCalled();
  });
});
