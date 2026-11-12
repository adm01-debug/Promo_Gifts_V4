/**
 * Rascunho restaurado / handoff via location.state / indicador "não salvo".
 * Monta o useQuoteBuilderState REAL (useAutoSaveQuote + useQuoteItems reais) e o
 * QuoteAutoSave REAL, replicando a fiação do QuoteBuilderPage (draftRestoredAt → serverSavedAt).
 */
import React, { useEffect, useState } from 'react';
import { render, act, cleanup } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import type * as QuotesHooks from '@/hooks/quotes';

let mockState: unknown = null;
let mockSearch = new URLSearchParams();
vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
  useLocation: () => ({ state: mockState, pathname: '/orcamentos/novo' }),
  useParams: () => ({ id: undefined }),
  useSearchParams: () => [mockSearch],
}));
vi.mock('sonner', () => ({
  toast: Object.assign(vi.fn(), {
    error: vi.fn(),
    success: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
    message: vi.fn(),
  }),
}));
vi.mock('@/lib/telemetry/quoteHandoffTelemetry', () => ({ trackQuoteHandoff: vi.fn() }));
vi.mock('@/hooks/quotes', async (orig) => {
  const actual = await orig<typeof QuotesHooks>();
  return {
    ...actual,
    useQuotes: () => ({
      createQuote: vi.fn(),
      updateQuote: vi.fn(),
      fetchQuote: vi.fn(),
      isLoading: false,
    }),
    useSellerDiscountLimits: () => ({ myLimit: 50 }),
  };
});
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'u1' } }) }));
vi.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipContent: () => null,
  TooltipProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

import { useQuoteBuilderState } from '@/hooks/quotes/useQuoteBuilderState';
import { QuoteAutoSave } from '@/components/quotes/QuoteAutoSave';

const KEY = 'quote_builder_autosave';
const onChangeLog: boolean[] = [];
let latest: ReturnType<typeof useQuoteBuilderState> | null = null;

function Harness() {
  const s = useQuoteBuilderState();
  latest = s;
  const [serverSavedAt, setServerSavedAt] = useState<number | undefined>(undefined);
  useEffect(() => {
    if (s.draftRestoredAt) setServerSavedAt(s.draftRestoredAt);
  }, [s.draftRestoredAt]);
  return (
    <QuoteAutoSave
      quoteId={s.quoteId}
      data={{
        clientId: s.clientId,
        contactId: s.contactId,
        validUntil: s.validUntil,
        discountType: s.discountType,
        discountValue: s.discountValue,
        negotiationMarkup: s.negotiationMarkup,
        paymentMethod: s.paymentMethod,
        paymentTerms: s.paymentTerms,
        deliveryTime: s.deliveryTime,
        shippingType: s.shippingType,
        shippingCost: s.shippingCost,
        notes: s.notes,
        items: s.items,
      }}
      onChange={(v) => onChangeLog.push(v)}
      serverSavedAt={serverSavedAt}
    />
  );
}

function mount() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <Harness />
    </QueryClientProvider>,
  );
}

const draftItem = {
  product_id: 'p-old',
  product_name: 'Caneta',
  product_sku: 'SKU',
  quantity: 10,
  unit_price: 2,
  personalizations: [],
};
function seedDraft(extra: Record<string, unknown> = {}) {
  localStorage.setItem(
    KEY,
    JSON.stringify({
      version: 2,
      data: {
        clientId: 'draft-client',
        items: [draftItem],
        validUntil: '2026-12-01',
        notes: 'n',
        ...extra,
      },
      savedAt: '2026-11-10T00:00:00Z',
    }),
  );
}
async function flush() {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(50);
  });
  await act(async () => {
    await vi.advanceTimersByTimeAsync(50);
  });
}

