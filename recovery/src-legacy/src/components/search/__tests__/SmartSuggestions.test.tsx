import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SmartSuggestions, InlineSuggestions, SmartFilters } from '../SmartSuggestions';

describe('SmartSuggestions', () => {
  it('mostra esqueleto e depois as sugestões com cabeçalho e desconto', async () => {
    const onSelect = vi.fn();
    const { container } = render(<SmartSuggestions onSelect={onSelect} />);
    expect(container.querySelectorAll('.animate-pulse').length).toBe(4);

    expect(await screen.findByText('Caneta Esferográfica Touch')).toBeInTheDocument();
    expect(screen.getByText('Sugestões inteligentes')).toBeInTheDocument();
    expect(screen.getByText('-20%')).toBeInTheDocument();
    expect(screen.getByText('Visualizado há 2h')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Kit Executivo Premium'));
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: '2', type: 'recommended' }));
  });

  it('respeita maxItems e oculta o cabeçalho', async () => {
    const { container } = render(<SmartSuggestions maxItems={2} showHeader={false} />);
    expect(container.querySelectorAll('.animate-pulse').length).toBe(3);
    await screen.findByText('Kit Executivo Premium');
    expect(screen.queryByText('Sugestões inteligentes')).not.toBeInTheDocument();
    expect(screen.queryByText('Agenda 2025 Personalizada')).not.toBeInTheDocument();
    expect(screen.getAllByRole('button')).toHaveLength(2);
  });

  it('não renderiza nada quando maxItems é zero', async () => {
    const { container } = render(<SmartSuggestions maxItems={0} />);
    await vi.waitFor(() => expect(container.querySelector('.animate-pulse')).toBeNull());
    expect(container).toBeEmptyDOMElement();
  });
});

describe('InlineSuggestions', () => {
  it('não mostra nada para consultas curtas ou sem match', () => {
    const { container, rerender } = render(<InlineSuggestions query="c" onSelect={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
    rerender(<InlineSuggestions query="xyzwq" onSelect={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('sugere termos parecidos (fuzzy) e permite selecionar', () => {
    const onSelect = vi.fn();
    render(<InlineSuggestions query="caneta" onSelect={onSelect} />);
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
    expect(buttons.length).toBeLessThanOrEqual(5);
    fireEvent.click(screen.getByText('caneta personalizada'));
    expect(onSelect).toHaveBeenCalledWith('caneta personalizada');
  });
});

describe('SmartFilters', () => {
  it('ativa e desativa filtros sugeridos', () => {
    const onFilterChange = vi.fn();
    const { rerender } = render(
      <SmartFilters activeFilters={{}} onFilterChange={onFilterChange} />,
    );
    expect(screen.getByText('Filtros sugeridos')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Escritório'));
    expect(onFilterChange).toHaveBeenCalledWith('category', ['escritorio']);

    rerender(
      <SmartFilters activeFilters={{ price: ['0-10', 'x'] }} onFilterChange={onFilterChange} />,
    );
    const price = screen.getByText('Até R$ 10');
    expect(price.className).toContain('border-primary');
    expect(price).toHaveAttribute('title', 'Dentro do orçamento médio');
    fireEvent.click(price);
    expect(onFilterChange).toHaveBeenLastCalledWith('price', ['x']);
  });
});
