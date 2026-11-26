import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { AiQuotaRow } from '@/lib/ai/quota-summary';
import { AiQuotaPerUserPanel } from '../AiQuotaPerUserPanel';

interface HookState {
  data: AiQuotaRow[] | undefined;
  isLoading: boolean;
  isFetching: boolean;
  error: unknown;
  refetch: () => void;
  lastSearch: string;
}

const hookState = vi.hoisted<HookState>(() => ({
  data: undefined,
  isLoading: false,
  isFetching: false,
  error: null,
  refetch: vi.fn(),
  lastSearch: '',
}));

vi.mock('@/hooks/admin/useAiQuotaSummary', () => ({
  AI_QUOTA_SUMMARY_LIMIT: 200,
  useAiQuotaSummary: (search?: string) => {
    hookState.lastSearch = search ?? '';
    return {
      data: hookState.data,
      isLoading: hookState.isLoading,
      isFetching: hookState.isFetching,
      error: hookState.error,
      refetch: hookState.refetch,
    };
  },
}));

function linha(over: Partial<AiQuotaRow> = {}): AiQuotaRow {
  return {
    userId: over.userId ?? '11111111-1111-1111-1111-111111111111',
    email: over.email ?? 'vendedor@pgtv.test',
    role: over.role ?? 'vendedor',
    monthlyLimit: over.monthlyLimit ?? 10,
    isUnlimited: over.isUnlimited ?? false,
    usedThisMonth: over.usedThisMonth ?? 0,
    remaining: over.remaining ?? 10,
    successMonth: over.successMonth ?? 0,
    errorMonth: over.errorMonth ?? 0,
    pendingCount: over.pendingCount ?? 0,
    lastActivity: over.lastActivity ?? null,
  };
}

function estado(over: Partial<HookState> = {}): void {
  hookState.data = over.data;
  hookState.isLoading = over.isLoading ?? false;
  hookState.isFetching = over.isFetching ?? false;
  hookState.error = over.error ?? null;
  hookState.lastSearch = '';
}

beforeEach(() => {
  hookState.data = undefined;
  hookState.isLoading = false;
  hookState.isFetching = false;
  hookState.error = null;
  hookState.lastSearch = '';
  hookState.refetch = vi.fn();
});

describe('AiQuotaPerUserPanel', () => {
  it('mostra esqueleto enquanto carrega', () => {
    estado({ isLoading: true });
    render(<AiQuotaPerUserPanel />);
    expect(screen.getByTestId('ai-quota-loading')).toBeInTheDocument();
    expect(screen.queryByTestId('ai-quota-tabela')).not.toBeInTheDocument();
  });

  it('explica o erro de permissao e deixa tentar de novo', () => {
    estado({ error: { code: '42501', message: 'Acesso restrito a administradores.' } });
    render(<AiQuotaPerUserPanel />);
    const card = screen.getByTestId('ai-quota-error');
    expect(within(card).getByText(/administradora/)).toBeInTheDocument();
    expect(within(card).queryByText(/Acesso restrito a administradores/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('ai-quota-retry'));
    expect(hookState.refetch).toHaveBeenCalledTimes(1);
  });

  it('explica o estado vazio quando nenhum usuario tem papel', () => {
    estado({ data: [] });
    render(<AiQuotaPerUserPanel />);
    expect(screen.getByText(/Nenhum usuário com papel registrado/)).toBeInTheDocument();
    expect(within(screen.getByTestId('ai-quota-tabela')).getAllByRole('row')).toHaveLength(2);
  });

  it('lista os usuarios com consumo, papel e estados da cota', () => {
    estado({
      data: [
        linha({
          userId: 'aaa',
          email: 'maria@pgtv.test',
          monthlyLimit: 10,
          usedThisMonth: 2,
          remaining: 8,
          successMonth: 2,
          pendingCount: 1,
        }),
        linha({
          userId: 'bbb',
          email: 'dev@pgtv.test',
          role: 'dev',
          isUnlimited: true,
          remaining: -1,
          usedThisMonth: 40,
        }),
        linha({
          userId: 'ccc',
          email: 'cheio@pgtv.test',
          remaining: 0,
          usedThisMonth: 10,
          monthlyLimit: 10,
          errorMonth: 3,
        }),
      ],
    });
    render(<AiQuotaPerUserPanel />);

    expect(screen.getAllByTestId('ai-quota-row')).toHaveLength(3);
    expect(screen.getByText('maria@pgtv.test')).toBeInTheDocument();
    expect(screen.getByText('2 / 10')).toBeInTheDocument();
    expect(screen.getByText('20% da cota')).toBeInTheDocument();
    expect(screen.getByText('40 / ilimitado')).toBeInTheDocument();
    expect(screen.getByText('ilimitado')).toBeInTheDocument();
    expect(screen.getByText('esgotado')).toBeInTheDocument();
    expect(screen.getAllByText('Agente')).toHaveLength(2);
    expect(screen.getByText('Dev')).toBeInTheDocument();
    // KPIs: 3 usuarios, 1 ilimitado, 1 esgotado, 1 chamada pendente.
    expect(screen.getByTestId('ai-quota-kpi-usuarios')).toHaveTextContent('3');
    expect(screen.getByTestId('ai-quota-kpi-ilimitados')).toHaveTextContent('1');
    expect(screen.getByTestId('ai-quota-kpi-esgotados')).toHaveTextContent('1');
    expect(screen.getByTestId('ai-quota-kpi-pendentes')).toHaveTextContent('1');
  });

  it('manda o termo digitado para a busca no banco (debounce)', async () => {
    estado({ data: [linha({ email: 'maria@pgtv.test' })] });
    render(<AiQuotaPerUserPanel />);
    expect(hookState.lastSearch).toBe('');
    fireEvent.change(screen.getByTestId('ai-quota-search'), { target: { value: 'maria' } });
    await waitFor(() => expect(hookState.lastSearch).toBe('maria'));
  });

  it('explica o filtro sem resultado', async () => {
    estado({ data: [] });
    render(<AiQuotaPerUserPanel />);
    fireEvent.change(screen.getByTestId('ai-quota-search'), { target: { value: 'maria' } });
    await waitFor(() =>
      expect(screen.getByText(/Nenhum usuário corresponde a "maria"/)).toBeInTheDocument(),
    );
  });

  it('avisa quando a lista foi truncada no limite da RPC', () => {
    const cheio = Array.from({ length: 200 }, (_, i) =>
      linha({ userId: `id-${String(i)}`, email: `u${String(i)}@pgtv.test` }),
    );
    estado({ data: cheio });
    render(<AiQuotaPerUserPanel />);
    expect(screen.getByText(/maior consumo/)).toBeInTheDocument();
  });

  it('desabilita o refresh enquanto a busca esta em andamento', () => {
    estado({ data: [], isFetching: true });
    render(<AiQuotaPerUserPanel />);
    expect(screen.getByTestId('ai-quota-refresh')).toBeDisabled();
  });

  it('recarrega ao clicar em atualizar', () => {
    estado({ data: [] });
    render(<AiQuotaPerUserPanel />);
    fireEvent.click(screen.getByTestId('ai-quota-refresh'));
    expect(hookState.refetch).toHaveBeenCalledTimes(1);
  });
});
