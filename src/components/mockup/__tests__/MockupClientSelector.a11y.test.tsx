/**
 * A11y — combobox acessível do seletor de cliente do mockup: roles
 * combobox/listbox/option, setas circulares + Enter escolhem e Esc fecha só a
 * lista (sem mexer na seleção). Sem a correção estes casos falham.
 */
import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, screen, within, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { axe } from '../../../../tests/a11y/axe-helper';
import { MockupClientSelector } from '../MockupClientSelector';

const { COMPANIES } = vi.hoisted(() => ({
  COMPANIES: [
    {
      id: 'c1',
      name: 'Alfa Brindes',
      razao_social: 'Alfa Brindes LTDA',
      nome_fantasia: 'Alfa',
      ramo: 'Brindes corporativos',
      logo_url: null,
      cnpj: '12345678000199',
    },
    {
      id: 'c2',
      name: 'Beta Promo',
      razao_social: 'Beta Promo SA',
      nome_fantasia: null,
      ramo: 'Material promocional',
      logo_url: null,
      cnpj: null,
    },
  ],
}));

// A busca real vai ao CRM externo — mockamos só o hook e o bridge; a fuzzy roda de verdade.
vi.mock('@/lib/crm-db', () => ({ searchCrm: vi.fn().mockResolvedValue([]) }));
vi.mock('@/hooks/crm', () => ({
  useCrmInfiniteCompanySelector: () => ({
    data: { pages: [{ records: COMPANIES }] },
    isLoading: false,
    fetchNextPage: vi.fn(),
    hasNextPage: false,
    isFetchingNextPage: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  }),
}));
vi.mock('@/hooks/ui/useReducedMotion', () => ({ useReducedMotion: () => true }));

function renderSelector() {
  const onClientSelect = vi.fn();
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  const utils = render(
    <MockupClientSelector selectedClient={null} onClientSelect={onClientSelect} />,
    {
      wrapper,
    },
  );
  return { ...utils, onClientSelect };
}

async function openListbox(user: ReturnType<typeof userEvent.setup>) {
  const input = screen.getByRole('combobox', { name: 'Buscar empresa' });
  await user.click(input);
  const listbox = await screen.findByRole('listbox');
  return { input, listbox };
}

beforeAll(() => {
  // jsdom não implementa o layout; PointerEvent do userEvent não depende disto.
  window.HTMLElement.prototype.scrollIntoView = vi.fn();
});

describe('MockupClientSelector — combobox acessível', () => {
  it('o campo de busca é role=combobox com aria-expanded/aria-controls', async () => {
    const user = userEvent.setup();
    const { onClientSelect } = renderSelector();

    const input = screen.getByRole('combobox', { name: 'Buscar empresa' });
    expect(input).toHaveAttribute('aria-expanded', 'false');
    expect(input).toHaveAttribute('aria-autocomplete', 'list');

    await user.click(input);
    const listbox = await screen.findByRole('listbox');

    expect(input).toHaveAttribute('aria-expanded', 'true');
    expect(input).toHaveAttribute('aria-controls', listbox.id);
    expect(onClientSelect).not.toHaveBeenCalled();
  });

  it('lista resultados como listbox com um option por empresa', async () => {
    const user = userEvent.setup();
    renderSelector();

    const { listbox } = await openListbox(user);
    const options = within(listbox).getAllByRole('option');
    expect(options).toHaveLength(COMPANIES.length);
    expect(options[0]).toHaveTextContent('Alfa Brindes');
  });

  it('ArrowDown/ArrowUp movem aria-activedescendant em ciclo', async () => {
    const user = userEvent.setup();
    renderSelector();

    const { input, listbox } = await openListbox(user);
    const options = within(listbox).getAllByRole('option');

    await user.keyboard('{ArrowDown}');
    expect(input).toHaveAttribute('aria-activedescendant', options[0].id);

    await user.keyboard('{ArrowDown}');
    expect(input).toHaveAttribute('aria-activedescendant', options[1].id);

    // Circular: do último volta ao primeiro.
    await user.keyboard('{ArrowDown}');
    expect(input).toHaveAttribute('aria-activedescendant', options[0].id);

    await user.keyboard('{ArrowUp}');
    expect(input).toHaveAttribute('aria-activedescendant', options[1].id);
  });

  it('Enter escolhe o option ativo', async () => {
    const user = userEvent.setup();
    const { onClientSelect } = renderSelector();

    const { input } = await openListbox(user);
    expect(input).toHaveAttribute('aria-expanded', 'true');

    await user.keyboard('{ArrowDown}{Enter}');

    expect(onClientSelect).toHaveBeenCalledTimes(1);
    expect(onClientSelect).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'c1', name: 'Alfa Brindes' }),
    );
  });

  it('Esc fecha apenas a lista e não altera a seleção', async () => {
    const user = userEvent.setup();
    const { onClientSelect } = renderSelector();

    const { input } = await openListbox(user);
    await user.keyboard('{Escape}');

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(input).toHaveAttribute('aria-expanded', 'false');
    expect(onClientSelect).not.toHaveBeenCalled();
  });

  it('sem violações WCAG no combobox aberto', async () => {
    const user = userEvent.setup();
    renderSelector();
    await openListbox(user);

    const results = await axe(document.body);
    expect(results.violations).toEqual([]);
    cleanup();
  });
});
