import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { EmptySearchState, pushRecentSearch } from '../EmptySearchState';

const KEY = 'global-search-history-v2';

describe('EmptySearchState', () => {
  beforeEach(() => localStorage.clear());

  it('oferece ações com a consulta codificada', () => {
    const onAction = vi.fn();
    const onRefine = vi.fn();
    render(<EmptySearchState query="caneca & copo" onAction={onAction} onRefine={onRefine} onPickRecent={vi.fn()} />);
    expect(screen.getByText('"caneca & copo"')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Buscar no catálogo'));
    expect(onAction).toHaveBeenCalledWith('/?q=caneca%20%26%20copo');
    fireEvent.click(screen.getByText('Criar orçamento para "caneca & copo"'));
    expect(onAction).toHaveBeenCalledWith('/orcamentos/novo?client=caneca%20%26%20copo');
    fireEvent.click(screen.getByText('Refinar busca'));
    expect(onRefine).toHaveBeenCalled();
    expect(screen.queryByText('Buscas recentes')).not.toBeInTheDocument();
  });

  it('lista buscas recentes do histórico unificado', () => {
    localStorage.setItem(
      KEY,
      JSON.stringify([
        { id: 'history-boné', label: 'boné', type: 'general', timestamp: 1 },
        { id: 'p', label: 'produto', type: 'product', timestamp: 2 },
        null,
      ]),
    );
    const onPickRecent = vi.fn();
    render(<EmptySearchState query="x" onAction={vi.fn()} onRefine={vi.fn()} onPickRecent={onPickRecent} />);
    expect(screen.getByText('Buscas recentes')).toBeInTheDocument();
    expect(screen.queryByText('produto')).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('boné'));
    expect(onPickRecent).toHaveBeenCalledWith('boné');
  });

  it('ignora histórico inválido', () => {
    localStorage.setItem(KEY, '{quebrado');
    render(<EmptySearchState query="x" onAction={vi.fn()} onRefine={vi.fn()} onPickRecent={vi.fn()} />);
    expect(screen.queryByText('Buscas recentes')).not.toBeInTheDocument();
    localStorage.setItem(KEY, JSON.stringify({ nao: 'array' }));
    render(<EmptySearchState query="y" onAction={vi.fn()} onRefine={vi.fn()} onPickRecent={vi.fn()} />);
    expect(screen.queryByText('Buscas recentes')).not.toBeInTheDocument();
  });
});

describe('pushRecentSearch', () => {
  beforeEach(() => localStorage.clear());

  it('ignora termos curtos', () => {
    pushRecentSearch(' a ');
    expect(localStorage.getItem(KEY)).toBeNull();
  });

  it('insere no topo, deduplica sem diferenciar maiúsculas e avisa ouvintes', () => {
    const listener = vi.fn();
    window.addEventListener('search-history-update', listener);
    pushRecentSearch('Caneca');
    pushRecentSearch('boné');
    pushRecentSearch(' caneca ');
    const items = JSON.parse(localStorage.getItem(KEY) ?? '[]');
    expect(items.map((i: { label: string }) => i.label)).toEqual(['caneca', 'boné']);
    expect(items[0]).toMatchObject({ id: 'history-caneca', type: 'general' });
    expect(listener).toHaveBeenCalledTimes(3);
    window.removeEventListener('search-history-update', listener);
  });

  it('não quebra com histórico corrompido', () => {
    localStorage.setItem(KEY, '{x');
    expect(() => pushRecentSearch('caneca')).not.toThrow();
  });
});
