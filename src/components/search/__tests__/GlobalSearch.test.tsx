import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const h = vi.hoisted(() => ({
  navigate: vi.fn(),
  rpc: vi.fn(),
}));

vi.mock('react-router-dom', () => ({ useNavigate: () => h.navigate }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { rpc: h.rpc } }));
vi.mock('@/lib/logger', () => ({ logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn() } }));

import { GlobalSearch } from '../GlobalSearch';

const ROWS = [
  {
    result_id: 'p1',
    result_type: 'product',
    result_title: 'Caneca Térmica',
    result_description: 'Inox 500ml',
    result_url: '/produto/p1',
    result_image_url: null,
    result_metadata: { price: 49.9, stock: 12 },
    result_relevance: 0.9,
  },
  {
    result_id: 'q1',
    result_type: 'quote',
    result_title: 'ORC-0001',
    result_description: null,
    result_url: '/orcamentos/q1',
    result_image_url: null,
    result_metadata: { status: 'enviado', total: 1200 },
    result_relevance: 0.5,
  },
  {
    result_id: 'x1',
    result_type: 'unknown',
    result_title: 'Página misteriosa',
    result_description: null,
    result_url: '/x',
    result_image_url: null,
    result_metadata: null,
    result_relevance: 0.1,
  },
];

function setup(isOpen = true) {
  const onClose = vi.fn();
  const utils = render(<GlobalSearch isOpen={isOpen} onClose={onClose} />);
  return { onClose, ...utils };
}

describe('GlobalSearch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    h.rpc.mockResolvedValue({ data: ROWS, error: null });
  });

  it('não renderiza nada quando fechado', () => {
    const { container } = setup(false);
    expect(container).toBeEmptyDOMElement();
  });

  it('mostra ações rápidas e histórico salvo quando a consulta está vazia', () => {
    localStorage.setItem(
      'search-history',
      JSON.stringify([{ query: 'caneca', timestamp: 1, resultCount: 3 }]),
    );
    setup();
    expect(screen.getByText('Ações rápidas')).toBeInTheDocument();
    expect(screen.getByText('Novo Orçamento')).toBeInTheDocument();
    expect(screen.getByText('caneca')).toBeInTheDocument();
    expect(screen.getByText('3 resultados')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Limpar'));
    expect(screen.queryByText('Buscas recentes')).not.toBeInTheDocument();
    expect(localStorage.getItem('search-history')).toBeNull();
  });

  it('ignora histórico corrompido no localStorage', () => {
    localStorage.setItem('search-history', '{nao-json');
    setup();
    expect(screen.queryByText('Buscas recentes')).not.toBeInTheDocument();
    expect(localStorage.getItem('search-history')).toBeNull();
  });

  it('busca via RPC e renderiza resultados com metadados formatados', async () => {
    setup();
    fireEvent.change(screen.getByPlaceholderText('Busque por produtos, orçamentos...'), {
      target: { value: 'caneca' },
    });
    expect(await screen.findByText('Caneca Térmica')).toBeInTheDocument();
    expect(h.rpc).toHaveBeenCalledWith('fn_global_search', {
      p_term: 'caneca',
      p_limit: 12,
      p_types: ['product', 'quote'],
    });
    expect(screen.getByText('Inox 500ml')).toBeInTheDocument();
    expect(screen.getByText('R$ 49,90')).toBeInTheDocument();
    expect(screen.getByText('12 un')).toBeInTheDocument();
    expect(screen.getByText('enviado')).toBeInTheDocument();
    expect(screen.getByText('Página')).toBeInTheDocument();
  });

  it('clicar num resultado salva histórico, navega e fecha', async () => {
    const { onClose } = setup();
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'caneca' } });
    fireEvent.click(await screen.findByText('ORC-0001'));
    expect(h.navigate).toHaveBeenCalledWith('/orcamentos/q1');
    expect(onClose).toHaveBeenCalled();
    const saved = JSON.parse(localStorage.getItem('search-history') ?? '[]');
    expect(saved[0]).toMatchObject({ query: 'caneca', resultCount: 3 });
  });

  it('filtro restringe os tipos enviados ao RPC e alterna', async () => {
    setup();
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'orc' } });
    await screen.findByText('ORC-0001');
    fireEvent.click(screen.getByRole('button', { name: 'Orçamentos' }));
    await waitFor(() =>
      expect(h.rpc).toHaveBeenLastCalledWith('fn_global_search', expect.objectContaining({ p_types: ['quote'] })),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Orçamentos' }));
    await waitFor(() =>
      expect(h.rpc).toHaveBeenLastCalledWith(
        'fn_global_search',
        expect.objectContaining({ p_types: ['product', 'quote'] }),
      ),
    );
  });

  it('mostra estado vazio quando não há resultados e em caso de erro', async () => {
    h.rpc.mockResolvedValue({ data: null, error: new Error('boom') });
    setup();
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'nada' } });
    expect(await screen.findByText(/Nenhum resultado para/)).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Fechar'));
    expect(screen.getByRole('textbox')).toHaveValue('');
  });

  it('navegação por teclado entre ações rápidas e resultados', async () => {
    const { onClose } = setup();
    fireEvent.keyDown(document, { key: 'ArrowDown' });
    fireEvent.keyDown(document, { key: 'ArrowDown' });
    fireEvent.keyDown(document, { key: 'ArrowUp' });
    fireEvent.keyDown(document, { key: 'Enter' });
    expect(h.navigate).toHaveBeenCalledWith('/filtros');
    expect(onClose).toHaveBeenCalledTimes(1);

    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'caneca' } });
    await screen.findByText('Caneca Térmica');
    fireEvent.keyDown(document, { key: 'ArrowDown' });
    fireEvent.keyDown(document, { key: 'Enter' });
    expect(h.navigate).toHaveBeenLastCalledWith('/orcamentos/q1');

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(3);
  });

  it('clicar no fundo ou numa ação rápida fecha', () => {
    const { onClose, container } = setup();
    fireEvent.click(screen.getByText('Dashboard'));
    expect(h.navigate).toHaveBeenCalledWith('/bi');
    fireEvent.click(container.querySelector('.fixed.inset-0')!);
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('clicar num item do histórico preenche a consulta', async () => {
    localStorage.setItem('search-history', JSON.stringify([{ query: 'boné', timestamp: 1, resultCount: 1 }]));
    setup();
    fireEvent.click(screen.getByText('boné'));
    expect(screen.getByRole('textbox')).toHaveValue('boné');
    await screen.findByText('Caneca Térmica');
  });
});
