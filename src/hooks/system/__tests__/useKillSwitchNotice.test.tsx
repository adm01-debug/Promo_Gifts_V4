/**
 * useKillSwitchNotice — contrato do hook genérico.
 *
 * O hook não conhece switch nenhum: recebe a lista de `switch_name` de quem
 * chama. Cobre a semântica medida em `public.system_kill_switches`
 * (enabled=false + legacy_message ⇒ aviso) e o fail-open.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { getKillSwitchState, type KillSwitchState } from '@/lib/external-db/kill-switch-client';
import { useKillSwitchNotice } from '@/hooks/system/useKillSwitchNotice';

vi.mock('@/lib/external-db/kill-switch-client', () => ({
  getKillSwitchState: vi.fn(),
}));

const getKillSwitchStateMock = vi.mocked(getKillSwitchState);

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

function state(partial: Partial<KillSwitchState>): KillSwitchState {
  return { enabled: true, source: 'network', ...partial };
}

describe('useKillSwitchNotice', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('avisa só pelos switches desligados com mensagem, na lista recebida', async () => {
    getKillSwitchStateMock.mockImplementation((switchName: string) =>
      Promise.resolve(
        switchName === 'switch_off'
          ? state({ enabled: false, message: 'Em manutenção.' })
          : state({ enabled: true }),
      ),
    );

    const { result } = renderHook(() => useKillSwitchNotice(['switch_on', 'switch_off']), {
      wrapper,
    });

    await waitFor(() => expect(result.current.isBlocked).toBe(true));
    expect(result.current.notices).toEqual([
      { switchName: 'switch_off', message: 'Em manutenção.' },
    ]);
    expect(result.current.blockedMessage).toBe('Em manutenção.');
  });

  it('nomes repetidos são consultados uma única vez', async () => {
    getKillSwitchStateMock.mockResolvedValue(state({ enabled: true }));

    renderHook(() => useKillSwitchNotice(['dup', 'dup']), { wrapper });

    await waitFor(() => expect(getKillSwitchStateMock).toHaveBeenCalled());
    expect(getKillSwitchStateMock).toHaveBeenCalledTimes(1);
  });

  it('lista vazia não consulta o banco', () => {
    const { result } = renderHook(() => useKillSwitchNotice([]), { wrapper });

    expect(getKillSwitchStateMock).not.toHaveBeenCalled();
    expect(result.current.isBlocked).toBe(false);
    expect(result.current.blockedMessage).toBeNull();
  });

  it('leitura que falha devolve fail-open (nada bloqueado)', async () => {
    getKillSwitchStateMock.mockRejectedValue(new Error('offline'));

    const { result } = renderHook(() => useKillSwitchNotice(['edge_generate_mockup']), { wrapper });

    await waitFor(() => expect(getKillSwitchStateMock).toHaveBeenCalled());
    await waitFor(() => expect(result.current.isBlocked).toBe(false));
    expect(result.current.notices).toEqual([]);
  });
});
