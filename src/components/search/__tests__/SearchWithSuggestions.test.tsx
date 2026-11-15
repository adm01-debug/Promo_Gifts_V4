import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';

vi.mock('@/hooks/common', () => ({ useDebounce: <T,>(v: T) => v }));

import { SearchWithSuggestions } from '../SearchWithSuggestions';

class FakeRecognition {
  static instances: FakeRecognition[] = [];
  lang = '';
  continuous = true;
  interimResults = true;
  onstart: (() => void) | null = null;
  onend: (() => void) | null = null;
  onerror: (() => void) | null = null;
  onresult: ((e: unknown) => void) | null = null;
  start = vi.fn(() => this.onstart?.());
  abort = vi.fn();
  constructor() {
    FakeRecognition.instances.push(this);
  }
}

describe('SearchWithSuggestions', () => {
  beforeEach(() => {
    FakeRecognition.instances = [];
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete (window as unknown as Record<string, unknown>).webkitSpeechRecognition;
  });

  it('chama onSearch quando a consulta muda e limpa', () => {
    const onSearch = vi.fn();
    render(<SearchWithSuggestions onSearch={onSearch} isLoading />);
    const input = screen.getByRole('combobox');
    fireEvent.change(input, { target: { value: 'caneca' } });
    expect(onSearch).toHaveBeenCalledWith('caneca');
    fireEvent.click(screen.getByLabelText('Limpar busca'));
    expect(input).toHaveValue('');
    expect(onSearch).toHaveBeenLastCalledWith('');
  });

  it('mostra buscas recentes ao focar e seleciona por clique', () => {
    const onSearch = vi.fn();
    render(<SearchWithSuggestions onSearch={onSearch} recentSearches={['boné', 'caneca']} />);
    const input = screen.getByRole('combobox');
    fireEvent.focus(input);
    expect(screen.getByText('Buscas recentes')).toBeInTheDocument();
    expect(input).toHaveAttribute('aria-expanded', 'true');
    fireEvent.click(screen.getByRole('option', { name: 'caneca' }));
    expect(onSearch).toHaveBeenCalledWith('caneca');
    expect(input).toHaveValue('caneca');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('navega sugestões com teclado e seleciona com Enter', () => {
    const onSearch = vi.fn();
    render(<SearchWithSuggestions onSearch={onSearch} suggestions={['a1', 'a2', 'a3']} />);
    const input = screen.getByRole('combobox');
    fireEvent.change(input, { target: { value: 'a' } });
    fireEvent.focus(input);
    fireEvent.keyDown(input, { key: 'ArrowUp' }); // vai para o último
    expect(screen.getByRole('option', { name: 'a3' })).toHaveAttribute('aria-selected', 'true');
    fireEvent.keyDown(input, { key: 'ArrowDown' }); // volta ao primeiro
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'ArrowUp' });
    fireEvent.keyDown(input, { key: 'ArrowUp' }); // 0 -> último
    fireEvent.keyDown(input, { key: 'ArrowDown' }); // último -> 0
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onSearch).toHaveBeenLastCalledWith('a1');

    fireEvent.focus(input);
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('fecha o dropdown após o blur', () => {
    vi.useFakeTimers();
    try {
      render(<SearchWithSuggestions onSearch={vi.fn()} recentSearches={['x']} />);
      const input = screen.getByRole('combobox');
      fireEvent.focus(input);
      expect(screen.getByRole('listbox')).toBeInTheDocument();
      fireEvent.blur(input);
      act(() => vi.advanceTimersByTime(200));
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it('não mostra microfone sem suporte do navegador', () => {
    render(<SearchWithSuggestions onSearch={vi.fn()} enableVoice />);
    expect(screen.queryByLabelText('Buscar por voz')).not.toBeInTheDocument();
  });

  it('busca por voz preenche a consulta e aborta reconhecimento anterior', () => {
    vi.stubGlobal('webkitSpeechRecognition', FakeRecognition);
    const onSearch = vi.fn();
    render(<SearchWithSuggestions onSearch={onSearch} enableVoice />);

    fireEvent.click(screen.getByLabelText('Buscar por voz'));
    const first = FakeRecognition.instances[0];
    expect(first.lang).toBe('pt-BR');
    expect(first.start).toHaveBeenCalled();
    expect(screen.getByLabelText('Parar gravação')).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Parar gravação'));
    expect(first.abort).toHaveBeenCalled();
    const second = FakeRecognition.instances[1];

    act(() => second.onresult?.({ results: [[{ transcript: 'garrafa térmica' }]] }));
    expect(onSearch).toHaveBeenCalledWith('garrafa térmica');
    expect(screen.getByRole('combobox')).toHaveValue('garrafa térmica');

    act(() => second.onerror?.());
    expect(screen.getByLabelText('Buscar por voz')).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Buscar por voz'));
    act(() => FakeRecognition.instances[2].onend?.());
    expect(screen.getByLabelText('Buscar por voz')).toBeInTheDocument();
  });
});
