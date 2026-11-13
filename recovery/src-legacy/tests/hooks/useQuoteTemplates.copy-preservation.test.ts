import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useQuoteTemplates as useRootTemplates } from '@/hooks/useQuoteTemplates';
import { useQuoteTemplates as useCanonicalTemplates } from '@/hooks/quotes/useQuoteTemplates';
import type { Json, Tables, TablesInsert } from '@/integrations/supabase/types';

const state = vi.hoisted(() => {
  const caller = { id: '00000000-0000-0000-0000-000000000001' };
  const values: {
    caller: typeof caller;
    user: typeof caller | null;
    isAdmin: boolean;
    rows: Tables<'quote_templates'>[];
    inserts: TablesInsert<'quote_templates'>[];
    insertError: Error | null;
    from: ReturnType<typeof vi.fn>;
    toast: ReturnType<typeof vi.fn>;
  } = {
    caller,
    user: caller,
    isAdmin: true,
    rows: [],
    inserts: [],
    insertError: null,
    from: vi.fn(),
    toast: vi.fn(),
  };
  return values;
});
const target = '00000000-0000-0000-0000-000000000002';
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: state.user, isAdmin: state.isAdmin }),
}));
vi.mock('@/hooks/ui', () => ({ useToast: () => ({ toast: state.toast }) }));
vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn() } }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: state.from } }));

function row(overrides: Partial<Tables<'quote_templates'>> = {}): Tables<'quote_templates'> {
  return {
    id: '10000000-0000-0000-0000-000000000001',
    name: 'Original',
    seller_id: '00000000-0000-0000-0000-000000000003',
    created_by: '00000000-0000-0000-0000-000000000003',
    category: 'planned category',
    created_at: '2026-11-10T00:00:00Z',
    updated_at: '2026-11-10T00:00:00Z',
    description: '',
    delivery_time: '',
    discount_amount: null,
    discount_percent: 0,
    internal_notes: 'planned internal',
    is_active: true,
    is_default: true,
    items: [{ productName: 'Caneta', quantity: 2, unitPrice: 5 }],
    notes: '',
    payment_method: 'pix',
    payment_terms: '',
    shipping_cost: 31,
    shipping_type: 'fob',
    template_data: { futureWorkflow: { keep: true } },
    usage_count: 8,
    validity_days: 30,
    ...overrides,
  };
}
beforeEach(() => {
  vi.clearAllMocks();
  state.user = state.caller;
  state.isAdmin = true;
  state.rows = [row()];
  state.inserts = [];
  state.insertError = null;
  state.from.mockImplementation((table: string) => {
    let payload: TablesInsert<'quote_templates'> | undefined;
    return {
      select() {
        if (payload)
          return Promise.resolve({
            data: state.insertError
              ? null
              : [
                  {
                    ...state.rows[0],
                    ...payload,
                    id: 'new-copy',
                    created_at: '2026-11-11T00:00:00Z',
                    updated_at: '2026-11-11T00:00:00Z',
                  },
                ],
            error: state.insertError,
          });
        return this;
      },
      order() {
        return table === 'profiles'
          ? Promise.resolve({ data: [{ user_id: target, full_name: 'Target' }], error: null })
          : this;
      },
      limit: () => Promise.resolve({ data: state.rows, error: null }),
      insert(input: TablesInsert<'quote_templates'>) {
        payload = input;
        state.inserts.push(input);
        return this;
      },
    };
  });
});

const payloadCases: Array<{ label: string; items: Json; metadata: Json }> = [
  {
    label: 'complete',
    items: [{ productName: 'Caneta', quantity: 2, unitPrice: 5, plannedPackaging: { keep: true } }],
    metadata: { planned: { keep: true } },
  },
  {
    label: 'partial array',
    items: [{ productName: 'Partial' }, { personalizations: [{ plannedArea: 20 }] }],
    metadata: { unfinished: true },
  },
  { label: 'non-array JSON', items: { plannedItems: ['partial'] }, metadata: 'planned metadata' },
  { label: 'scalar JSON', items: 'planned item', metadata: ['planned metadata'] },
];
const adapters = [
  { label: 'root', useTemplates: useRootTemplates },
  { label: 'canonical', useTemplates: useCanonicalTemplates },
];

