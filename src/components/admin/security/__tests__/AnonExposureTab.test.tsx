import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import type { AnonAuditSnapshot } from '@/lib/security/anonExposure';
import { AnonExposureTab } from '../AnonExposureTab';

interface HookState {
  snapshots: AnonAuditSnapshot[];
  limit: number;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

interface RunState {
  mutate: (
    variables: undefined,
    options?: {
      onSuccess?: (resultado: {
        violationCount: number;
        saudavel: boolean;
        mensagem: string;
      }) => void;
      onError?: (falha: Error) => void;
    },
  ) => void;
  isPending: boolean;
}

const hookState = vi.hoisted<HookState>(() => ({
  snapshots: [],
  limit: 40,
  isLoading: false,
  error: null,
  refetch: vi.fn(),
}));

const runState = vi.hoisted<RunState>(() => ({
  mutate: vi.fn(),
  isPending: false,
}));

const toastSpy = vi.hoisted(() => vi.fn());

vi.mock('@/hooks/security/useAnonExposureAudit', () => ({
  useAnonExposureAudit: () => hookState,
  useRunAnonExposureAudit: () => runState,
}));

vi.mock('@/hooks/ui', () => ({ useToast: () => ({ toast: toastSpy }) }));

vi.mock('@/lib/logger', () => ({
  logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

function violacao(objectName: string, objectKind = 'view', issue = 'fora do contrato') {
  return { objectName, objectKind, issue };
}

function snapshot(over: Partial<AnonAuditSnapshot> = {}): AnonAuditSnapshot {
  return {
    id: over.id ?? 1,
    checkedAt: over.checkedAt ?? '2026-11-26T12:00:00.000Z',
    violationCount: over.violationCount ?? 0,
    violations: over.violations ?? [],
  };
}

function setSnapshots(snapshots: AnonAuditSnapshot[], over: Partial<HookState> = {}): void {
  hookState.snapshots = snapshots;
  Object.assign(hookState, over);
}

function tableRows(): number {
  return within(screen.getByTestId('anon-exposure-tabela')).getAllByRole('row').length - 1;
}

beforeEach(() => {
  hookState.snapshots = [];
  hookState.limit = 40;
  hookState.isLoading = false;
  hookState.error = null;
  hookState.refetch = vi.fn();
  runState.mutate = vi.fn();
  runState.isPending = false;
  toastSpy.mockReset();
});

describe('AnonExposureTab', () => {
  it('mostra esqueleto enquanto carrega', () => {
    hookState.isLoading = true;
    render(<AnonExposureTab />);
    expect(screen.getByTestId('anon-exposure-loading')).toBeInTheDocument();
    expect(screen.queryByTestId('anon-exposure-tab')).not.toBeInTheDocument();
  });

  it('mostra o erro com a policy exigida e permite tentar de novo', () => {
    hookState.error = new Error('permission denied for table anon_catalog_grant_audit_log');
    render(<AnonExposureTab />);
    const card = screen.getByTestId('anon-exposure-error');
    expect(within(card).getByText(/permission denied/)).toBeInTheDocument();
    expect(within(card).getByText(/anon_catalog_grant_audit_log_admin_read/)).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('anon-exposure-retry'));
    expect(hookState.refetch).toHaveBeenCalledTimes(1);
  });

  it('explica o estado vazio quando nenhuma verificação foi registrada', () => {
    render(<AnonExposureTab />);
    expect(screen.getByTestId('anon-exposure-empty')).toBeInTheDocument();
    expect(screen.getByText(/Nenhuma verificação registrada ainda/)).toBeInTheDocument();
    expect(screen.getByText('Contrato intacto')).toBeInTheDocument();
    expect(screen.queryByTestId('anon-exposure-tabela')).not.toBeInTheDocument();
    expect(screen.queryByTestId('anon-exposure-historico')).not.toBeInTheDocument();
  });

  it('lista as violações da verificação mais recente, agrupadas por tipo', () => {
    setSnapshots([
      snapshot({
        id: 9,
        violationCount: 3,
        violations: [
          violacao('v_products_complete', 'view', 'coluna sensível'),
          violacao('v_monthly_costs', 'view', 'custo exposto'),
          violacao('t_x', 'table', 'grant para anon'),
        ],
      }),
    ]);
    render(<AnonExposureTab />);

    expect(screen.getByText('3 objeto(s) fora do contrato')).toBeInTheDocument();
    const grupos = screen.getByTestId('anon-exposure-grupos');
    expect(within(grupos).getByText('View (2)')).toBeInTheDocument();
    expect(within(grupos).getByText('Tabela (1)')).toBeInTheDocument();

    const tabela = screen.getByTestId('anon-exposure-tabela');
    expect(within(tabela).getByText('v_monthly_costs')).toBeInTheDocument();
    expect(within(tabela).getByText('custo exposto')).toBeInTheDocument();
    expect(tableRows()).toBe(3);
  });

  it('filtra pela busca e avisa quando nada casa', () => {
    setSnapshots([
      snapshot({
        violationCount: 2,
        violations: [
          violacao('v_products_complete', 'view', 'coluna sensível'),
          violacao('t_x', 'table', 'grant para anon'),
        ],
      }),
    ]);
    render(<AnonExposureTab />);
    expect(tableRows()).toBe(2);

    fireEvent.change(screen.getByTestId('anon-exposure-search'), { target: { value: 'monthly' } });
    expect(screen.getByTestId('anon-exposure-sem-resultado')).toBeInTheDocument();
    expect(screen.queryByTestId('anon-exposure-tabela')).not.toBeInTheDocument();

    fireEvent.change(screen.getByTestId('anon-exposure-search'), { target: { value: 'table' } });
    expect(tableRows()).toBe(1);
  });

  it('mostra o histórico com a variação entre execuções', () => {
    setSnapshots([
      snapshot({ id: 1, checkedAt: '2026-11-24T10:00:00.000Z', violationCount: 5 }),
      snapshot({ id: 2, checkedAt: '2026-11-26T10:00:00.000Z', violationCount: 4 }),
    ]);
    render(<AnonExposureTab />);
    const historico = screen.getByTestId('anon-exposure-historico');
    expect(within(historico).getAllByRole('row')).toHaveLength(3);
    expect(within(historico).getByText(/1 violação\(ões\) resolvida\(s\)/)).toBeInTheDocument();
    expect(within(historico).getByText('Primeira verificação registrada')).toBeInTheDocument();
  });

  it('roda a verificação e avisa o resultado saudável', () => {
    setSnapshots([snapshot({ violationCount: 0 })]);
    render(<AnonExposureTab />);
    fireEvent.click(screen.getByTestId('anon-exposure-run'));

    expect(runState.mutate).toHaveBeenCalledTimes(1);
    const opcoes = runState.mutate.mock.calls[0]?.[1];
    expect(opcoes).toBeDefined();
    opcoes?.onSuccess?.({ violationCount: 0, saudavel: true, mensagem: 'intacto' });
    expect(toastSpy).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Contrato do anon intacto' }),
    );
  });

  it('avisa violações com tom destrutivo e desabilita o botão enquanto roda', () => {
    setSnapshots([snapshot({ violationCount: 1, violations: [violacao('v_a')] })]);
    runState.isPending = true;
    render(<AnonExposureTab />);
    expect(screen.getByTestId('anon-exposure-run')).toBeDisabled();
    expect(screen.getByText('Verificando…')).toBeInTheDocument();
  });

  it('não vaza a mensagem crua do erro da RPC no toast', () => {
    setSnapshots([snapshot({ violationCount: 0 })]);
    render(<AnonExposureTab />);
    fireEvent.click(screen.getByTestId('anon-exposure-run'));

    const opcoes = runState.mutate.mock.calls[0]?.[1];
    opcoes?.onError?.(new Error('permission denied for function fn_anon_catalog_grant_audit_run'));

    expect(toastSpy).toHaveBeenCalledTimes(1);
    const argumento = toastSpy.mock.calls[0]?.[0];
    expect(JSON.stringify(argumento)).not.toContain('permission denied');
    expect(argumento).toMatchObject({ variant: 'destructive' });
  });

  it('recarrega pelo botão Atualizar', () => {
    setSnapshots([snapshot({ violationCount: 0 })]);
    render(<AnonExposureTab />);
    fireEvent.click(screen.getByTestId('anon-exposure-refresh'));
    expect(hookState.refetch).toHaveBeenCalledTimes(1);
  });
});
