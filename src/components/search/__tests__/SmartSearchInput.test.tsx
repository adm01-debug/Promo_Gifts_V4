import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { TooltipProvider } from '@/components/ui/tooltip';

type Result = {
  type: 'category' | 'history' | 'product' | 'supplier';
  id: string;
  label: string;
  sublabel?: string;
  icon?: string;
  data?: Record<string, unknown>;
};

const h = vi.hoisted(() => ({
  navigate: vi.fn(),
  clearHistory: vi.fn(),
  addToHistory: vi.fn(),
  removeFromHistory: vi.fn(),
  suggestions: [] as Result[],
  quickSuggestions: [] as Result[],
  history: [] as Array<{ id: string; label: string; type: string }>,
  totalProductMatches: 0,
  isListening: false,
  onVoiceResult: null as null | ((t: string) => void),
}));

vi.mock('react-router-dom', () => ({ useNavigate: () => h.navigate }));
vi.mock('@/hooks/products', () => ({}));
vi.mock('@/hooks/intelligence', () => ({
  useSpeechRecognition: ({ onResult }: { onResult: (t: string) => void }) => {
    h.onVoiceResult = onResult;
    return { isListening: h.isListening };
  },
}));
vi.mock('@/components/ui/OptimizedImage', () => ({
  OptimizedImage: ({ src }: { src: string }) => <img src={src} alt="thumb" />,
}));
vi.mock('@/hooks/common', async () => {
  const { useState } = await import('react');
  return {
    useDebounce: <T,>(v: T) => v,
    useSearch: () => {
      const [query, setQuery] = useState('');
      return {
        query,
        setQuery,
        suggestions: h.suggestions,
        quickSuggestions: h.quickSuggestions,
        clearHistory: h.clearHistory,
        totalProductMatches: h.totalProductMatches,
      };
    },
    useSearchHistory: () => ({
      history: h.history,
      addToHistory: h.addToHistory,
      removeFromHistory: h.removeFromHistory,
    }),
  };
});

import { SmartSearchInput } from '../SmartSearchInput';

function btn(text: string) {
  const found = screen.getAllByRole('button').find((b) => b.textContent?.includes(text));
  if (!found) throw new Error(`botão com texto "${text}" não encontrado`);
  return found;
}

function setup(props: Partial<React.ComponentProps<typeof SmartSearchInput>> = {}) {
  render(
    <TooltipProvider>
      <SmartSearchInput {...props} />
    </TooltipProvider>,
  );
  return screen.getByRole('combobox');
}