describe.each(adapters)('$label copy mutation contract', ({ useTemplates }) => {
  it.each(payloadCases)(
    'duplicates raw $label without normalized data or lost fields',
    async ({ items, metadata }) => {
      const raw = row({ items, template_data: metadata });
      state.rows = [raw];
      const { result } = renderHook(() => useTemplates());
      await waitFor(() => expect(result.current.templates).toHaveLength(1));
      let copied: unknown;
      await act(async () => {
        copied = await result.current.duplicateTemplate(raw.id);
      });
      expect(state.inserts).toHaveLength(1);
      expect(state.inserts[0]).toMatchObject({
        items,
        template_data: metadata,
        category: raw.category,
        payment_method: raw.payment_method,
        payment_terms: raw.payment_terms,
        shipping_cost: raw.shipping_cost,
        shipping_type: raw.shipping_type,
        usage_count: 8,
        description: '',
        notes: '',
        discount_amount: null,
        created_by: state.caller.id,
        seller_id: state.caller.id,
        name: 'Original (Cópia)',
        is_default: false,
      });
      expect(state.inserts[0]).not.toHaveProperty('id');
      expect(state.inserts[0]).not.toHaveProperty('created_at');
      expect(state.inserts[0]).not.toHaveProperty('updated_at');
      expect(copied).toMatchObject({ items, template_data: metadata });
      expect(raw).toEqual(row({ items, template_data: metadata }));
    },
  );

  it.each(payloadCases)(
    'admin-clones raw $label with current creator and selected seller',
    async ({ items, metadata }) => {
      const raw = row({ items, template_data: metadata });
      state.rows = [raw];
      const { result } = renderHook(() => useTemplates());
      await waitFor(() => expect(result.current.allTemplates).toHaveLength(1));
      let copied: unknown;
      await act(async () => {
        copied = await result.current.cloneTemplateToSeller(raw.id, target);
      });
      expect(state.inserts).toHaveLength(1);
      expect(state.inserts[0]).toMatchObject({
        items,
        template_data: metadata,
        created_by: state.caller.id,
        seller_id: target,
        name: 'Original (Clonado)',
        is_default: false,
        is_active: true,
        category: raw.category,
        shipping_type: raw.shipping_type,
        payment_method: raw.payment_method,
        usage_count: 8,
      });
      expect(copied).toMatchObject({ items, template_data: metadata });
    },
  );

  it.each([{ active: false }, { active: null }])(
    'does not create a copy invisible to the selected other seller: $active',
    async ({ active }) => {
      const raw = row({ is_active: active, is_default: false, created_by: state.caller.id });
      state.rows = [raw];
      const { result } = renderHook(() => useTemplates());
      await waitFor(() => expect(result.current.allTemplates).toHaveLength(1));
      await act(async () => {
        expect(await result.current.cloneTemplateToSeller(raw.id, target)).toBeNull();
      });
      expect(state.inserts).toHaveLength(0);
      expect(state.toast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'O vendedor não terá acesso à cópia',
          variant: 'destructive',
        }),
      );
    },
  );

  it('preserves an inactive private copy when the target is the current creator', async () => {
    const raw = row({ is_active: false, is_default: false, created_by: state.caller.id });
    state.rows = [raw];
    const { result } = renderHook(() => useTemplates());
    await waitFor(() => expect(result.current.allTemplates).toHaveLength(1));
    await act(async () => {
      await result.current.cloneTemplateToSeller(raw.id, state.caller.id);
    });
    expect(state.inserts[0]).toMatchObject({
      is_active: false,
      created_by: state.caller.id,
      seller_id: state.caller.id,
    });
  });

  it('retains normal create defaults while satisfying the actual INSERT creator policy', async () => {
    const { result } = renderHook(() => useTemplates());
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => {
      await result.current.createTemplate({ name: 'Normal' });
    });
    expect(state.inserts[0]).toMatchObject({
      name: 'Normal',
      created_by: state.caller.id,
      seller_id: state.caller.id,
      items: [],
      template_data: {},
      is_default: false,
      discount_percent: 0,
      discount_amount: 0,
      validity_days: 30,
    });
  });

  it('retains the administrator guard for cross-seller copying', async () => {
    state.isAdmin = false;
    const { result } = renderHook(() => useTemplates());
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => {
      expect(await result.current.cloneTemplateToSeller(state.rows[0].id, target)).toBeNull();
    });
    expect(state.inserts).toHaveLength(0);
  });

  it('does not create without an authenticated author', async () => {
    state.user = null;
    const { result } = renderHook(() => useTemplates());
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => {
      expect(await result.current.createTemplate({ name: 'Normal' })).toBeNull();
    });
    expect(state.inserts).toHaveLength(0);
  });

  it.each(['create', 'duplicate', 'clone', 'update', 'delete'] as const)(
    'does not claim success when %s confirms zero rows',
    async (action) => {
      const { result } = renderHook(() => useTemplates());
      await waitFor(() => expect(result.current.allTemplates).toHaveLength(1));
      state.toast.mockClear();
      const empty = () => Promise.resolve({ data: [], error: null });
      state.from.mockImplementationOnce(() => ({
        insert() {
          return this;
        },
        update() {
          return this;
        },
        delete() {
          return this;
        },
        eq() {
          return this;
        },
        select: empty,
      }));
      await act(async () => {
        if (action === 'create')
          expect(await result.current.createTemplate({ name: 'T' })).toBeNull();
        if (action === 'duplicate')
          expect(await result.current.duplicateTemplate(state.rows[0].id)).toBeNull();
        if (action === 'clone')
          expect(await result.current.cloneTemplateToSeller(state.rows[0].id, target)).toBeNull();
        if (action === 'update')
          expect(await result.current.updateTemplate(state.rows[0].id, { name: 'T' })).toBeNull();
        if (action === 'delete')
          expect(await result.current.deleteTemplate(state.rows[0].id)).toBe(false);
      });
      expect(state.toast).toHaveBeenCalledWith(expect.objectContaining({ variant: 'destructive' }));
      expect(state.toast).not.toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Template criado' }),
      );
      expect(state.toast).not.toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Template clonado' }),
      );
      expect(state.toast).not.toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Template atualizado' }),
      );
      expect(state.toast).not.toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Template excluído' }),
      );
    },
  );

  it('surfaces copy persistence errors and leaves the original raw row untouched', async () => {
    const raw = row({ items: null });
    state.rows = [raw];
    state.insertError = new Error('not-null constraint');
    const { result } = renderHook(() => useTemplates());
    await waitFor(() => expect(result.current.templates).toHaveLength(1));
    await act(async () => {
      expect(await result.current.duplicateTemplate(raw.id)).toBeNull();
    });
    expect(state.inserts[0].items).toBeNull();
    expect(state.toast).toHaveBeenCalledWith(expect.objectContaining({ variant: 'destructive' }));
    expect(raw.items).toBeNull();
  });
});
