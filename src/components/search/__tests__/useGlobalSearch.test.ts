/**
 * Testes de comportamento do hook useGlobalSearch.
 * Rede (Supabase, edge functions, CRM, catálogo externo) e hooks externos são mockados.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';

// ── Estado compartilhado dos mocks ────────────────────────────────────────────
const h = vi.hoisted(() => {
  const state = {
    tableData: {} as Record<string, unknown[] | undefined>,
    tableErrors: new Set<string>(),
    calls: [] as Array<{ table: string; method: string; args: unknown[] }>,
    rerank: null as Array<{ id: string; score: number }> | null,
    userId: 'user-1' as string | null,
  };

  const makeBuilder = (table: string) => {
    const builder: Record<string, unknown> = {};
    const chain =
      (method: string) =>
      (...args: unknown[]) => {
        state.calls.push({ table, method, args });
        return builder;
      };
    for (const m of ['select', 'eq', 'or', 'ilike', 'order', 'limit', 'insert']) {
      builder[m] = chain(m);
    }
    builder.then = (resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) => {
      if (state.tableErrors.has(table))
        return Promise.reject(new Error(`fail ${table}`)).then(resolve, reject);
      return Promise.resolve({ data: state.tableData[table] ?? [], error: null }).then(
        resolve,
        reject,
      );
    };
    return builder;
  };

  return {
    state,
    makeBuilder,
    setOpen: vi.fn(),
    setVoiceOverlayOpen: vi.fn(),
    navigate: vi.fn(),
    openOracle: vi.fn(),
    addToHistory: vi.fn(),
    removeFromHistory: vi.fn(),
    clearHistory: vi.fn(),
    addCommand: vi.fn(),
    pushRecentSearch: vi.fn(),
    invokeEdge: vi.fn(),
    fetchPromobrindProducts: vi.fn(),
    searchCrm: vi.fn(),
    selectCrm: vi.fn(),
    unsubscribe: vi.fn(),
    authCallback: null as ((event: string) => void) | null,
    history: [] as Array<{ id: string; label: string }>,
    commandAction: vi.fn(),
    isGlobalAIMode: false,
  };
});

vi.mock('@/stores/useSearchStore', () => ({
  useSearchStore: () => ({
    open: true,
    setOpen: h.setOpen,
    voiceOverlayOpen: false,
    setVoiceOverlayOpen: h.setVoiceOverlayOpen,
  }),
}));

vi.mock('@/stores/oracleVoiceBridge', () => ({
  useOracleVoiceBridge: { getState: () => ({ openOracle: h.openOracle }) },
}));

vi.mock('@/stores/useWordMagicStore', () => ({
  useWordMagicStore: (sel: (s: { isGlobalAIMode: boolean }) => unknown) =>
    sel({ isGlobalAIMode: h.isGlobalAIMode }),
}));

vi.mock('react-router-dom', () => ({ useNavigate: () => h.navigate }));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (table: string) => h.makeBuilder(table),
    rpc: vi.fn(() => Promise.resolve({ data: h.state.rerank, error: null })),
    auth: {
      onAuthStateChange: (cb: (event: string) => void) => {
        h.authCallback = cb;
        return { data: { subscription: { unsubscribe: h.unsubscribe } } };
      },
      getUser: vi.fn(() =>
        Promise.resolve({ data: { user: h.state.userId ? { id: h.state.userId } : null } }),
      ),
    },
  },
}));

vi.mock('@/lib/supabase-untyped', () => ({
  untypedFrom: (table: string) => h.makeBuilder(table),
}));

vi.mock('../useQuickSuggestions', () => ({
  useQuickSuggestions: () => [{ label: 'Canetas', icon: '🖊️' }],
}));

vi.mock('../EmptySearchState', () => ({ pushRecentSearch: h.pushRecentSearch }));

vi.mock('@/hooks/common', () => ({
  useDebounce: <T>(v: T) => v,
  useSearchHistory: () => ({
    history: h.history,
    addToHistory: h.addToHistory,
    removeFromHistory: h.removeFromHistory,
    clearHistory: h.clearHistory,
  }),
}));

vi.mock('@/hooks/intelligence', () => ({
  useContextualSuggestions: () => ({ suggestions: [], routeContext: { section: 'home' } }),
  useVoiceCommandHistory: () => ({ addCommand: h.addCommand }),
}));

const COMMANDS = [
  {
    id: 'new-quote',
    command: '/orcamento',
    label: 'Novo orçamento',
    description: 'Cria um orçamento',
    icon: 'FileText',
    keywords: ['proposta'],
    action: h.commandAction,
  },
  {
    id: 'kits',
    command: '/kits',
    label: 'Abrir kits',
    description: 'Lista kits',
    icon: 'Box',
    keywords: [],
    action: vi.fn(),
  },
];
vi.mock('@/hooks/ui/useSlashCommands', () => ({
  useSlashCommands: () => ({ commands: COMMANDS }),
}));

vi.mock('@/lib/logger', () => ({
  logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));
vi.mock('@/lib/edge/safeInvokeCall', () => ({ invokeEdge: h.invokeEdge }));
vi.mock('@/lib/external-db', () => ({ fetchPromobrindProducts: h.fetchPromobrindProducts }));
vi.mock('@/lib/crm-db', () => ({ searchCrm: h.searchCrm, selectCrm: h.selectCrm }));

import { useGlobalSearch } from '../useGlobalSearch';
import { searchCache } from '../searchCache';
import { supabase } from '@/integrations/supabase/client';

function product(over: Record<string, unknown> = {}) {
  return {
    id: 'p1',
    name: 'Caneca Azul',
    sku: 'CAN-1',
    category_name: 'Canecas',
    base_price: 30,
    sale_price: null,
    colors: ['Azul'],
    ...over,
  };
}

function intentResponse(intent: Record<string, unknown>) {
  return { data: { success: true, intent: { filters: {}, keywords: [], ...intent } }, error: null };
}

async function runSearch(result: { current: ReturnType<typeof useGlobalSearch> }, q: string) {
  await act(async () => {
    await result.current.performSemanticSearch(q);
  });
}

describe('useGlobalSearch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    searchCache.clear();
    h.state.tableData = {};
    h.state.tableErrors = new Set();
    h.state.calls = [];
    h.state.rerank = null;
    h.state.userId = 'user-1';
    h.history = [];
    h.isGlobalAIMode = false;
    h.invokeEdge.mockResolvedValue({ data: null, error: null });
    h.fetchPromobrindProducts.mockResolvedValue([]);
    h.searchCrm.mockResolvedValue([]);
    h.selectCrm.mockResolvedValue([]);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('expõe estado inicial e sugestões rápidas', () => {
    const { result } = renderHook(() => useGlobalSearch());
    expect(result.current.query).toBe('');
    expect(result.current.results).toEqual([]);
    expect(result.current.quickSuggestions).toEqual([{ label: 'Canetas', icon: '🖊️' }]);
    expect(result.current.popularProducts).toEqual([]);
    expect(result.current.routeContext).toEqual({ section: 'home' });
    expect(result.current.searchError).toBe(false);
  });

  it('limpa resultados para consultas com menos de 3 caracteres sem chamar a IA', async () => {
    const { result } = renderHook(() => useGlobalSearch());
    await runSearch(result, 'ab');
    expect(h.invokeEdge).not.toHaveBeenCalled();
    expect(result.current.results).toEqual([]);
    expect(result.current.searchIntent).toBeNull();
  });

  it('busca mista monta resultados de produtos, clientes, orçamentos e tabelas auxiliares', async () => {
    h.fetchPromobrindProducts.mockResolvedValue([product()]);
    h.searchCrm.mockResolvedValue([
      { id: 'c1', razao_social: 'ACME LTDA', nome_fantasia: '', ramo: '' },
    ]);
    h.selectCrm.mockResolvedValue([
      { id: 'q1', quote_number: 'ORC-1', client_name: 'Acme', status: 'draft', total: 100 },
    ]);
    h.state.tableData = {
      collections: [{ id: 'col1', name: 'Natal', description: 'Coleção', icon: '🎄' }],
      expert_conversations: [{ id: 'conv1', title: 'Conversa caneca' }],
      category_icons: [
        { id: 'cat1', category_name: 'Canecas & Copos', description: null, icon: '☕' },
      ],
      custom_kits: [
        { id: 'k1', name: 'Kit caneca', status: 'ativo', total_price: null, kit_quantity: 2 },
      ],
      generated_mockups: [{ id: 'm1', product_name: null, technique_name: null }],
      art_file_attachments: [
        {
          id: 'a1',
          original_name: 'arte.pdf',
          notes: null,
          file_url: 'https://x/arte.pdf',
          quote_id: null,
        },
        { id: 'a2', original_name: 'logo.ai', notes: 'n', file_url: 'https://x/l', quote_id: 'q9' },
      ],
      cart_templates: [
        { id: 't1', name: 'Tpl', description: null, items: [1] },
        { id: 't2', name: 'Tpl2', description: 'd', items: null },
      ],
      magic_up_generations: [
        {
          id: 'mu1',
          client_name: null,
          product_name: null,
          scene_title: null,
          scene_category: 'praia',
          generated_image_url: 'img',
        },
      ],
      product_components: [
        {
          id: 'pc1',
          component_code: 'C1',
          component_name: 'Tampa',
          product_id: 'p1',
          is_personalizable: true,
        },
      ],
      component_media: [
        { id: 'cm1', title: null, media_type: 'video', url: 'https://v', product_id: null },
        { id: 'cm2', title: 'Foto', media_type: 'image', url: 'https://i', product_id: 'p1' },
      ],
    };

    const { result } = renderHook(() => useGlobalSearch());
    await runSearch(result, 'caneca');

    const byType = result.current.groupedResults;
    expect(byType.product[0]).toMatchObject({ title: 'Caneca Azul', href: '/produto/p1' });
    expect(byType.product[0].subtitle).toContain('SKU: CAN-1');
    expect(byType.client[0]).toMatchObject({
      title: 'ACME LTDA',
      subtitle: 'Empresa',
      href: '/cliente/c1',
    });
    expect(byType.quote[0]).toMatchObject({ title: 'ORC-1', href: '/orcamentos/q1' });
    expect(byType.collection[0]).toMatchObject({
      href: '/colecoes/col1',
      metadata: { icon: '🎄' },
    });
    expect(byType.conversation[0].href).toBe('/expert?conversation=conv1');
    expect(byType.category[0].href).toBe('/?category=Canecas%20%26%20Copos');
    expect(byType.kit[0].subtitle).toContain('2x');
    expect(byType.mockup[0]).toMatchObject({ title: 'Mockup', subtitle: '—' });
    expect(byType.art_file.map((a) => a.href)).toEqual(['https://x/arte.pdf', '/orcamentos/q9']);
    expect(byType.art_file[0].subtitle).toBe('Arquivo de arte');
    expect(byType.cart_template[0].subtitle).toBe('1 item • Template de carrinho');
    expect(byType.cart_template[1].subtitle).toBe('0 itens • d');
    expect(byType.cart_template.map((t) => t.href)).toEqual(['/carrinhos', '/carrinhos']);
    expect(byType.magic_up[0]).toMatchObject({ title: 'Magic Up', href: '/magic-up' });
    expect(byType.magic_up[0].subtitle).toBe('Sem cliente •  • praia');
    expect(byType.component[0].subtitle).toBe('Código: C1 • Personalizável');
    expect(byType.media[0]).toMatchObject({ title: 'Mídia sem título', href: 'https://v' });
    expect(byType.media[1].href).toBe('/produto/p1');
    expect(result.current.isSearching).toBe(false);
    expect(result.current.searchError).toBe(false);

    // resultado vai para o cache; analytics grava termo
    expect(searchCache.get('caneca')).toEqual(result.current.results);
    await waitFor(() =>
      expect(
        h.state.calls.some((c) => c.table === 'search_analytics' && c.method === 'insert'),
      ).toBe(true),
    );
  });

  it('usa o cache na segunda busca idêntica', async () => {
    const { result } = renderHook(() => useGlobalSearch());
    searchCache.set('cached', [{ id: 'x', title: 'Do cache', type: 'product', href: '/x' }]);
    await runSearch(result, 'cached');
    expect(h.invokeEdge).not.toHaveBeenCalled();
    expect(result.current.results[0].title).toBe('Do cache');
  });

  it('aplica filtros de categoria, preço e cor da intenção de produto e título IA', async () => {
    h.isGlobalAIMode = true;
    h.invokeEdge.mockResolvedValue(
      intentResponse({
        type: 'product',
        keywords: ['caneca'],
        filters: { category: 'canecas', priceRange: 'low', color: 'azul' },
      }),
    );
    h.fetchPromobrindProducts.mockResolvedValue([
      product({ id: 'a', ai_title: 'Caneca Premium IA' }),
      product({ id: 'b', name: 'Caneca Vermelha', colors: [{ label: 'Vermelho' }] }),
      product({ id: 'c', name: 'Caneca Cara', base_price: 500 }),
      product({ id: 'd', name: 'Caneca sem cor', colors: null }),
      product({ id: 'e', name: 'Squeeze', category_name: 'Garrafas' }),
    ]);

    const { result } = renderHook(() => useGlobalSearch());
    await runSearch(result, 'caneca azul barata');

    expect(result.current.searchIntent?.type).toBe('product');
    expect(result.current.results.map((r) => r.id)).toEqual(['a']);
    expect(result.current.results[0].title).toBe('Caneca Premium IA');
    // nenhuma tabela auxiliar consultada numa intenção só de produto
    expect(h.state.calls.find((c) => c.table === 'custom_kits')).toBeUndefined();
    expect(h.searchCrm).not.toHaveBeenCalled();
  });

  it('filtro de preço alto mantém só produtos acima de 200 e cor sem match não esvazia', async () => {
    h.invokeEdge.mockResolvedValue(
      intentResponse({
        type: 'product',
        keywords: ['caneca'],
        filters: { priceRange: 'high', color: 'roxo' },
      }),
    );
    h.fetchPromobrindProducts.mockResolvedValue([
      product({ id: 'barata', base_price: 10 }),
      product({ id: 'cara', sale_price: 300 }),
    ]);
    const { result } = renderHook(() => useGlobalSearch());
    await runSearch(result, 'caneca cara');
    expect(result.current.results.map((r) => r.id)).toEqual(['cara']);
  });

  it('intenção de orçamento filtra por cliente e status e reordena via RPC', async () => {
    h.invokeEdge.mockResolvedValue(
      intentResponse({
        type: 'quote',
        keywords: ['orcamento'],
        filters: { clientName: 'acme', status: 'sent' },
      }),
    );
    h.selectCrm.mockResolvedValue([
      { id: 'q1', quote_number: 'ORC-1', client_name: 'Acme SA', status: 'sent', total: 10 },
      { id: 'q2', quote_number: 'ORC-2', client_name: 'Acme Brasil', status: 'sent', total: 20 },
      { id: 'q3', quote_number: 'ORC-3', client_name: 'Outra', status: 'sent', total: 30 },
    ]);
    h.state.rerank = [
      { id: 'q1', score: 0.1 },
      { id: 'q2', score: 0.9 },
    ];
    const { result } = renderHook(() => useGlobalSearch());
    await runSearch(result, 'orcamento acme');

    expect(h.selectCrm).toHaveBeenCalledWith(
      'quotes',
      expect.objectContaining({ filters: { status: 'sent' } }),
    );
    expect(result.current.results.map((r) => r.id)).toEqual(['q2', 'q1']);
    expect(supabase.rpc).toHaveBeenCalledWith('search_records_rerank', expect.anything());
  });

  it('intenção de cliente usa o nome do filtro e entidades extras', async () => {
    h.invokeEdge.mockResolvedValue(
      intentResponse({
        type: 'client',
        keywords: ['x'],
        filters: { clientName: 'Acme' },
        entities: ['kit'],
      }),
    );
    h.searchCrm.mockResolvedValue([
      { id: 'c1', razao_social: 'Acme', nome_fantasia: 'ACME', ramo: 'Tech' },
    ]);
    h.state.tableData = {
      custom_kits: [{ id: 'k1', name: 'Kit', status: 's', total_price: 5, kit_quantity: 1 }],
    };
    const { result } = renderHook(() => useGlobalSearch());
    await runSearch(result, 'cliente acme');
    expect(h.searchCrm).toHaveBeenCalledWith(
      'companies',
      'razao_social',
      'Acme',
      expect.any(Object),
    );
    expect(result.current.results.map((r) => r.type)).toEqual(['client', 'kit']);
    expect(result.current.results[0]).toMatchObject({ title: 'ACME', subtitle: 'Tech' });
  });

  it('termo vazio após sanitização encerra sem consultar tabelas', async () => {
    h.invokeEdge.mockResolvedValue(intentResponse({ type: 'category', keywords: ['%%%'] }));
    const { result } = renderHook(() => useGlobalSearch());
    await runSearch(result, '%%%');
    expect(result.current.results).toEqual([]);
    expect(result.current.searchIntent?.type).toBe('category');
    expect(h.state.calls).toEqual([]);
  });

  it('inclui comandos slash que batem com a consulta', async () => {
    h.invokeEdge.mockResolvedValue(intentResponse({ type: 'command', keywords: ['proposta'] }));
    const { result } = renderHook(() => useGlobalSearch());
    await runSearch(result, 'proposta');
    expect(result.current.results).toEqual([
      expect.objectContaining({ id: 'cmd-new-quote', type: 'command', href: 'command:new-quote' }),
    ]);
  });

  it('falhas de fontes individuais são silenciosas e erro de rede vira searchError', async () => {
    h.fetchPromobrindProducts.mockRejectedValue(new Error('down'));
    h.searchCrm.mockRejectedValue(new Error('down'));
    h.selectCrm.mockRejectedValue(new Error('down'));
    h.state.tableErrors = new Set([
      'collections',
      'custom_kits',
      'generated_mockups',
      'component_media',
    ]);
    h.invokeEdge.mockResolvedValue({ data: null, error: new Error('edge') });
    const { result } = renderHook(() => useGlobalSearch());
    await runSearch(result, 'qualquer');
    expect(result.current.searchError).toBe(false);
    expect(result.current.results).toEqual([]);

    h.invokeEdge.mockRejectedValue(new Error('network'));
    await runSearch(result, 'outra consulta');
    expect(result.current.searchError).toBe(true);
    expect(result.current.isAIProcessing).toBe(false);
  });

  it('sem usuário logado não grava analytics', async () => {
    h.state.userId = null;
    const { result } = renderHook(() => useGlobalSearch());
    await runSearch(result, 'sem usuario');
    await waitFor(() => expect(supabase.auth.getUser).toHaveBeenCalled());
    expect(h.state.calls.some((c) => c.table === 'search_analytics')).toBe(false);
  });

  it('query iniciada por "/" lista comandos sem busca semântica', async () => {
    const { result } = renderHook(() => useGlobalSearch());
    act(() => result.current.setQuery('/kit'));
    await waitFor(() => expect(result.current.results).toHaveLength(1));
    expect(result.current.results[0]).toMatchObject({ id: 'kits', type: 'command' });
    expect(h.invokeEdge).not.toHaveBeenCalled();
  });

  it('gera sugestões de digitação a partir do histórico', () => {
    h.history = [
      { id: 'history-caneta', label: 'caneta' },
      { id: 'history-caneca', label: 'Caneca' },
      { id: 'history-bone', label: 'boné' },
    ];
    const { result } = renderHook(() => useGlobalSearch());
    act(() => result.current.setQuery('ca'));
    expect(result.current.typingSuggestions).toEqual(['caneta', 'Caneca']);
    expect(result.current.history).toEqual(['caneta', 'Caneca', 'boné']);
    act(() => result.current.setQuery('canetas azuis'));
    expect(result.current.typingSuggestions).toEqual([]);
  });

  it('handleSelect salva histórico e navega; URL externa abre nova aba', () => {
    const openSpy = vi.spyOn(window, 'open').mockReturnValue(null);
    const { result } = renderHook(() => useGlobalSearch());
    act(() => result.current.setQuery(' caneca '));
    act(() => result.current.handleSelect('/produto/1'));
    expect(h.addToHistory).toHaveBeenCalledWith({
      id: 'history-caneca',
      label: 'caneca',
      type: 'general',
    });
    expect(h.pushRecentSearch).toHaveBeenCalledWith('caneca');
    expect(h.setOpen).toHaveBeenCalledWith(false);
    expect(h.navigate).toHaveBeenCalledWith('/produto/1');
    expect(result.current.query).toBe('');

    act(() => result.current.handleSelect('https://site.com/a', false));
    expect(openSpy).toHaveBeenCalledWith('https://site.com/a', '_blank', 'noopener,noreferrer');
    openSpy.mockRestore();
  });

  it('handleSelect executa comando slash conhecido', () => {
    const { result } = renderHook(() => useGlobalSearch());
    act(() => result.current.handleSelect('command:new-quote'));
    expect(h.commandAction).toHaveBeenCalled();
    expect(h.navigate).not.toHaveBeenCalled();
    act(() => result.current.handleSelect('command:inexistente'));
    expect(h.navigate).toHaveBeenCalledWith('command:inexistente');
  });

  it('helpers de histórico, sugestão e overlay de voz', () => {
    const { result } = renderHook(() => useGlobalSearch());
    act(() => result.current.handleSuggestionClick('bonés'));
    expect(result.current.query).toBe('bonés');
    result.current.addToHistory('x');
    expect(h.addToHistory).toHaveBeenCalledWith({ id: 'history-x', label: 'x', type: 'general' });
    result.current.removeFromHistory('x');
    expect(h.removeFromHistory).toHaveBeenCalledWith('history-x');
    const stop = vi.fn();
    result.current.handleRemoveFromHistory(
      { stopPropagation: stop } as unknown as React.MouseEvent,
      'y',
    );
    expect(stop).toHaveBeenCalled();
    expect(h.removeFromHistory).toHaveBeenCalledWith('history-y');
    result.current.handleOpenVoiceOverlay();
    expect(h.setOpen).toHaveBeenCalledWith(false);
    expect(h.setVoiceOverlayOpen).toHaveBeenCalledWith(true);
    result.current.handleCloseVoiceOverlay();
    expect(h.setVoiceOverlayOpen).toHaveBeenLastCalledWith(false);
  });

  it('Ctrl+Shift+V abre o overlay de voz e logout limpa o cache', () => {
    const { unmount } = renderHook(() => useGlobalSearch());
    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'V', ctrlKey: true, shiftKey: true }),
    );
    expect(h.setVoiceOverlayOpen).toHaveBeenCalledWith(true);

    searchCache.set('k', []);
    h.authCallback?.('TOKEN_REFRESHED');
    expect(searchCache.get('k')).toEqual([]);
    h.authCallback?.('SIGNED_OUT');
    expect(searchCache.get('k')).toBeNull();
    unmount();
    expect(h.unsubscribe).toHaveBeenCalled();
  });

  describe('handleVoiceAction', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    it('navigate registra comando e navega após 500ms', () => {
      const { result } = renderHook(() => useGlobalSearch());
      act(() =>
        result.current.handleVoiceAction({
          action: 'navigate',
          response: 'ok',
          data: { route: '/kits' },
        }),
      );
      expect(h.addCommand).toHaveBeenCalledWith('ok', 'navigate', true);
      expect(h.navigate).not.toHaveBeenCalled();
      act(() => vi.advanceTimersByTime(500));
      expect(h.navigate).toHaveBeenCalledWith('/kits');
      expect(h.setVoiceOverlayOpen).toHaveBeenCalledWith(false);
    });

    it('filter combina filtros em consulta e reabre a busca', () => {
      const { result } = renderHook(() => useGlobalSearch());
      act(() =>
        result.current.handleVoiceAction({
          action: 'filter',
          response: 'r',
          data: { filters: { category: 'canecas', color: 'azul', material: 'vidro' } },
        }),
      );
      act(() => vi.advanceTimersByTime(500));
      expect(result.current.query).toBe('canecas azul vidro');
      expect(h.setOpen).toHaveBeenCalledWith(true);
    });

    it('search usa o termo falado; clear zera; sort navega; answer não faz nada', () => {
      const { result } = renderHook(() => useGlobalSearch());
      act(() =>
        result.current.handleVoiceAction({
          action: 'search',
          response: 'r',
          data: { query: 'boné' },
        }),
      );
      act(() => vi.advanceTimersByTime(500));
      expect(result.current.query).toBe('boné');

      act(() => result.current.handleVoiceAction({ action: 'clear', response: 'r' }));
      act(() => vi.advanceTimersByTime(500));
      expect(result.current.query).toBe('');

      act(() =>
        result.current.handleVoiceAction({
          action: 'sort',
          response: 'r',
          data: { sortBy: 'price' },
        }),
      );
      act(() => result.current.handleVoiceAction({ action: 'sort', response: 'r' }));
      act(() => vi.advanceTimersByTime(500));
      expect(h.navigate).toHaveBeenCalledTimes(1);
      expect(h.navigate).toHaveBeenCalledWith('/?sort=price');

      h.setVoiceOverlayOpen.mockClear();
      act(() => result.current.handleVoiceAction({ action: 'answer', response: 'r' }));
      act(() => vi.advanceTimersByTime(500));
      expect(h.setVoiceOverlayOpen).not.toHaveBeenCalled();
    });

    it('open_oracle e open_cart disparam integrações', () => {
      const listener = vi.fn();
      window.addEventListener('open-seller-cart', listener);
      const { result } = renderHook(() => useGlobalSearch());
      act(() =>
        result.current.handleVoiceAction({
          action: 'open_oracle',
          response: 'r',
          data: { oracleMessage: 'oi' },
        }),
      );
      act(() => result.current.handleVoiceAction({ action: 'open_cart', response: 'r' }));
      act(() => vi.advanceTimersByTime(500));
      expect(h.openOracle).toHaveBeenCalledWith('oi');
      expect(listener).toHaveBeenCalledTimes(1);
      window.removeEventListener('open-seller-cart', listener);
    });

    it('timers pendentes são cancelados no unmount', () => {
      const { result, unmount } = renderHook(() => useGlobalSearch());
      act(() =>
        result.current.handleVoiceAction({
          action: 'navigate',
          response: 'r',
          data: { route: '/x' },
        }),
      );
      unmount();
      vi.advanceTimersByTime(1000);
      expect(h.navigate).not.toHaveBeenCalled();
    });
  });
});
