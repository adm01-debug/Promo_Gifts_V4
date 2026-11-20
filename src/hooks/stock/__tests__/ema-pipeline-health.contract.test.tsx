import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

const { invokeMock, rpcMock } = vi.hoisted(() => ({
  invokeMock: vi.fn(),
  rpcMock: vi.fn(),
}));

const { isDevMock } = vi.hoisted(() => ({ isDevMock: vi.fn() }));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ isDev: isDevMock() }),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: (name: string) => rpcMock(name),
    functions: {
      invoke: (name: string, options: unknown) => invokeMock(name, options),
    },
  },
}));

import { useEmaPipelineHealth } from '../useEmaPipelineHealth';
import { useEmaRiskSummary } from '../useEmaRiskSummary';

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  });
}

function withQueryClient(queryClient: QueryClient) {
  return function QueryClientWrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

beforeEach(() => {
  invokeMock.mockReset();
  rpcMock.mockReset();
  isDevMock.mockReset();
  isDevMock.mockReturnValue(true);
});

describe('EMA pipeline health contracts', () => {
  it('preserva o timestamp de freshness e a cadência declarada pelo hook técnico', async () => {
    const response = {
      version: 1,
      checked_at: '2026-08-26T12:01:00.000Z',
      freshness: {
        last_refreshed_at: '2026-08-26T12:00:00.000Z',
        status: 'OK',
        semantics: 'read_model_refresh',
      },
      components: [
        {
          id: 'EMA_READ_MODEL',
          status: 'OK',
          last_refreshed_at: '2026-08-26T12:00:00.000Z',
          next_scheduled_at: null,
          detail: 'refresh concluído',
          source: 'rupture_health_check',
        },
      ],
    };
    invokeMock.mockResolvedValue({ data: response, error: null });

    const queryClient = createQueryClient();
    const { result } = renderHook(() => useEmaPipelineHealth(), {
      wrapper: withQueryClient(queryClient),
    });

    await waitFor(() =>
      expect(result.current.data).toEqual([
        {
          componente: 'EMA_READ_MODEL',
          status: 'OK',
          ultima_execucao: '2026-08-26T12:00:00.000Z',
          proxima_execucao: null,
          detalhe: 'refresh concluído',
        },
      ]),
    );

    expect(invokeMock).toHaveBeenCalledWith('ema-pipeline-health', { method: 'GET' });
    const query = queryClient.getQueryCache().find({
      queryKey: ['ema-pipeline-health'],
      exact: true,
    });
    expect(query?.options.staleTime).toBe(30_000);
    expect(query?.options.refetchInterval).toBe(60_000);
  });

  it('distingue retorno vazio sem erro de falha da RPC ausente', async () => {
    invokeMock.mockResolvedValue({
      data: {
        version: 1,
        checked_at: '2026-08-26T12:01:00.000Z',
        freshness: { last_refreshed_at: null, status: 'UNKNOWN', semantics: 'read_model_refresh' },
        components: [],
      },
      error: null,
    });

    const emptyClient = createQueryClient();
    const empty = renderHook(() => useEmaPipelineHealth(), {
      wrapper: withQueryClient(emptyClient),
    });
    await waitFor(() => expect(empty.result.current.data).toEqual([]));
    expect(empty.result.current.error).toBeNull();
    empty.unmount();

    invokeMock.mockResolvedValue({ data: null, error: new Error('source failed') });
    const errorClient = createQueryClient();
    const failed = renderHook(() => useEmaPipelineHealth(), {
      wrapper: withQueryClient(errorClient),
    });
    await waitFor(() => expect(failed.result.current.error).toBeInstanceOf(Error));
    expect(failed.result.current.error!.message).toBe('source failed');
  });

  it('usuário dev: falha da edge de health rebaixa para WARN sem derrubar o sumário', async () => {
    rpcMock.mockResolvedValue({
      data: [
        {
          nivel_alerta: 'ALERTA',
          prioridade: 3,
          total_variantes: 7,
          total_gap_unidades: 1,
          total_valor_estoque: 10,
          com_anomalia_spike: 0,
          avg_cobertura: 2,
          refreshed_at: '2026-08-26T12:00:00.000Z',
        },
      ],
      error: null,
    });
    invokeMock.mockResolvedValue({ data: null, error: new Error('source failed') });

    const queryClient = createQueryClient();
    const { result } = renderHook(() => useEmaRiskSummary(), {
      wrapper: withQueryClient(queryClient),
    });

    await waitFor(() => expect(result.current.totalVariants).toBe(7));
    expect(result.current.error).toBeNull();
    expect(result.current.etlHealth).toEqual({
      freshness: '2026-08-26T12:00:00.000Z',
      status: 'WARN',
    });
    expect(rpcMock).toHaveBeenCalledWith('fn_rupture_quick_stats');
    expect(invokeMock).toHaveBeenCalledWith('ema-pipeline-health', { method: 'GET' });
  });

  it('usuário não-dev: não chama a edge dev-only e usa refreshed_at como frescor', async () => {
    isDevMock.mockReturnValue(false);
    rpcMock.mockResolvedValue({
      data: [
        {
          nivel_alerta: 'ALERTA',
          prioridade: 3,
          total_variantes: 7,
          total_gap_unidades: 1,
          total_valor_estoque: 10,
          com_anomalia_spike: 0,
          avg_cobertura: 2,
          refreshed_at: '2026-08-26T12:00:00.000Z',
        },
      ],
      error: null,
    });

    const queryClient = createQueryClient();
    const { result } = renderHook(() => useEmaRiskSummary(), {
      wrapper: withQueryClient(queryClient),
    });

    await waitFor(() => expect(result.current.totalVariants).toBe(7));
    expect(result.current.error).toBeNull();
    expect(result.current.etlHealth.freshness).toBe('2026-08-26T12:00:00.000Z');
    expect(result.current.etlHealth.status).toBe('WARN');
    expect(rpcMock).toHaveBeenCalledWith('fn_rupture_quick_stats');
    expect(invokeMock).not.toHaveBeenCalled();
  });
});
