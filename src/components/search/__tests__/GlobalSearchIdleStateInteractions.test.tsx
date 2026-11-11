import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Command } from '@/components/ui/command';
import { GlobalSearchIdleState } from '../GlobalSearchIdleState';

type Props = React.ComponentProps<typeof GlobalSearchIdleState>;

function setup(over: Partial<Props> = {}) {
  const props: Props = {
    history: ['caneca azul', 'boné'],
    popularProducts: [
      { id: 'p1', name: 'Caneca Top', sku: 'C-1', view_count: 99, image_url: 'https://x/1.jpg', category_name: 'Canecas' },
      { id: 'p2', name: 'Copo', sku: 'C-2', view_count: 10, image_url: 'https://x/2.jpg' },
    ],
    contextualSuggestions: [
      { id: 's1', text: 'Canetas baratas', icon: '🖊️', type: 'filter' },
      { id: 's2', text: 'Ir para kits', icon: '📦', type: 'navigation' },
      { id: 's3', text: 'Novo orçamento', icon: '➕', type: 'action' },
      { id: 's4', text: 'mochila', icon: '🔎', type: 'search' },
    ],
    quickSuggestions: [{ label: 'Garrafas', icon: '🧴' }],
    routeContext: { section: 'products' },
    quickActionsData: [
      { id: 'a1', title: 'Orçamentos', description: 'Lista', icon: <span>o</span>, href: '/orcamentos', highlight: true },
      { id: 'a2', title: 'Clientes', description: 'CRM', icon: <span>c</span>, href: '/clientes' },
    ],
    onSuggestionClick: vi.fn(),
    onSelect: vi.fn(),
    onRemoveFromHistory: vi.fn(),
    ...over,
  };
  render(
    <Command>
      <GlobalSearchIdleState {...props} />
    </Command>,
  );
  return props;
}

describe('GlobalSearchIdleState — interações', () => {
  it('renderiza todas as seções com contagens', () => {
    setup();
    expect(screen.getByText('Recentes')).toBeInTheDocument();
    expect(screen.getByText('Mais Populares')).toBeInTheDocument();
    expect(screen.getByText('Para o Catálogo')).toBeInTheDocument();
    expect(screen.getByText('Atalhos')).toBeInTheDocument();
    expect(screen.getByText('Ir Para')).toBeInTheDocument();
    expect(screen.getByText('2º')).toBeInTheDocument();
    expect(screen.getByText('• Canecas')).toBeInTheDocument();
  });

  it('clicar no histórico aplica o termo; botão X remove', () => {
    const props = setup();
    fireEvent.click(screen.getByText('caneca azul'));
    expect(props.onSuggestionClick).toHaveBeenCalledWith('caneca azul');
    fireEvent.click(screen.getByLabelText('Remover "boné" do histórico'));
    expect(props.onRemoveFromHistory).toHaveBeenCalledWith(expect.anything(), 'boné');
  });

  it('produto popular e cartão de navegação chamam onSelect sem histórico', () => {
    const props = setup();
    fireEvent.click(screen.getByText('Copo'));
    expect(props.onSelect).toHaveBeenCalledWith('/produto/p2', false);
    fireEvent.click(screen.getByText('Clientes'));
    expect(props.onSelect).toHaveBeenCalledWith('/clientes', false);
  });

  it('sugestões contextuais e atalhos disparam busca', () => {
    const props = setup();
    fireEvent.click(screen.getByLabelText('Buscar Ir para kits'));
    fireEvent.click(screen.getByLabelText('Buscar Garrafas'));
    expect(props.onSuggestionClick).toHaveBeenCalledWith('Ir para kits');
    expect(props.onSuggestionClick).toHaveBeenCalledWith('Garrafas');
  });

  it('troca o título das sugestões pelo contexto da rota e omite seções vazias', () => {
    setup({ routeContext: { section: 'quotes' }, history: [], popularProducts: [], quickSuggestions: [] });
    expect(screen.getByText('Para Orçamentos')).toBeInTheDocument();
    expect(screen.queryByText('Recentes')).not.toBeInTheDocument();
    expect(screen.queryByText('Mais Populares')).not.toBeInTheDocument();
    expect(screen.queryByText('Atalhos')).not.toBeInTheDocument();
  });

  it('usa título genérico fora de produtos/orçamentos e troca imagem quebrada', () => {
    setup({ routeContext: { section: 'home' } });
    expect(screen.getByText('Sugestões')).toBeInTheDocument();
    const img = screen.getByAltText('Copo') as HTMLImageElement;
    fireEvent.error(img);
    expect(img.getAttribute('src')).toBe('/placeholder.svg');
  });
});
