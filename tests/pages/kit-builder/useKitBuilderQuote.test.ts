/**
 * Testes — useKitBuilderQuote
 *
 * Garante que o hook envia `seller_id = user.id` à RPC atômica de orçamento
 * quando o usuário cria um orçamento a partir do Kit Builder. Também verifica
 * que sem usuário autenticado nenhuma mutação é disparada.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { createSupabaseMock } from '../../helpers/supabase-mock';
import type { KitState } from '@/hooks/useKitBuilder';

vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() } }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('react-router-dom', () => ({ useNavigate: () => vi.fn() }));
vi.mock('@/lib/kit-builder', () => ({
  getKitItemLineId: (item: { id: string; lineId?: string; selectedVariantId?: string }) =>
    item.lineId || `${item.id}:${item.selectedVariantId || 'base'}`,
  calculateTotalKitPrice: () => ({
    boxPrice: 150,
    itemsPrice: 100,
    personalizationPrice: 0,
    subtotal: 250,
    total: 250,
    unitPrice: 250,
  }),
}));

const USER_ID = 'vendedor-uuid-7';

const KIT_STATE: KitState = {
  isValid: true,
  kitType: 'premium',
  name: 'Kit teste',
  identity: { color: '#fff', icon: 'star', tag: 'PROMO' },
  box: {
    id: 'box-1',
    name: 'Caixa A',
    sku: 'BOX-A',
    imageUrl: null,
    price: 50,
    internalWidth: 30,
    internalHeight: 20,
    internalDepth: 10,
  } as KitState['box'],
  items: [
    {
      id: 'item-1',
      name: 'Caneta',
      sku: 'PEN',
      imageUrl: null,
      price: 10,
      quantity: 5,
      isOptional: false,
      selectedColor: null,
    } as KitState['items'][number],
  ],
  personalization: { box: { enabled: false }, items: {} } as KitState['personalization'],
  volumeUsagePercent: 80,
} as KitState;

describe('useKitBuilderQuote — payloads', () => {
  let mock: ReturnType<typeof createSupabaseMock>;

  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.doUnmock('@/integrations/supabase/client');
    vi.doUnmock('@/contexts/AuthContext');
    vi.clearAllMocks();
  });

  async function loadHook(opts: { user: { id: string } | null }) {
    mock = createSupabaseMock({
      insertReturn: (table, payload) => {
        if (table === 'quotes') return { id: 'new-quote-id', quote_number: 'ORC-001' };
        if (table === 'quote_items') {
          const arr = payload as Array<Record<string, unknown>>;
          return arr.map((p, i) => ({ id: `qi-${i}`, product_id: p.product_id }));
        }
        return { id: `mock-${table}` };
      },
    });
    vi.doMock('@/integrations/supabase/client', () => ({ supabase: mock.client }));
    vi.doMock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: opts.user }) }));
    const mod = await import('@/pages/kit-builder/useKitBuilderQuote');
    return mod.useKitBuilderQuote;
  }

  it('inclui seller_id e chave de idempotência na RPC transacional', async () => {
    const useHook = await loadHook({ user: { id: USER_ID } });
    const { result } = renderHook(() => useHook());

    await act(async () => {
      await result.current.handleAddToQuote(KIT_STATE, 3, {
        client_company: 'Empresa Teste',
        client_email: 'contato@empresa.teste',
        client_name: 'Contato Teste',
      });
    });

    const rpc = mock.calls.rpc.find((call) => call.fn === 'create_kit_quote_transactional');
    expect(rpc).toBeDefined();
    expect(rpc!.args?._request_id).toEqual(expect.any(String));
    expect(rpc!.args?._quote).toMatchObject({
      seller_id: USER_ID,
      status: 'draft',
      subtotal: 250,
      total: 250,
      client_company: 'Empresa Teste',
      client_email: 'contato@empresa.teste',
      client_name: 'Contato Teste',
    });
    expect((rpc!.args?._quote as { seller_id: string }).seller_id).toBe(USER_ID);
  });

  it('não dispara mutações quando usuário não está autenticado', async () => {
    const useHook = await loadHook({ user: null });
    const { result } = renderHook(() => useHook());

    await act(async () => {
      await result.current.handleAddToQuote(KIT_STATE, 1);
    });

    expect(mock.calls.insert).toHaveLength(0);
    expect(mock.calls.update).toHaveLength(0);
    expect(mock.calls.delete).toHaveLength(0);
    expect(mock.calls.rpc).toHaveLength(0);
  });

  it('envia itens e personalizações para a mesma RPC transacional', async () => {
    const useHook = await loadHook({ user: { id: USER_ID } });
    const { result } = renderHook(() => useHook());

    await act(async () => {
      await result.current.handleAddToQuote(KIT_STATE, 2);
    });

    const rpc = mock.calls.rpc.find((call) => call.fn === 'create_kit_quote_transactional');
    expect(rpc).toBeDefined();
    const arr = rpc!.args!._items as Array<Record<string, unknown>>;
    expect(arr).toHaveLength(2); // caixa + item
    for (const it of arr) {
      // A RPC injeta quote_id dentro da transação; o cliente não pode criar
      // linhas de um orçamento parcialmente persistido.
      expect(it).not.toHaveProperty('quote_id');
      expect(it).not.toHaveProperty('seller_id');
      expect(it).toHaveProperty('personalizations');
    }
  });

  it('preserva a arte aprovada para a linha do item no payload transacional', async () => {
    const useHook = await loadHook({ user: { id: USER_ID } });
    const { result } = renderHook(() => useHook());
    const kitWithArtwork = {
      ...KIT_STATE,
      personalization: {
        box: { enabled: false },
        items: {
          'item-1:base': {
            enabled: true,
            techniqueId: 'laser',
            techniqueName: 'Laser',
            estimatedPrice: 2.5,
            artworkUrl: 'https://example.test/personalization-images/kit-maker/artwork/logo.png',
          },
        },
      },
    } as KitState;

    await act(async () => {
      await result.current.handleAddToQuote(kitWithArtwork, 2);
    });

    const rpc = mock.calls.rpc.find((call) => call.fn === 'create_kit_quote_transactional');
    const item = (rpc!.args!._items as Array<Record<string, unknown>>)[1];
    expect(item.personalizations).toEqual([
      expect.objectContaining({
        artwork_url: 'https://example.test/personalization-images/kit-maker/artwork/logo.png',
      }),
    ]);
  });
});
