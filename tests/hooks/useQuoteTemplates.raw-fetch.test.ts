import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useQuoteTemplates } from '@/hooks/useQuoteTemplates';
import type { Json, Tables } from '@/integrations/supabase/types';

const state = vi.hoisted(() => ({
  user: { id: 'test-user' },
  rows: new Array<Tables<'quote_templates'>>(),
  from: vi.fn(),
  toast: vi.fn(),
}));
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: state.user, isAdmin: false }),
}));
vi.mock('@/hooks/ui', () => ({ useToast: () => ({ toast: state.toast }) }));
vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn() } }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: state.from } }));

function row(items: Json, templateData: Json): Tables<'quote_templates'> {
  return {
    id: 't',
    name: 'Stored template',
    seller_id: 'test-user',
    items,
    template_data: templateData,
    category: 'category',
    created_at: null,
    created_by: null,
    delivery_time: null,
    description: null,
    discount_amount: null,
    discount_percent: null,
    internal_notes: null,
    is_active: true,
    is_default: null,
    notes: null,
    payment_method: 'pix',
    payment_terms: null,
    shipping_cost: 20,
    shipping_type: 'fob',
    updated_at: null,
    usage_count: 3,
    validity_days: null,
  };
}
beforeEach(() => {
  vi.clearAllMocks();
  state.rows = [];
  state.from.mockImplementation(() => ({
    select() {
      return this;
    },
    order() {
      return this;
    },
    limit: () => Promise.resolve({ data: state.rows, error: null }),
  }));
});

describe('real canonical fetch to legacy DTO preservation', () => {
  it('retains non-array items and primitive metadata through the actual canonical fetch transform', async () => {
    const raw = row({ plannedItems: ['partial'] }, 'planned metadata');
    state.rows = [raw];
    const { result } = renderHook(() => useQuoteTemplates());
    await waitFor(() => expect(result.current.templates).toHaveLength(1));
    expect(result.current.templates[0]).toMatchObject({
      items: raw.items,
      template_data: raw.template_data,
      items_data: null,
    });
    expect(result.current.templates[0].items_error).toMatch(/preservados/);
    expect(state.from).toHaveBeenCalledWith('quote_templates');
  });

  it('keeps the complete raw partial array while rejecting a whole typed view', async () => {
    const rawItems = [
      { productName: 'Valid', quantity: 1, unitPrice: 5 },
      { plannedProduct: 'incomplete' },
    ];
    state.rows = [row(rawItems, {})];
    const { result } = renderHook(() => useQuoteTemplates());
    await waitFor(() => expect(result.current.templates).toHaveLength(1));
    expect(result.current.templates[0].items).toEqual(rawItems);
    expect(result.current.templates[0].items_data).toBeNull();
    expect(result.current.templates[0].items_error).toContain('item 2');
  });

  it('retains valid items, array metadata and the real extra table fields', async () => {
    const rawItems = [
      { productName: 'Caneta', quantity: 2, unitPrice: 5, plannedPackaging: { keep: true } },
    ];
    const raw = row(rawItems, ['planned metadata']);
    state.rows = [raw];
    const { result } = renderHook(() => useQuoteTemplates());
    await waitFor(() => expect(result.current.templates).toHaveLength(1));
    expect(result.current.templates[0]).toMatchObject({
      items: rawItems,
      items_data: rawItems,
      template_data: raw.template_data,
      category: raw.category,
      payment_method: raw.payment_method,
      shipping_type: raw.shipping_type,
      shipping_cost: raw.shipping_cost,
      usage_count: raw.usage_count,
    });
    expect(result.current.templates[0].items_error).toBeNull();
  });
});
