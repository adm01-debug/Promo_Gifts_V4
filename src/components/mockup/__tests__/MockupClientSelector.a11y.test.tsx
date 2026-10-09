/**
 * A11y — combobox acessível do seletor de cliente do mockup: roles
 * combobox/listbox/option, setas + Enter escolhem, Esc fecha só a lista e a
 * remoção do cliente passa por confirmação. Sem a correção estes casos falham.
 */
import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, screen, within, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { toHaveNoViolations } from 'jest-axe';
import { axe } from '../../../../tests/a11y/axe-helper';
import { MockupClientSelector } from '../MockupClientSelector';

expect.extend(toHaveNoViolations);

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

// A busca real vai ao CRM externo — mockamos só o hook; a busca fuzzy roda de verdade.
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

function renderSelector(
  selectedClient: React.ComponentProps<typeof MockupClientSelector>['selectedClient'] = null,
) {
  const onClientSelect = vi.fn();
  const utils = render(
    <MockupClientSelector selectedClient={selectedClient} onClientSelect={onClientSelect} />,
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

  it('ArrowDown aponta aria-activedescendant para o option ativo', async () => {
    const user = userEvent.setup();
    renderSelector();

    const { input, listbox } = await openListbox(user);
    const options = within(listbox).getAllByRole('option');

    await user.keyboard('{ArrowDown}');
    expect(input).toHaveAttribute('aria-activedescendant', options[0].id);

    await user.keyboard('{ArrowDown}');
    expect(input).toHaveAttribute('aria-activedescendant', options[1].id);

    await user.keyboard('{ArrowUp}');
    expect(input).toHaveAttribute('aria-activedescendant', options[0].id);
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
    expect(results).toHaveNoViolations();
    cleanup();
  });
});

describe('MockupClientSelector — remover empresa', () => {
  const selectedClient = {
    id: 'c1',
    name: 'Alfa Brindes',
    ramo: 'Brindes corporativos',
    cnpj: '12345678000199',
  };

  it('expõe botão com nome acessível "Remover empresa" (não remove no 1º clique)', async () => {
    const user = userEvent.setup();
    const { onClientSelect } = renderSelector(selectedClient);

    const removeBtn = screen.getByRole('button', { name: 'Remover empresa' });
    await user.click(removeBtn);

    // O clique abre a confirmação; o cliente NÃO é removido direto.
    expect(onClientSelect).not.toHaveBeenCalled();
    const dialog = await screen.findByRole('alertdialog');
    expect(dialog).toHaveAccessibleName(/remover empresa/i);
  });

  it('confirmar remove a empresa selecionada', async () => {
    const user = userEvent.setup();
    const { onClientSelect } = renderSelector(selectedClient);

    await user.click(screen.getByRole('button', { name: 'Remover empresa' }));
    await screen.findByRole('alertdialog');

    await user.click(screen.getByTestId('mockup-client-remove-confirm-yes'));

    expect(onClientSelect).toHaveBeenCalledTimes(1);
    expect(onClientSelect).toHaveBeenCalledWith(null);
  });

  it('cancelar mantém a empresa selecionada', async () => {
    const user = userEvent.setup();
    const { onClientSelect } = renderSelector(selectedClient);

    await user.click(screen.getByRole('button', { name: 'Remover empresa' }));
    await screen.findByRole('alertdialog');

    await user.click(screen.getByTestId('mockup-client-remove-confirm-no'));

    expect(onClientSelect).not.toHaveBeenCalled();
  });
});
