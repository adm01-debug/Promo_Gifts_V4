import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TooltipProvider } from '@/components/ui/tooltip';

const h = vi.hoisted(() => ({
  navigate: vi.fn(),
  trackSearch: vi.fn(),
  addToHistory: vi.fn(),
  removeFromHistory: vi.fn(),
  clearHistory: vi.fn(),
  speech: { isListening: false, transcript: '', isSupported: true },
  suggestions: [] as Array<{ type: string; id: string; label: string; sublabel?: string; icon?: string }>,
  history: [] as string[],
}));

vi.mock('react-router-dom', () => ({ useNavigate: () => h.navigate }));
vi.mock('@/hooks/products', () => ({ useProductAnalytics: () => ({ trackSearch: h.trackSearch }) }));
vi.mock('@/hooks/intelligence', () => ({ useSpeechRecognition: () => h.speech }));
vi.mock('@/hooks/common', async () => {
  const { useState } = await import('react');
  return {
    useSearch: () => {
      const [query, setQuery] = useState('');
      return {
        query,
        setQuery,
        suggestions: h.suggestions,
        quickSuggestions: [
          { label: 'Canetas', icon: '🖊️' },
          { label: 'Bonés', icon: '🧢' },
        ],
        history: h.history,
        addToHistory: h.addToHistory,
        removeFromHistory: h.removeFromHistory,
        clearHistory: h.clearHistory,
      };
    },
  };
});
vi.mock('../VisualSearchButton', () => ({
  VisualSearchButton: ({ onResultsFound }: { onResultsFound: (p: unknown[], a: unknown) => void }) => (
    <button type="button" onClick={() => onResultsFound([{ id: 'v1' }], { productType: 'caneca' })}>
      visual-mock
    </button>
  ),
}));
vi.mock('../VoiceSearchOverlayConnected', () => ({
  default: ({ onClose, onAction }: { onClose: () => void; onAction: (a: unknown) => void }) => (
    <div data-testid="voice-overlay">
      <button onClick={() => onAction({ action: 'search', response: '', data: { query: 'boné azul' } })}>
        voz-buscar
      </button>
      <button
        onClick={() =>
          onAction({ action: 'filter', response: '', data: { filters: { category: 'canecas', color: 'azul' } } })
        }
      >
        voz-filtrar
      </button>
      <button onClick={() => onAction({ action: 'navigate', response: '', data: { route: '/kits' } })}>
        voz-navegar
      </button>
      <button onClick={() => onAction({ action: 'clear', response: '' })}>voz-limpar</button>
      <button onClick={() => onAction({ action: 'answer', response: '' })}>voz-responder</button>
      <button onClick={onClose}>voz-fechar</button>
    </div>
  ),
}));

import { AdvancedSearch } from '../AdvancedSearch';

function setup(props: Partial<React.ComponentProps<typeof AdvancedSearch>> = {}) {
  const onSearch = vi.fn();
  const onVisualSearchResults = vi.fn();
  render(
    <TooltipProvider>
      <AdvancedSearch onSearch={onSearch} onVisualSearchResults={onVisualSearchResults} {...props} />
    </TooltipProvider>,
  );
  const input = screen.getByRole('searchbox');
  return { onSearch, onVisualSearchResults, input };
}

