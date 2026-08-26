import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

const { rpcMock } = vi.hoisted(() => ({
  rpcMock: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: (name: string) => rpcMock(name),
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
  rpcMock.mockReset();
});

describe('EMA pipeline health contracts', () => {
  it('preserva o timestamp de freshness e a cadência declarada pelo hook técnico', async () => {
    const healthRows = [
      {
        componente: 'EMA_READ_MODEL',
        status: 'OK',
        ultima_execucao: '2026-08-26T12:00:00.000Z',
        proxima_execucao: null,
        detalhe: 'refresh concluído',
      },
    ];
    rpcMock.mockResolvedValue({ data: healthRows, error: null });

    const queryClient = createQueryClient();
    const { result } = renderHook(() => useEmaPipelineHealth(), {
      wrapper: withQueryClient(queryClient),
    });

    await waitFor(() => expect(result.current.data).toEqual(healthRows));

    expect(rpcMock).toHaveBeenCalledWith('fn_ema_pipeline_health');
    const query = queryClient.getQueryCache().find({
      queryKey: ['ema-pipeline-health'],
      exact: true,
    });
    expect(query?.options.staleTime).toBe(30_000);
    expect(query?.options.refetchInterval).toBe(60_000);
  });

  it('distingue retorno vazio sem erro de falha da RPC ausente', async () => {
    rpcMock.mockResolvedValue({ data: null, error: null });

    const emptyClient = createQueryClient();
    const empty = renderHook(() => useEmaPipelineHealth(), {
      wrapper: withQueryClient(emptyClient),
    });
    await waitFor(() => expect(empty.result.current.data).toEqual([]));
    expect(empty.result.current.error).toBeNull();
    empty.unmount();

    rpcMock.mockResolvedValue({ data: null, error: new Error('function not found') });
    const errorClient = createQueryClient();
    const failed = renderHook(() => useEmaPipelineHealth(), {
      wrapper: withQueryClient(errorClient),
    });
    await waitFor(() => expect(failed.result.current.error).toBeInstanceOf(Error));
    expect(failed.result.current.error!.message).toBe('function not found');
  });

  it('caracteriza o fallback WARN atual quando somente health falha', async () => {
    rpcMock.mockImplementation((name: string) => {
      if (name === 'fn_ema_risk_summary') {
        return Promise.resolve({
          data: [{ nivel_alerta: 'ALERTA', prioridade: 3, total: 7 }],
          error: null,
        });
      }
      if (name === 'fn_ema_pipeline_health') {
        return Promise.resolve({
          data: null,
          error: new Error('function not found'),
        });
      }
      throw new Error(`RPC inesperada: ${name}`);
    });

    const queryClient = createQueryClient();
    const { result } = renderHook(() => useEmaRiskSummary(), {
      wrapper: withQueryClient(queryClient),
    });

    await waitFor(() => expect(result.current.totalVariants).toBe(7));
    expect(result.current.error).toBeNull();
    expect(result.current.etlHealth).toEqual({
      freshness: null,
      status: 'WARN',
    });
    expect(rpcMock).toHaveBeenCalledWith('fn_ema_risk_summary');
    expect(rpcMock).toHaveBeenCalledWith('fn_ema_pipeline_health');
  });
});
