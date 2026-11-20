/** Hooks dos feriados: leitura por ano, aviso de sucesso/erro e invalidação do cache. */
import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
  svc: {
    listByYear: vi.fn(),
    create: vi.fn(),
    updateDescription: vi.fn(),
    remove: vi.fn(),
  },
}));

vi.mock('sonner', () => ({ toast: { success: h.toastSuccess, error: h.toastError } }));

vi.mock('@/services/businessCalendarService', async (importOriginal) => ({
  ...(await importOriginal<typeof BusinessCalendarModule>()),
  businessCalendarService: h.svc,
}));

import type * as BusinessCalendarModule from '@/services/businessCalendarService';
import { BusinessCalendarError } from '@/services/businessCalendarService';
import { useBusinessCalendarMutations, useBusinessCalendarYear } from '../useBusinessCalendar';

let client = new QueryClient();
function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  vi.clearAllMocks();
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
});

describe('useBusinessCalendarYear', () => {
  it('lê o ano pedido', async () => {
    h.svc.listByYear.mockResolvedValue([{ day: '2026-11-20', description: 'Consciência Negra' }]);
    const { result } = renderHook(() => useBusinessCalendarYear(2026), { wrapper });
    await waitFor(() => expect(result.current.rows).toHaveLength(1));
    expect(h.svc.listByYear).toHaveBeenCalledWith(2026);
  });

  it('erro de leitura aparece em isError', async () => {
    h.svc.listByYear.mockRejectedValue(new Error('falhou'));
    const { result } = renderHook(() => useBusinessCalendarYear(2026), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.rows).toEqual([]);
  });
});

describe('useBusinessCalendarMutations', () => {
  it('adicionar com sucesso avisa e invalida a lista e o cálculo do prazo', async () => {
    h.svc.create.mockResolvedValue(undefined);
    const spy = vi.spyOn(client, 'invalidateQueries');
    const { result } = renderHook(() => useBusinessCalendarMutations(), { wrapper });
    await act(async () => {
      await result.current.create.mutateAsync({ day: '2026-12-24', description: 'Véspera' });
    });
    expect(h.toastSuccess).toHaveBeenCalledWith('Feriado adicionado');
    expect(spy).toHaveBeenCalledWith({ queryKey: ['business-calendar'] });
  });

  it('erro do serviço vai no título do aviso (a mensagem é PT-BR e segura)', async () => {
    h.svc.remove.mockRejectedValue(
      new BusinessCalendarError('permission', 'Sem permissão para alterar os feriados.'),
    );
    const { result } = renderHook(() => useBusinessCalendarMutations(), { wrapper });
    await act(async () => {
      await result.current.remove.mutateAsync('2026-12-24').catch(() => undefined);
    });
    expect(h.toastError).toHaveBeenCalledWith('Sem permissão para alterar os feriados.');
  });

  it('erro desconhecido usa o texto padrão da ação', async () => {
    h.svc.updateDescription.mockRejectedValue(new Error('x'));
    const { result } = renderHook(() => useBusinessCalendarMutations(), { wrapper });
    await act(async () => {
      await result.current.updateDescription
        .mutateAsync({ day: '2026-12-24', description: 'A' })
        .catch(() => undefined);
    });
    expect(h.toastError).toHaveBeenCalledWith('Falha ao salvar feriado');
  });
});
