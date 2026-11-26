import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import type { BlockedAccessRow } from '@/lib/security/blockedAccess';
import { BlockedAccessLogTab } from '../BlockedAccessLogTab';

interface HookState {
  rows: BlockedAccessRow[];
  limit: number;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

const hookState = vi.hoisted<HookState>(() => ({
  rows: [],
  limit: 500,
  isLoading: false,
  error: null,
  refetch: vi.fn(),
}));

vi.mock('@/hooks/security/useBlockedAccessLog', () => ({
  useBlockedAccessLog: () => hookState,
}));

const NOW = Date.now();
const HOUR = 60 * 60 * 1000;

function row(over: Partial<BlockedAccessRow> = {}): BlockedAccessRow {
  return {
    id: over.id ?? 'r1',
    email: over.email === undefined ? 'cliente@empresa.com' : over.email,
    ip_address: over.ip_address ?? '200.10.10.10',
    city: over.city === undefined ? 'São Paulo' : over.city,
    state: over.state === undefined ? 'SP' : over.state,
    country: over.country === undefined ? 'BR' : over.country,
    block_reason: over.block_reason ?? 'too_many_failed_attempts',
    user_agent: over.user_agent === undefined ? 'Mozilla/5.0 (Windows)' : over.user_agent,
    created_at: over.created_at ?? new Date(NOW - HOUR).toISOString(),
  };
}

function setRows(rows: BlockedAccessRow[], over: Partial<HookState> = {}): void {
  hookState.rows = rows;
  Object.assign(hookState, over);
}

function tableRows(): number {
  return within(screen.getByTestId('blocked-access-table')).getAllByRole('row').length - 1;
}

beforeEach(() => {
  hookState.rows = [];
  hookState.limit = 500;
  hookState.isLoading = false;
  hookState.error = null;
  hookState.refetch = vi.fn();
});

describe('BlockedAccessLogTab', () => {
  it('mostra esqueleto enquanto carrega', () => {
    hookState.isLoading = true;
    render(<BlockedAccessLogTab />);
    expect(screen.getByTestId('blocked-access-loading')).toBeInTheDocument();
    expect(screen.queryByTestId('blocked-access-tab')).not.toBeInTheDocument();
  });

  it('mostra o erro com a policy exigida e permite tentar de novo', () => {
    hookState.error = new Error('permission denied');
    render(<BlockedAccessLogTab />);
    const card = screen.getByTestId('blocked-access-error');
    expect(within(card).getByText(/permission denied/)).toBeInTheDocument();
    expect(within(card).getByText(/access_blocked_log_admin_read/)).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('blocked-access-retry'));
    expect(hookState.refetch).toHaveBeenCalledTimes(1);
  });

  it('explica o estado vazio quando a tabela não tem registros', () => {
    render(<BlockedAccessLogTab />);
    expect(screen.getByTestId('blocked-access-empty')).toBeInTheDocument();
    expect(screen.getByTestId('blocked-access-csv')).toBeDisabled();
  });

  it('lista os bloqueios com motivo traduzido e código técnico', () => {
    setRows([row({ id: 'a', ip_address: '187.55.4.9' })]);
    render(<BlockedAccessLogTab />);
    const table = screen.getByTestId('blocked-access-table');
    expect(within(table).getByText('187.55.4.9')).toBeInTheDocument();
    expect(within(table).getByText('cliente@empresa.com')).toBeInTheDocument();
    expect(within(table).getByText('São Paulo / SP / BR')).toBeInTheDocument();
    expect(within(table).getByText('Excesso de tentativas de login')).toBeInTheDocument();
    expect(within(table).getByText(/too_many_failed_attempts/)).toBeInTheDocument();
    expect(screen.getByTestId('blocked-access-csv')).toBeEnabled();
  });

  it('marca no badge o motivo que não está no catálogo', () => {
    setRows([row({ id: 'a', block_reason: 'motivo_novo' })]);
    render(<BlockedAccessLogTab />);
    const table = screen.getByTestId('blocked-access-table');
    expect(within(table).getByText('Motivo não catalogado')).toBeInTheDocument();
    expect(within(table).getByText(/motivo_novo/)).toBeInTheDocument();
  });

  it('filtra pela busca e avisa quando nada casa', () => {
    setRows([
      row({ id: 'a', email: 'ana@empresa.com' }),
      row({ id: 'b', email: 'bruno@empresa.com' }),
    ]);
    render(<BlockedAccessLogTab />);
    expect(tableRows()).toBe(2);

    fireEvent.change(screen.getByTestId('blocked-access-search'), { target: { value: 'ana' } });
    expect(tableRows()).toBe(1);

    fireEvent.change(screen.getByTestId('blocked-access-search'), { target: { value: 'zzz' } });
    expect(screen.getByTestId('blocked-access-no-match')).toBeInTheDocument();
    expect(screen.queryByTestId('blocked-access-table')).not.toBeInTheDocument();
  });

  it('recorta a tabela pelo chip de motivo', () => {
    setRows([
      row({ id: 'a', block_reason: 'ip_not_whitelisted' }),
      row({ id: 'b', block_reason: 'too_many_failed_attempts' }),
    ]);
    render(<BlockedAccessLogTab />);
    expect(tableRows()).toBe(2);

    const chip = screen.getByRole('button', { name: /^IP fora da whitelist \(1\)$/ });
    expect(chip).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(chip);
    expect(chip).toHaveAttribute('aria-pressed', 'true');
    expect(tableRows()).toBe(1);
    expect(screen.getByTestId('blocked-access-count')).toHaveTextContent('1 registro(s)');
  });

  it('recorta a tabela pelo período de 24 horas', () => {
    setRows([
      row({ id: 'recente', created_at: new Date(NOW - 2 * HOUR).toISOString() }),
      row({ id: 'antigo', created_at: new Date(NOW - 30 * HOUR).toISOString() }),
    ]);
    render(<BlockedAccessLogTab />);
    expect(tableRows()).toBe(2);

    fireEvent.click(screen.getByRole('button', { name: 'Últimas 24 horas' }));
    expect(tableRows()).toBe(1);
  });

  it('avisa quando o limite de leitura foi atingido', () => {
    setRows([row({ id: 'a' }), row({ id: 'b' })], { limit: 2 });
    render(<BlockedAccessLogTab />);
    expect(screen.getByText(/Mostrando os 2 registros mais recentes/)).toBeInTheDocument();
  });

  it('exporta o CSV do que está visível no filtro', () => {
    const createObjectURL = vi.fn(() => 'blob:acessos');
    const revokeObjectURL = vi.fn();
    Object.defineProperty(URL, 'createObjectURL', { value: createObjectURL, configurable: true });
    Object.defineProperty(URL, 'revokeObjectURL', { value: revokeObjectURL, configurable: true });
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => undefined);

    setRows([row({ id: 'a' })]);
    render(<BlockedAccessLogTab />);
    fireEvent.click(screen.getByTestId('blocked-access-csv'));

    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).toHaveBeenCalledTimes(1);
    expect(click).toHaveBeenCalledTimes(1);
    click.mockRestore();
  });

  it('recarrega pelo botão Atualizar', () => {
    setRows([row({ id: 'a' })]);
    render(<BlockedAccessLogTab />);
    fireEvent.click(screen.getByTestId('blocked-access-refresh'));
    expect(hookState.refetch).toHaveBeenCalledTimes(1);
  });
});
