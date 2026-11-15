/**
 * A11y — combobox acessível do seletor de cliente do mockup: roles
 * combobox/listbox/option, setas circulares + Enter escolhem e Esc fecha só a
 * lista (sem mexer na seleção). Sem a correção estes casos falham.
 */
import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { render, screen, within, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { axe } from '../../../../tests/a11y/axe-helper';
import { MockupClientSelector } from '../MockupClientSelector';

const { COMPANIES, crm } = vi.hoisted(() => {
  const records = [
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
  ];
  // Estado do CRM ajustado por teste: cada ramo aberto do dropdown tem o seu.
  const state: {
    records: typeof records;
    isError: boolean;
    search: () => Promise<unknown[]>;
  } = { records, isError: false, search: () => Promise.resolve([]) };
  return { COMPANIES: records, crm: state };
});

// A busca real vai ao CRM externo — mockamos só o hook e o bridge; a fuzzy roda de verdade.
vi.mock('@/lib/crm-db', () => ({ searchCrm: vi.fn(() => crm.search()) }));
vi.mock('@/hooks/crm', () => ({
  useCrmInfiniteCompanySelector: () => ({
    data: { pages: [{ records: crm.records }] },
    isLoading: false,
    fetchNextPage: vi.fn(),
    hasNextPage: false,
    isFetchingNextPage: false,
    isError: crm.isError,
    error: crm.isError ? new Error('CRM indisponível') : null,
    refetch: vi.fn(),
  }),
}));
vi.mock('@/hooks/ui/useReducedMotion', () => ({ useReducedMotion: () => true }));

function renderSelector(
  selectedClient: React.ComponentProps<typeof MockupClientSelector>['selectedClient'] = null,
) {
  const onClientSelect = vi.fn();
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  const utils = render(
    <MockupClientSelector selectedClient={selectedClient} onClientSelect={onClientSelect} />,
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

/**
 * aria-controls/aria-activedescendant só podem apontar para ids que existem (axe:
 * aria-valid-attr-value), e aria-expanded tem de bater com a presença do listbox.
 */
function expectAriaTargetsExist() {
  const input = screen.getByRole('combobox', { name: 'Buscar empresa' });
  const listbox = screen.queryByRole('listbox');
  expect(input).toHaveAttribute('aria-expanded', String(listbox !== null));
  for (const attr of ['aria-controls', 'aria-activedescendant']) {
    const id = input.getAttribute(attr);
    if (id !== null) expect(document.getElementById(id)).not.toBeNull();
  }
  return input;
}

beforeEach(() => {
  crm.records = COMPANIES;
  crm.isError = false;
  crm.search = () => Promise.resolve([]);
});

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

  it('sem violações WCAG no combobox aberto com resultados', async () => {
    const user = userEvent.setup();
    renderSelector();
    await openListbox(user);

    const results = await axe(document.body);
    expect(results.violations).toEqual([]);
    expectAriaTargetsExist();
    cleanup();
  });

  // Os três ramos abertos SEM listbox: antes da correção o input anunciava
  // aria-expanded=true e aria-controls para um id que não existe (aria-valid-attr-value).
  it('sem violações WCAG no erro do CRM (ramo aberto sem listbox)', async () => {
    crm.isError = true;
    crm.records = [];
    const user = userEvent.setup();
    renderSelector();

    await user.click(screen.getByRole('combobox', { name: 'Buscar empresa' }));
    expect(await screen.findByText('Falha ao carregar CRM')).toBeInTheDocument();
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();

    const results = await axe(document.body);
    expect(results.violations).toEqual([]);
    expectAriaTargetsExist();
    cleanup();
  });

  it('sem violações WCAG com a busca pendente (ramo aberto sem listbox)', async () => {
    // Busca remota que nunca resolve: o ramo do spinner fica estável durante o teste.
    crm.search = () => new Promise(() => {});
    const user = userEvent.setup();
    renderSelector();

    await user.type(screen.getByRole('combobox', { name: 'Buscar empresa' }), 'alf');
    expect(await screen.findByRole('status')).toBeInTheDocument();
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();

    const results = await axe(document.body);
    expect(results.violations).toEqual([]);
    expectAriaTargetsExist();
    cleanup();
  });

  it('sem violações WCAG sem empresas encontradas (ramo aberto sem listbox)', async () => {
    crm.records = [];
    const user = userEvent.setup();
    renderSelector();

    await user.click(screen.getByRole('combobox', { name: 'Buscar empresa' }));
    expect(await screen.findByText('Nenhuma empresa encontrada')).toBeInTheDocument();
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();

    const results = await axe(document.body);
    expect(results.violations).toEqual([]);
    expectAriaTargetsExist();
    cleanup();
  });
});

describe('MockupClientSelector — remover empresa exige confirmação', () => {
  const selectedClient = {
    id: 'c1',
    name: 'Alfa Brindes',
    ramo: 'Brindes corporativos',
    cnpj: '12345678000199',
  };

  it('o chip expõe "Remover empresa" no nome acessível e NÃO remove no 1º clique', async () => {
    const user = userEvent.setup();
    const { onClientSelect } = renderSelector(selectedClient);

    const chip = screen.getByRole('button', { name: /remover empresa/i });
    await user.click(chip);

    // O clique abre a confirmação; o cliente NÃO é removido direto.
    expect(onClientSelect).not.toHaveBeenCalled();
    const dialog = await screen.findByRole('alertdialog');
    expect(within(dialog).getByTestId('mockup-client-remove-confirm-title')).toHaveTextContent(
      'Remover empresa?',
    );
  });

  it('confirmar remove a empresa selecionada', async () => {
    const user = userEvent.setup();
    const { onClientSelect } = renderSelector(selectedClient);

    await user.click(screen.getByRole('button', { name: /remover empresa/i }));
    await screen.findByRole('alertdialog');
    await user.click(screen.getByTestId('mockup-client-remove-confirm-yes'));

    expect(onClientSelect).toHaveBeenCalledTimes(1);
    expect(onClientSelect).toHaveBeenCalledWith(null);
  });

  it('cancelar mantém a empresa selecionada', async () => {
    const user = userEvent.setup();
    const { onClientSelect } = renderSelector(selectedClient);

    await user.click(screen.getByRole('button', { name: /remover empresa/i }));
    await screen.findByRole('alertdialog');
    await user.click(screen.getByTestId('mockup-client-remove-confirm-no'));

    expect(onClientSelect).not.toHaveBeenCalled();
    expect(screen.getByTestId('mockup-client-chip')).toHaveTextContent('Alfa Brindes');
  });
});