beforeEach(() => {
  vi.useFakeTimers();
  localStorage.clear();
  onChangeLog.length = 0;
  mockState = null;
  mockSearch = new URLSearchParams();
  latest = null;
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('rascunho restaurado → indicador', () => {
  it('rascunho SEM shippingType: restaura no mount e indicador termina "salvo" (false)', async () => {
    seedDraft();
    mount();
    await flush();
    expect(latest!.clientId).toBe('draft-client');
    expect(latest!.items).toHaveLength(1);
    expect(latest!.draftRestoredAt).toBeTypeOf('number');
    expect(onChangeLog.at(-1)).toBe(false);
  });

  it('rascunho COM shippingType (restore diferido por setTimeout): indicador termina false', async () => {
    seedDraft({ shippingType: 'cif' });
    mount();
    await flush();
    expect(latest!.shippingType).toBe('cif');
    expect(onChangeLog.at(-1)).toBe(false);
  });

  it('após restore, alteração real do usuário volta a acusar "não salvo"', async () => {
    seedDraft();
    mount();
    await flush();
    act(() => {
      latest!.setNotes('editado');
    });
    expect(onChangeLog.at(-1)).toBe(true);
  });

  it('sem rascunho: draftRestoredAt fica undefined e nada muda', async () => {
    mount();
    await flush();
    expect(latest!.draftRestoredAt).toBeUndefined();
    expect(onChangeLog.every((v) => !v)).toBe(true);
  });

  it('rascunho corrompido: não restaura, remove chave e não quebra', async () => {
    localStorage.setItem(KEY, '{nope');
    mount();
    await flush();
    expect(latest!.clientId).toBe('');
    expect(localStorage.getItem(KEY)).toBeNull();
  });
});

describe('handoff via location.state', () => {
  const variants: Array<[string, unknown, boolean]> = [
    ['state null', null, true],
    ['state string', 'fromSimulator', true],
    ['state number', 42, true],
    ['state {} vazio', {}, true],
    ['state fromSimulator=false', { fromSimulator: false }, true],
  ];
  it.each(variants)('%s → restore=%s', async (_label, st, shouldRestore) => {
    seedDraft();
    mockState = st;
    mount();
    await flush();
    expect(latest!.clientId === 'draft-client').toBe(shouldRestore);
  });

  it('fromSimulator com simulationData → NÃO restaura, aplica item do simulador e limpa rascunho', async () => {
    seedDraft();
    mockState = {
      fromSimulator: true,
      simulationData: {
        product: { id: 'p-sim', name: 'Squeeze', price: 5 },
        quantity: 100,
        personalizations: [],
      },
    };
    mount();
    await flush();
    expect(latest!.clientId).toBe('');
    expect(latest!.items.map((i) => i.product_id)).toEqual(['p-sim']);
    expect(!localStorage.getItem(KEY)?.includes('draft-client')).toBe(true);
  });

  it('fromCart com itens → NÃO restaura; cliente do carrinho prevalece', async () => {
    seedDraft();
    mockState = {
      fromCart: true,
      companyId: 'cart-client',
      items: [{ product_id: 'p-cart', product_name: 'X', quantity: 1, unit_price: 1 }],
    };
    mount();
    await flush();
    expect(latest!.clientId).toBe('cart-client');
    expect(latest!.items.map((i) => i.product_id)).toEqual(['p-cart']);
  });

  it('fromCollection com produtos → NÃO restaura', async () => {
    seedDraft();
    mockState = {
      fromCollection: 'Kit',
      preloadProducts: [{ product_id: 'p-col', product_name: 'Y', unit_price: 1, quantity: 1 }],
    };
    mount();
    await flush();
    expect(latest!.clientId).toBe('');
    expect(latest!.items.map((i) => i.product_id)).toEqual(['p-col']);
  });

  // Handoff "vazio"/inválido não pode suprimir o restore (senão a 1ª edição
  // sobrescreve o rascunho em silêncio): mesmos critérios dos efeitos de handoff.
  const emptyHandoffs: Array<[string, unknown]> = [
    ['fromCart sem itens', { fromCart: true, items: [] }],
    ['fromSimulator sem simulationData', { fromSimulator: true }],
    ['fromCollection sem produtos', { fromCollection: 'Kit', preloadProducts: [] }],
  ];
  it.each(emptyHandoffs)('%s: restaura o rascunho (não o perde)', async (_label, st) => {
    seedDraft();
    mockState = st;
    mount();
    await flush();
    expect(latest!.clientId).toBe('draft-client');
    expect(localStorage.getItem(KEY)).toContain('draft-client');
  });

  it('?clientId= inválido (não-UUID): restaura o rascunho', async () => {
    seedDraft();
    mockSearch = new URLSearchParams('clientId=123');
    mount();
    await flush();
    expect(latest!.clientId).toBe('draft-client');
  });

  it('?clientId=<uuid>: não restaura e aplica cliente do BI', async () => {
    seedDraft();
    const uuid = '11111111-2222-3333-4444-555555555555';
    mockSearch = new URLSearchParams(`clientId=${uuid}`);
    mount();
    await flush();
    expect(latest!.clientId).toBe(uuid);
    expect(latest!.items).toHaveLength(0);
  });

  it('?productId= (BIProductCard/QuickQuoteFAB): não restaura e aplica produto', async () => {
    seedDraft();
    mockSearch = new URLSearchParams('productId=p-url&product_name=Z');
    mount();
    await flush();
    expect(latest!.clientId).toBe('');
    expect(latest!.items.map((i) => i.product_id)).toEqual(['p-url']);
  });
});
