/**
 * Aba Feriados: os hooks de `@/hooks/freight` são mockados; aqui se trava o que a
 * tela mostra em cada estado e o que ela entrega às mutações.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { BusinessCalendarRow } from '@/services/businessCalendarService';

const h = vi.hoisted(() => {
  const state: {
    year: { rows: BusinessCalendarRow[]; isLoading: boolean; isError: boolean };
    refetch: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    remove: ReturnType<typeof vi.fn>;
    askedYears: number[];
  } = {
    year: { rows: [], isLoading: false, isError: false },
    refetch: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    askedYears: [],
  };
  return state;
});

vi.mock('@/hooks/freight', () => ({
  useBusinessCalendarYear: (year: number) => {
    h.askedYears.push(year);
    return { ...h.year, isFetching: false, error: null, refetch: h.refetch };
  },
  useBusinessCalendarMutations: () => ({
    create: { mutate: h.create, isPending: false },
    updateDescription: { mutate: h.update, isPending: false },
    remove: { mutate: h.remove, isPending: false },
  }),
}));

import { BusinessCalendarManager } from '../BusinessCalendarManager';

const FERIADOS: BusinessCalendarRow[] = [
  { day: '2026-11-02', description: 'Finados', created_at: '', created_by: null },
  { day: '2026-11-20', description: 'Consciência Negra', created_at: '', created_by: null },
];

beforeEach(() => {
  vi.clearAllMocks();
  h.askedYears = [];
  h.year = { rows: FERIADOS, isLoading: false, isError: false };
});

describe('estados', () => {
  it('lista os feriados com data dd/mm/aaaa e dia da semana', () => {
    render(<BusinessCalendarManager />);
    const linha = screen.getByTestId('feriado-2026-11-20');
    expect(within(linha).getByText('20/11/2026')).toBeTruthy();
    // 20/11/2026 cai numa sexta-feira; só a 1ª letra maiúscula (não "Sexta-Feira")
    expect(within(linha).getByText('Sexta-feira')).toBeTruthy();
    expect(within(linha).getByText('Consciência Negra')).toBeTruthy();
  });

  it('mostra carregando', () => {
    h.year = { rows: [], isLoading: true, isError: false };
    render(<BusinessCalendarManager />);
    expect(screen.getByRole('status').textContent).toContain('Carregando feriados');
  });

  it('mostra vazio com o ano consultado', () => {
    h.year = { rows: [], isLoading: false, isError: false };
    render(<BusinessCalendarManager />);
    expect(screen.getByText(/Nenhum feriado cadastrado em \d{4}/)).toBeTruthy();
  });

  it('mostra erro e tenta de novo', async () => {
    h.year = { rows: [], isLoading: false, isError: true };
    render(<BusinessCalendarManager />);
    expect(screen.getByRole('alert').textContent).toContain('Não foi possível carregar');
    await userEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(h.refetch).toHaveBeenCalledOnce();
  });
});

describe('campo Ano', () => {
  it('digitar 3 dígitos mostra o que foi digitado, sem reverter para o ano atual', async () => {
    render(<BusinessCalendarManager />);
    const ano = screen.getByLabelText('Ano');
    await userEvent.clear(ano);
    await userEvent.type(ano, '202');
    expect(ano).toHaveValue(202);
  });

  it('completar 4 dígitos válidos troca o ano consultado', async () => {
    render(<BusinessCalendarManager />);
    const ano = screen.getByLabelText('Ano');
    await userEvent.clear(ano);
    await userEvent.type(ano, '2027');
    expect(ano).toHaveValue(2027);
    expect(screen.getByRole('list', { name: 'Feriados de 2027' })).toBeTruthy();
    expect(h.askedYears.at(-1)).toBe(2027);
  });

  it('sair do campo com texto inválido volta para o último ano válido', async () => {
    render(<BusinessCalendarManager />);
    const ano = screen.getByLabelText('Ano');
    await userEvent.clear(ano);
    await userEvent.type(ano, '9');
    await userEvent.tab();
    expect(ano).toHaveValue(Number(h.askedYears.at(-1)));
  });
});

describe('adicionar', () => {
  it('sem data ou sem nome não grava e explica', async () => {
    render(<BusinessCalendarManager />);
    await userEvent.click(screen.getByRole('button', { name: 'Adicionar' }));
    expect(screen.getByRole('alert').textContent).toBe('Escolha a data do feriado.');
    await userEvent.type(screen.getByLabelText('Data'), '2026-12-24');
    await userEvent.click(screen.getByRole('button', { name: 'Adicionar' }));
    expect(screen.getByRole('alert').textContent).toBe('Informe o nome do feriado.');
    expect(h.create).not.toHaveBeenCalled();
  });

  it('com data e nome entrega a mutação (nome aparado)', async () => {
    render(<BusinessCalendarManager />);
    await userEvent.type(screen.getByLabelText('Data'), '2026-12-24');
    await userEvent.type(screen.getByLabelText('Nome do feriado'), '  Véspera de Natal ');
    await userEvent.click(screen.getByRole('button', { name: 'Adicionar' }));
    expect(h.create).toHaveBeenCalledOnce();
    expect(h.create.mock.calls[0]?.[0]).toEqual({
      day: '2026-12-24',
      description: 'Véspera de Natal',
    });
  });

  it('mostra no formulário o erro que o banco devolveu (permissão)', async () => {
    h.create.mockImplementation((_v: unknown, opts: { onError: (e: Error) => void }) =>
      opts.onError(
        new Error('Sem permissão para alterar os feriados. Apenas administradores podem salvar.'),
      ),
    );
    render(<BusinessCalendarManager />);
    await userEvent.type(screen.getByLabelText('Data'), '2026-12-24');
    await userEvent.type(screen.getByLabelText('Nome do feriado'), 'X');
    await userEvent.click(screen.getByRole('button', { name: 'Adicionar' }));
    expect((await screen.findByRole('alert')).textContent).toContain('Apenas administradores');
  });
});

describe('editar e excluir', () => {
  it('edita só o nome', async () => {
    render(<BusinessCalendarManager />);
    await userEvent.click(screen.getByRole('button', { name: 'Editar nome de 02/11/2026' }));
    const campo = screen.getByLabelText('Nome do feriado de 02/11/2026');
    await userEvent.clear(campo);
    await userEvent.type(campo, 'Dia de Finados');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar nome' }));
    expect(h.update.mock.calls[0]?.[0]).toEqual({
      day: '2026-11-02',
      description: 'Dia de Finados',
    });
  });

  it('excluir pede confirmação e só então apaga', async () => {
    render(<BusinessCalendarManager />);
    await userEvent.click(screen.getByRole('button', { name: 'Excluir feriado de 20/11/2026' }));
    expect(h.remove).not.toHaveBeenCalled();
    expect(screen.getByText(/20\/11\/2026 — Consciência Negra/)).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: /Excluir$/ }));
    expect(h.remove.mock.calls[0]?.[0]).toBe('2026-11-20');
  });
});