describe('SmartSearchInput', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    h.suggestions = [];
    h.quickSuggestions = [{ type: 'category', id: 'cat-1', label: 'Canecas', icon: '☕' }];
    h.history = [];
    h.totalProductMatches = 0;
    h.isListening = false;
  });

  it('mostra histórico e sugestões populares ao focar sem consulta', () => {
    h.history = [
      { id: 'history-caneca', label: 'caneca', type: 'general' },
      { id: 'history-bone', label: 'boné', type: 'general' },
    ];
    const input = setup();
    fireEvent.focus(input);
    expect(input).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('Buscas Recentes')).toBeInTheDocument();
    expect(screen.getByText('Sugestões Populares')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Limpar'));
    expect(h.clearHistory).toHaveBeenCalled();

    const row = screen.getByText('boné').parentElement as HTMLElement;
    fireEvent.click(within(row).getByRole('button'));
    expect(h.removeFromHistory).toHaveBeenCalledWith('history-bone');

    fireEvent.click(screen.getByText('caneca'));
    expect(h.navigate).toHaveBeenCalledWith('/?search=caneca');
  });

  it('sugestão popular de categoria navega com filtro de categoria', () => {
    const input = setup();
    fireEvent.focus(input);
    fireEvent.click(screen.getByText(/Canecas/));
    expect(h.addToHistory).toHaveBeenCalledWith({ id: 'history-Canecas', label: 'Canecas', type: 'general' });
    expect(h.navigate).toHaveBeenCalledWith('/?categoria=cat-1');
  });

  it('agrupa resultados por tipo com destaque e navega ao clicar', () => {
    h.suggestions = [
      { type: 'product', id: 'p1', label: 'Caneca Azul', sublabel: 'SKU 1', data: { featured: true, images: ['https://cdn/x.jpg'] } },
      { type: 'product', id: 'p2', label: 'Caneca Verde' },
      { type: 'category', id: 'c1', label: 'Canecas' },
      { type: 'supplier', id: 's1', label: 'Fornecedor Caneca' },
    ];
    const input = setup();
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'caneca' } });
    expect(screen.getByText('4 sugestões')).toBeInTheDocument();
    expect(screen.getByText('Produtos (2)')).toBeInTheDocument();
    expect(screen.getByText('Categorias (1)')).toBeInTheDocument();
    expect(screen.getByText('Fornecedores (1)')).toBeInTheDocument();
    expect(screen.getByText('Destaque')).toBeInTheDocument();
    expect(screen.getByAltText('thumb')).toBeInTheDocument();

    fireEvent.mouseEnter(btn('Caneca Verde'));
    fireEvent.click(btn('Fornecedor Caneca'));
    expect(h.navigate).toHaveBeenCalledWith('/?fornecedor=s1');
  });

  it('teclado navega e Enter seleciona; sem seleção busca o texto', () => {
    h.suggestions = [
      { type: 'product', id: 'p1', label: 'Caneca' },
      { type: 'category', id: 'c1', label: 'Copos' },
    ];
    const onSearch = vi.fn();
    const input = setup({ onSearch });
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'c' } });
    fireEvent.keyDown(input, { key: 'ArrowUp' }); // vai para o último
    fireEvent.keyDown(input, { key: 'ArrowDown' }); // volta para 0
    fireEvent.keyDown(input, { key: 'ArrowDown' }); // 1
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(h.navigate).toHaveBeenCalledWith('/?categoria=c1');

    fireEvent.change(input, { target: { value: 'termo livre' } });
    h.suggestions = [];
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onSearch).toHaveBeenCalledWith('termo livre');
    expect(h.addToHistory).toHaveBeenCalledWith({ id: 'history-termo livre', label: 'termo livre', type: 'general' });

    fireEvent.keyDown(input, { key: 'Escape' });
    expect(input).toHaveAttribute('aria-expanded', 'false');
  });

  it('onSelect customizado recebe o resultado em vez de navegar', () => {
    h.suggestions = [{ type: 'product', id: 'p1', label: 'Caneca' }];
    const onSelect = vi.fn();
    const input = setup({ onSelect });
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'can' } });
    fireEvent.click(btn('Caneca'));
    expect(onSelect).toHaveBeenCalledWith(h.suggestions[0]);
    expect(h.navigate).not.toHaveBeenCalled();
  });

  it('sem resultados oferece busca no catálogo e botão de lupa busca', async () => {
    h.quickSuggestions = [{ type: 'category', id: 'c', label: 'Bonés' }];
    const input = setup();
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'zzz' } });
    fireEvent.click(await screen.findByText(/no catálogo completo/));
    expect(h.navigate).toHaveBeenCalledWith('/?search=zzz');

    fireEvent.click(screen.getByLabelText('Buscar'));
    expect(h.navigate).toHaveBeenCalledTimes(2);
  });

  it('rodapé "ver todos" aparece quando há mais de 30 produtos', () => {
    h.suggestions = [{ type: 'product', id: 'p1', label: 'Caneca' }];
    h.totalProductMatches = 42;
    const onSearch = vi.fn();
    const input = setup({ onSearch });
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'caneca' } });
    fireEvent.click(screen.getByText('42').closest('button') as HTMLElement);
    expect(onSearch).toHaveBeenCalledWith('caneca');
  });

  it('botão limpar zera a consulta e avisa onSearch; clique fora fecha', () => {
    const onSearch = vi.fn();
    const input = setup({ onSearch });
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'abc' } });
    const clear = input.parentElement?.querySelector('.hover\\:bg-destructive\\/10') as HTMLElement;
    fireEvent.click(clear);
    expect(input).toHaveValue('');
    expect(onSearch).toHaveBeenCalledWith('');

    fireEvent.mouseDown(document.body);
    expect(input).toHaveAttribute('aria-expanded', 'false');
  });

  it('resultado de voz preenche a consulta', () => {
    const input = setup();
    React.act(() => h.onVoiceResult?.('caneca falada'));
    expect(input).toHaveValue('caneca falada');
  });
});
