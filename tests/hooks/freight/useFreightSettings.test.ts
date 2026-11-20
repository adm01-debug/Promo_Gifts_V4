/**
 * Hooks dos parâmetros de frete. O serviço é mockado (não o Supabase): aqui o
 * que se trava é a chave de cache, a tradução para o motor, de onde vem o id do
 * usuário gravado em `updated_by` e o texto que chega ao toast.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, waitFor } from '@testing-library/react';

import type * as FreightSettingsServiceModule from '@/services/freightSettingsService';

interface AuthState {
  user: { id: string } | null;
}

const h = vi.hoisted(() => {
  const auth: AuthState = { user: { id: 'user-1' } };
  return {
    service: { get: vi.fn(), update: vi.fn() },
    toast: { success: vi.fn(), error: vi.fn() },
    auth,
  };
});

vi.mock('@/integrations/supabase/client', () => ({ supabase: {} }));
vi.mock('sonner', () => ({ toast: h.toast }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => h.auth }));
vi.mock('@/services/freightSettingsService', async (importOriginal) => ({
  ...(await importOriginal<typeof FreightSettingsServiceModule>()),
  freightSettingsService: h.service,
}));

import {
  FREIGHT_QUERY_KEYS,
  useFreightSettings,
  useUpdateFreightSettings,
} from '@/hooks/freight';
import {
  FreightSettingsError,
  type FreightSettingsPatch,
  type FreightSettingsRow,
} from '@/services/freightSettingsService';
import { createTestQueryClient, renderHookWithProviders } from '../_helpers/render-hook-providers';

/** A linha como nasce na migration, com os padrões confirmados pelo dono. */
const LINHA: FreightSettingsRow = {
  id: true,
  origin_cep: '03377-000',
  cubic_divisor_correios: 6000,
  cubic_divisor_rodoviario: 3333,
  default_fill_factor: 0.9,
  internal_buffer_days: 0,
  multi_personalization_rule: 'max',
  updated_at: '2026-11-19T21:31:00Z',
  updated_by: null,
};

const PATCH: FreightSettingsPatch = { cubic_divisor_correios: 5000 };

beforeEach(() => {
  vi.clearAllMocks();
  h.auth.user = { id: 'user-1' };
  h.service.get.mockResolvedValue(LINHA);
  h.service.update.mockResolvedValue(undefined);
});

describe('useFreightSettings', () => {
  it('devolve a linha do banco e os três parâmetros do motor', async () => {
    const { result } = renderHookWithProviders(() => useFreightSettings());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(h.service.get).toHaveBeenCalledTimes(1);
    expect(result.current.row).toEqual(LINHA);
    expect(result.current.settings).toEqual({
      cubicDivisorCorreios: 6000,
      cubicDivisorRodoviario: 3333,
      defaultFillFactor: 0.9,
    });
    expect(result.current.isError).toBe(false);
  });

  it('sem linha visível: row e settings nulos, sem padrão inventado', async () => {
    h.service.get.mockResolvedValue(null);
    const { result } = renderHookWithProviders(() => useFreightSettings());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.row).toBeNull();
    expect(result.current.settings).toBeNull();
  });

  it("usa a chave ['freight-settings'] e guarda o resultado (staleTime do hook)", async () => {
    const { result, queryClient } = renderHookWithProviders(() => useFreightSettings());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(queryClient.getQueryData(['freight-settings'])).toEqual(LINHA);
    const query = queryClient.getQueryCache().find({ queryKey: FREIGHT_QUERY_KEYS.settings });
    // O cliente de teste tem staleTime 0: só o do hook explica o dado ainda fresco.
    expect(query?.isStale()).toBe(false);
  });

  it('erro do serviço: nulos e a mensagem amigável disponível', async () => {
    h.service.get.mockRejectedValue(
      new FreightSettingsError('unknown', 'Não foi possível carregar os parâmetros de frete.'),
    );
    const { result } = renderHookWithProviders(() => useFreightSettings());
    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.row).toBeNull();
    expect(result.current.settings).toBeNull();
    expect(result.current.error?.message).toBe('Não foi possível carregar os parâmetros de frete.');
  });
});

describe('useUpdateFreightSettings', () => {
  it('salva com o id do usuário de useAuth, avisa e invalida a leitura', async () => {
    const queryClient = createTestQueryClient();
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHookWithProviders(() => useUpdateFreightSettings(), { queryClient });

    await act(async () => {
      await result.current.mutateAsync(PATCH);
    });

    expect(h.service.update).toHaveBeenCalledTimes(1);
    expect(h.service.update).toHaveBeenCalledWith(PATCH, 'user-1');
    expect(h.toast.success).toHaveBeenCalledWith('Parâmetros de frete salvos');
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['freight-settings'] });
    expect(h.toast.error).not.toHaveBeenCalled();
  });

  it('depois de salvar, a leitura montada na tela é buscada de novo', async () => {
    const { result } = renderHookWithProviders(() => ({
      leitura: useFreightSettings(),
      escrita: useUpdateFreightSettings(),
    }));
    await waitFor(() => expect(result.current.leitura.isLoading).toBe(false));
    expect(h.service.get).toHaveBeenCalledTimes(1);

    await act(async () => {
      await result.current.escrita.mutateAsync(PATCH);
    });

    await waitFor(() => expect(h.service.get).toHaveBeenCalledTimes(2));
  });

  it('sem usuário logado: não chama o serviço e avisa que a sessão expirou', async () => {
    h.auth.user = null;
    const { result } = renderHookWithProviders(() => useUpdateFreightSettings());

    let rejeicao: unknown;
    await act(async () => {
      rejeicao = await result.current.mutateAsync(PATCH).catch((err: unknown) => err);
    });

    expect(h.service.update).not.toHaveBeenCalled();
    expect(rejeicao).toBeInstanceOf(FreightSettingsError);
    expect(h.toast.error).toHaveBeenCalledWith(
      'Sessão expirada. Entre novamente para salvar os parâmetros de frete.',
    );
    expect(h.toast.success).not.toHaveBeenCalled();
  });

  it('a mensagem do serviço vai no TÍTULO do toast, sem description', async () => {
    const mensagem =
      'Sem permissão para alterar os parâmetros de frete. Apenas administradores podem salvar.';
    const erro = new FreightSettingsError('permission', mensagem);
    h.service.update.mockRejectedValue(erro);
    const queryClient = createTestQueryClient();
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHookWithProviders(() => useUpdateFreightSettings(), { queryClient });

    let rejeicao: unknown;
    await act(async () => {
      rejeicao = await result.current.mutateAsync(PATCH).catch((err: unknown) => err);
    });

    expect(rejeicao).toBe(erro);
    expect(h.toast.error).toHaveBeenCalledTimes(1);
    expect(h.toast.error).toHaveBeenCalledWith(mensagem);
    expect(invalidate).not.toHaveBeenCalled();
  });

  it('erro que não é do serviço mostra o texto padrão, nunca o técnico', async () => {
    h.service.update.mockRejectedValue(new Error('TypeError: Failed to fetch db.internal'));
    const { result } = renderHookWithProviders(() => useUpdateFreightSettings());

    await act(async () => {
      await result.current.mutateAsync(PATCH).catch(() => undefined);
    });

    expect(h.toast.error).toHaveBeenCalledTimes(1);
    expect(h.toast.error).toHaveBeenCalledWith('Falha ao salvar parâmetros de frete');
  });
});
