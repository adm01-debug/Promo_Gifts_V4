import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import type { AnonAccessRow } from '@/lib/security/anonAccessAudit';
import { AnonAccessAuditPanel } from '../AnonAccessAuditPanel';

interface HookState {
  rows: AnonAccessRow[];
  isLoading: boolean;
  isFetching: boolean;
  error: unknown;
  refetch: ReturnType<typeof vi.fn>;
}

const hookState = vi.hoisted<HookState>(() => ({
  rows: [],
  isLoading: false,
  isFetching: false,
  error: null,
  refetch: vi.fn(),
}));

vi.mock('@/hooks/security/useAnonAccessAudit', () => ({
  useAnonAccessAudit: () => ({
    rows: hookState.rows,
    isLoading: hookState.isLoading,
    isFetching: hookState.isFetching,
    error: hookState.error,
    refetch: hookState.refetch,
  }),
}));

function linha(over: Partial<AnonAccessRow> = {}): AnonAccessRow {
  return {
    categoria: over.categoria ?? 'VIEW_SENSIVEL_ANON',
    objeto: over.objeto ?? 'v_monthly_costs',
    anonGrant: over.anonGrant ?? true,
    authGrant: over.authGrant ?? true,
    severidade: over.severidade ?? 'HIGH',
    descricao: over.descricao ?? 'view interna acessivel por anon',
  };
}

function estado(over: Partial<HookState> = {}): void {
  hookState.rows = over.rows ?? [];
  hookState.isLoading = over.isLoading ?? false;
  hookState.isFetching = over.isFetching ?? false;
  hookState.error = over.error ?? null;
}

beforeEach(() => {
  hookState.refetch.mockReset();
  estado();
});

describe('AnonAccessAuditPanel', () => {
  it('mostra o skeleton enquanto carrega', () => {
    estado({ isLoading: true });
    render(<AnonAccessAuditPanel />);
    expect(screen.getByTestId('anon-access-loading')).toBeTruthy();
  });

  it('traduz o 42501 em mensagem de permissao e oferece tentar de novo', () => {
    estado({ error: new Error('42501 Acesso restrito a administradores.') });
    render(<AnonAccessAuditPanel />);
    expect(screen.getByTestId('anon-access-error')).toBeTruthy();
    expect(screen.getByText(/permissão de administrador/)).toBeTruthy();
    fireEvent.click(screen.getByTestId('anon-access-retry'));
    expect(hookState.refetch).toHaveBeenCalledTimes(1);
  });

  it('anuncia ambiente saudavel quando nao ha achados', () => {
    render(<AnonAccessAuditPanel />);
    expect(screen.getByTestId('anon-access-empty')).toBeTruthy();
    expect(screen.queryByTestId('anon-access-kpi-total')).toBeNull();
  });

  it('resume os achados em KPIs', () => {
    estado({
      rows: [
        linha({ severidade: 'CRITICAL', objeto: 'fn_x()', categoria: 'FUNC_SEM_EXECUTE_ANON' }),
        linha({ severidade: 'HIGH', objeto: 'v_monthly_costs' }),
        linha({ severidade: 'INFO', objeto: 'orders', categoria: 'RLS_SEM_POLICY' }),
      ],
    });
    render(<AnonAccessAuditPanel />);
    expect(screen.getByTestId('anon-access-kpi-total').textContent).toBe('3');
    expect(screen.getByTestId('anon-access-kpi-criticos').textContent).toBe('1');
    expect(screen.getByTestId('anon-access-kpi-altos').textContent).toBe('1');
    expect(screen.getByTestId('anon-access-kpi-categorias').textContent).toBe('3');
  });

  it('agrupa os objetos por categoria com o rotulo em portugues', () => {
    estado({
      rows: [
        linha({ categoria: 'RLS_SEM_POLICY', objeto: 'orders', severidade: 'INFO' }),
        linha({ categoria: 'RLS_SEM_POLICY', objeto: 'quotes', severidade: 'INFO' }),
        linha({ categoria: 'VIEW_SENSIVEL_ANON', objeto: 'v_monthly_costs', severidade: 'HIGH' }),
      ],
    });
    render(<AnonAccessAuditPanel />);
    expect(screen.getByTestId('anon-access-grupo-RLS_SEM_POLICY')).toBeTruthy();
    expect(screen.getByText(/RLS ativa sem nenhuma policy/)).toBeTruthy();
    expect(screen.getAllByTestId('anon-access-item')).toHaveLength(3);
    expect(screen.getByText('v_monthly_costs')).toBeTruthy();
  });

  it('desabilita o refresh enquanto a chamada esta em voo', () => {
    estado({ rows: [linha()], isFetching: true });
    render(<AnonAccessAuditPanel />);
    expect(screen.getByTestId('anon-access-refresh').hasAttribute('disabled')).toBe(true);
  });

  it('dispara a varredura ao clicar em rodar de novo', () => {
    estado({ rows: [linha()] });
    render(<AnonAccessAuditPanel />);
    fireEvent.click(screen.getByTestId('anon-access-refresh'));
    expect(hookState.refetch).toHaveBeenCalledTimes(1);
  });
});
