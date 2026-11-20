import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Command, CommandInput, CommandList } from '@/components/ui/command';
import { GlobalSearchIdleState } from '../GlobalSearchIdleState';

type Props = React.ComponentProps<typeof GlobalSearchIdleState>;

function setup() {
  const props: Props = {
    history: ['caneca azul'],
    popularProducts: [
      {
        id: 'p1',
        name: 'Caneca Top',
        sku: 'C-1',
        view_count: 99,
        image_url: 'https://x/1.jpg',
        category_name: 'Canecas',
      },
    ],
    contextualSuggestions: [{ id: 's1', text: 'Canetas', icon: '🖊️', type: 'filter' }],
    quickSuggestions: [{ label: 'Garrafas', icon: '🧴' }],
    routeContext: { section: 'products' },
    quickActionsData: [
      {
        id: 'a1',
        title: 'Orçamentos',
        description: 'Lista',
        icon: <span>o</span>,
        href: '/orcamentos',
        highlight: true,
      },
    ],
    onSuggestionClick: vi.fn(),
    onSelect: vi.fn(),
    onRemoveFromHistory: vi.fn(),
  };
  render(
    <Command>
      <CommandInput placeholder="Buscar" />
      <CommandList>
        <GlobalSearchIdleState {...props} />
      </CommandList>
    </Command>,
  );
  return props;
}

describe('GlobalSearchIdleState — regressão appendChild (cmdk reorder)', () => {
  it('não lança TypeError ao digitar o primeiro caractere (idle state ainda montado)', () => {
    setup();
    const input = screen.getByLabelText('Buscar');
    expect(() => {
      fireEvent.change(input, { target: { value: 'c' } });
    }).not.toThrow();
  });
});