describe('AdvancedSearch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    h.speech = { isListening: false, transcript: '', isSupported: true };
    h.suggestions = [];
    h.history = [];
  });

  it('abre sugestões populares ao focar e busca pela sugestão', () => {
    h.history = ['caneca'];
    const { input, onSearch } = setup();
    fireEvent.focus(input);
    expect(screen.getByText('Sugestões populares')).toBeInTheDocument();
    expect(screen.getByText('Buscas recentes')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Limpar'));
    expect(h.clearHistory).toHaveBeenCalled();
    fireEvent.click(screen.getByText(/Bonés/));
    expect(h.addToHistory).toHaveBeenCalledWith('Bonés');
    expect(onSearch).toHaveBeenCalledWith('Bonés');
    expect(screen.queryByText('Sugestões populares')).not.toBeInTheDocument();
  });

  it('submete o formulário registrando histórico e analytics', () => {
    h.suggestions = [
      { type: 'product', id: 'p1', label: 'Caneca', icon: '☕' },
      { type: 'category', id: 'c1', label: 'Canecas', sublabel: '12 itens' },
    ];
    const { input, onSearch } = setup();
    fireEvent.change(input, { target: { value: 'caneca' } });
    fireEvent.submit(input.closest('form') as HTMLFormElement);
    expect(onSearch).toHaveBeenCalledWith('caneca');
    expect(h.trackSearch).toHaveBeenCalledWith({ searchTerm: 'caneca', resultsCount: 1 });
  });

  it('não submete consulta vazia', () => {
    const { input, onSearch } = setup();
    fireEvent.submit(input.closest('form') as HTMLFormElement);
    expect(onSearch).not.toHaveBeenCalled();
  });

  it('mostra mensagem quando não há sugestões para a consulta e limpa', () => {
    const { input } = setup();
    fireEvent.change(input, { target: { value: 'xyz' } });
    expect(screen.getByText('Nenhum resultado para "xyz"')).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Fechar'));
    expect(input).toHaveValue('');
  });

  it('seleciona cada tipo de sugestão navegando para a rota certa', () => {
    h.suggestions = [
      { type: 'product', id: 'p1', label: 'Caneca' },
      { type: 'category', id: 'c1', label: 'Canecas' },
      { type: 'supplier', id: 's1', label: 'Fornecedor X' },
      { type: 'history', id: 'h1', label: 'caneca antiga' },
    ];
    const { input, onSearch } = setup();
    fireEvent.change(input, { target: { value: 'can' } });
    const open = () => fireEvent.focus(input);

    open();
    fireEvent.click(screen.getByText('Caneca'));
    expect(h.navigate).toHaveBeenLastCalledWith('/produto/p1');
    open();
    fireEvent.click(screen.getByText('Canecas'));
    expect(h.navigate).toHaveBeenLastCalledWith('/filtros?categoria=c1');
    open();
    fireEvent.click(screen.getByText('Fornecedor X'));
    expect(h.navigate).toHaveBeenLastCalledWith('/filtros?fornecedor=s1');
    open();
    fireEvent.click(screen.getByText('caneca antiga'));
    expect(onSearch).toHaveBeenCalledWith('caneca antiga');
    expect(h.addToHistory).toHaveBeenCalledTimes(3);
  });

  it('remove item de histórico sem selecioná-lo', () => {
    h.suggestions = [{ type: 'history', id: 'h1', label: 'velha' }];
    const { input, onSearch } = setup();
    fireEvent.change(input, { target: { value: 've' } });
    const removeButtons = screen.getAllByLabelText('Fechar');
    fireEvent.click(removeButtons[removeButtons.length - 1]);
    expect(h.removeFromHistory).toHaveBeenCalledWith('velha');
    expect(onSearch).not.toHaveBeenCalled();
  });

  it('teclado: setas, Enter seleciona e Escape fecha', () => {
    h.suggestions = [
      { type: 'product', id: 'p1', label: 'Caneca' },
      { type: 'product', id: 'p2', label: 'Copo' },
    ];
    const { input, onSearch } = setup();
    fireEvent.keyDown(input, { key: 'ArrowDown' }); // fechado: ignora
    fireEvent.change(input, { target: { value: 'c' } });
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'ArrowUp' });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(h.navigate).toHaveBeenCalledWith('/produto/p1');

    fireEvent.change(input, { target: { value: 'co' } });
    fireEvent.keyDown(input, { key: 'ArrowUp' });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onSearch).toHaveBeenCalledWith('co');

    fireEvent.focus(input);
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(screen.queryByText('Copo')).not.toBeInTheDocument();
  });

  it('clique fora fecha o dropdown', () => {
    const { input } = setup();
    fireEvent.focus(input);
    expect(screen.getByText('Sugestões populares')).toBeInTheDocument();
    fireEvent.mouseDown(document.body);
    expect(screen.queryByText('Sugestões populares')).not.toBeInTheDocument();
  });

  it('repassa resultados da busca visual', () => {
    const { onVisualSearchResults } = setup();
    fireEvent.click(screen.getByText('visual-mock'));
    expect(onVisualSearchResults).toHaveBeenCalledWith([{ id: 'v1' }], { productType: 'caneca' });
  });

  it('exibe transcrição enquanto ouve e esconde microfone sem suporte', () => {
    h.speech = { isListening: true, transcript: 'falando', isSupported: false };
    setup();
    expect(screen.getByPlaceholderText('Ouvindo...')).toHaveValue('falando');
    expect(screen.queryByLabelText('Microfone')).not.toBeInTheDocument();
  });

  it('overlay de voz executa ações de busca, filtro, navegação e limpeza', async () => {
    const { input, onSearch } = setup();
    const openVoice = async () => {
      fireEvent.click(screen.getByLabelText('Microfone'));
      return screen.findByTestId('voice-overlay');
    };

    await openVoice();
    fireEvent.click(screen.getByText('voz-buscar'));
    expect(onSearch).toHaveBeenCalledWith('boné azul');
    expect(input).toHaveValue('boné azul');
    expect(screen.queryByTestId('voice-overlay')).not.toBeInTheDocument();

    await openVoice();
    fireEvent.click(screen.getByText('voz-filtrar'));
    expect(onSearch).toHaveBeenLastCalledWith('canecas azul');

    await openVoice();
    fireEvent.click(screen.getByText('voz-navegar'));
    expect(h.navigate).toHaveBeenCalledWith('/kits');

    await openVoice();
    fireEvent.click(screen.getByText('voz-responder'));
    expect(screen.getByTestId('voice-overlay')).toBeInTheDocument();
    fireEvent.click(screen.getByText('voz-limpar'));
    expect(input).toHaveValue('');

    await openVoice();
    fireEvent.click(screen.getByText('voz-fechar'));
    expect(screen.queryByTestId('voice-overlay')).not.toBeInTheDocument();
  });
});
