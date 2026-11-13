import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useQuoteTemplates, type CreateTemplateInput } from '@/hooks/useQuoteTemplates';
import type { QuoteTemplate as CanonicalQuoteTemplate } from '@/hooks/quotes/useQuoteTemplates';
import type { Tables, Json } from '@/integrations/supabase/types';
import { exportTemplatesToJson } from '@/utils/templateExport';

const state = vi.hoisted(() => ({
  error: null as string | null,
  templates: new Array<CanonicalQuoteTemplate>(),
  allTemplates: new Array<CanonicalQuoteTemplate>(),
  createTemplate: vi.fn<(...args: unknown[]) => Promise<Tables<'quote_templates'> | null>>(),
  updateTemplate: vi.fn<(...args: unknown[]) => Promise<Tables<'quote_templates'> | null>>(),
  setDefaultTemplate: vi.fn<(...args: unknown[]) => Promise<Tables<'quote_templates'> | null>>(),
  duplicateTemplate: vi.fn<(...args: unknown[]) => Promise<Tables<'quote_templates'> | null>>(),
  cloneTemplateToSeller: vi.fn<(...args: unknown[]) => Promise<Tables<'quote_templates'> | null>>(),
}));
vi.mock('@/hooks/quotes/useQuoteTemplates', () => ({ useQuoteTemplates: () => state }));

const item = { productId: 'p1', productName: 'Caneca', quantity: 10, unitPrice: 5 };
function row(items: Json = [item], template_data: Json = {}): Tables<'quote_templates'> {
  return {
    id: 't1',
    seller_id: 'seller1',
    name: 'Template',
    category: null,
    created_at: null,
    created_by: null,
    delivery_time: null,
    description: null,
    discount_amount: null,
    discount_percent: null,
    internal_notes: null,
    is_active: true,
    is_default: null,
    items,
    notes: null,
    payment_method: null,
    payment_terms: null,
    shipping_cost: null,
    shipping_type: null,
    template_data,
    updated_at: null,
    usage_count: null,
    validity_days: null,
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('legacy items_data adapter delegates to canonical items', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.templates = [];
    state.allTemplates = [];
    for (const method of [
      state.createTemplate,
      state.updateTemplate,
      state.setDefaultTemplate,
      state.duplicateTemplate,
      state.cloneTemplateToSeller,
    ])
      method.mockResolvedValue(row());
  });

  it('converts items_data input to the real items field and maps returned raw JSON', async () => {
    const { result } = renderHook(() => useQuoteTemplates());
    let saved: ReturnType<typeof useQuoteTemplates>['templates'][number] | null | undefined;
    await act(async () => {
      saved = await result.current.createTemplate({ name: 'T', items_data: [item] });
    });
    expect(state.createTemplate).toHaveBeenCalledWith({ name: 'T', items: [item] });
    expect(saved).toMatchObject({
      id: 't1',
      items_data: [item],
      is_default: false,
      discount_percent: 0,
      validity_days: 30,
    });
    expect(saved?.items).toEqual([item]);
    expect(saved?.items_error).toBeNull();
  });

  it('does not overwrite items when update omits items_data', async () => {
    const { result } = renderHook(() => useQuoteTemplates());
    await act(async () => {
      await result.current.updateTemplate('t1', { name: 'Renamed' });
    });
    expect(state.updateTemplate).toHaveBeenCalledWith('t1', { name: 'Renamed' });
  });

  it('preserves explicit clearing of items_data', async () => {
    const { result } = renderHook(() => useQuoteTemplates());
    await act(async () => {
      await result.current.updateTemplate('t1', { items_data: [] });
    });
    expect(state.updateTemplate).toHaveBeenCalledWith('t1', { items: [] });
  });

  it.each(
    [null, 'invalid', 12, {}, [null, 12, { productName: 'Missing quantity' }]].map(
      (items: Json) => ({ items }),
    ),
  )('preserves invalid raw items %j and reports a whole-collection error', async ({ items }) => {
    state.createTemplate.mockResolvedValue(row(items));
    const { result } = renderHook(() => useQuoteTemplates());
    const saved = await result.current.createTemplate({ name: 'T' });
    expect(saved?.items_data).toBeNull();
    expect(saved?.items).toEqual(items);
    expect(saved?.items_error).toMatch(/preservados/);
  });

  it.each([null, ['array'], 'string', 5].map((data: Json) => ({ data })))(
    'preserves raw template_data %j without claiming a record shape',
    async ({ data }) => {
      state.createTemplate.mockResolvedValue(row([item], data));
      const { result } = renderHook(() => useQuoteTemplates());
      expect((await result.current.createTemplate({ name: 'T' }))?.template_data).toEqual(data);
    },
  );

  it('preserves nested template metadata and valid personalization values', async () => {
    const data = { extra: { keep: true } };
    const enriched = {
      ...item,
      colorName: 'Azul',
      personalizations: [
        {
          techniqueId: 'laser',
          techniqueName: 'Laser',
          colorsCount: 1,
          unitCost: 2,
          setupCost: 10,
        },
      ],
    };
    state.createTemplate.mockResolvedValue(row([enriched], data));
    const { result } = renderHook(() => useQuoteTemplates());
    const saved = await result.current.createTemplate({ name: 'T' });
    expect(saved?.template_data).toEqual(data);
    expect(saved?.items_data?.[0]).toMatchObject(enriched);
  });

  it('preserves partial item and personalization fields outside the current interface', async () => {
    const partial = {
      ...item,
      plannedPackaging: { material: 'recycled', quantity: 20 },
      personalizations: [
        {
          techniqueId: 'laser',
          techniqueName: 'Laser',
          plannedPrintArea: { width: 10, height: 5 },
        },
      ],
    };
    state.createTemplate.mockResolvedValue(row([partial]));
    const { result } = renderHook(() => useQuoteTemplates());
    const saved = await result.current.createTemplate({ name: 'T' });
    expect(saved?.items_data?.[0]).toMatchObject(partial);
  });

  it('preserves real nullable columns and future top-level fields', async () => {
    const raw = {
      ...row(),
      category: 'future category',
      payment_method: 'pix',
      shipping_type: 'fob',
      shipping_cost: 21,
      usage_count: 8,
      futureMetadata: { keep: true },
    };
    state.createTemplate.mockResolvedValue(raw);
    const { result } = renderHook(() => useQuoteTemplates());
    const saved = await result.current.createTemplate({ name: 'T' });
    expect(saved).toMatchObject({
      category: raw.category,
      payment_method: raw.payment_method,
      shipping_type: raw.shipping_type,
      shipping_cost: raw.shipping_cost,
      is_active: raw.is_active,
      usage_count: raw.usage_count,
      futureMetadata: raw.futureMetadata,
    });
    expect(saved?.created_at).toBeNull();
    expect(saved?.seller_id).toBe('seller1');
    expect(saved?.description).toBeNull();
  });

  it('rejects the entire validated view without removing partial items or personalizations from raw data', async () => {
    const rawItems = [
      item,
      {
        ...item,
        productName: 'Partial',
        personalizations: [
          { techniqueId: 'laser', techniqueName: 'Laser' },
          { plannedPrintArea: 20 },
        ],
      },
    ];
    state.createTemplate.mockResolvedValue(row(rawItems));
    const { result } = renderHook(() => useQuoteTemplates());
    const saved = await result.current.createTemplate({ name: 'T' });
    expect(saved?.items_data).toBeNull();
    expect(saved?.items).toEqual(rawItems);
    expect(saved?.items_error).toContain('item 2');
  });

  it.each(
    [
      null,
      [{ productName: 'Missing quantity', unitPrice: 5 }],
      [item, { ...item, unitPrice: null }],
    ].map((rawItems) => ({ rawItems })),
  )('does not persist invalid create or update input %j', async ({ rawItems }) => {
    const input: CreateTemplateInput = { name: 'T' };
    Object.defineProperty(input, 'items_data', { value: rawItems, enumerable: true });
    const { result } = renderHook(() => useQuoteTemplates());
    await act(async () => {
      expect(await result.current.createTemplate(input)).toBeNull();
    });
    expect(state.createTemplate).not.toHaveBeenCalled();
    expect(result.current.error).toMatch(/preservados/);
    await act(async () => {
      expect(await result.current.updateTemplate('t1', input)).toBeNull();
    });
    expect(state.updateTemplate).not.toHaveBeenCalled();
    expect(result.current.error).toMatch(/preservados/);
  });

  it('keeps the caller item object intact and clears a corrected input error', async () => {
    const broken: CreateTemplateInput = { name: 'T' };
    Object.defineProperty(broken, 'items_data', { value: [null], enumerable: true });
    const validItem = {
      ...item,
      personalizations: [
        { techniqueId: 'laser', techniqueName: 'Laser', plannedPrintArea: { width: 5 } },
      ],
    };
    state.createTemplate.mockResolvedValue(row([validItem]));
    const { result } = renderHook(() => useQuoteTemplates());
    await act(async () => {
      await result.current.createTemplate(broken);
    });
    let saved: Awaited<ReturnType<typeof result.current.createTemplate>> | undefined;
    await act(async () => {
      saved = await result.current.createTemplate({ name: 'T', items_data: [validItem] });
    });
    expect(result.current.error).toBeNull();
    expect(saved?.items_data?.[0]).toBe(validItem);
    expect(saved?.items).toEqual([validItem]);
  });

  it('exports the actual raw payload of an invalid template without losing extras or reintroducing omitted identifiers', async () => {
    const rawItems = [item, { productName: 'Incomplete item' }];
    const raw = {
      ...row(rawItems),
      category: 'future category',
      shipping_cost: 21,
      plannedWorkflow: { keep: true },
    };
    state.createTemplate.mockResolvedValue(raw);
    const { result } = renderHook(() => useQuoteTemplates());
    const saved = await result.current.createTemplate({ name: 'T' });
    if (!saved) throw new Error('Expected the raw stored template');
    const captured: string[] = [];
    class CapturedBlob {
      constructor(parts: BlobPart[]) {
        for (const part of parts) if (typeof part === 'string') captured.push(part);
      }
    }
    vi.stubGlobal('Blob', CapturedBlob);
    vi.stubGlobal('URL', {
      createObjectURL: vi.fn(() => 'blob:test-template'),
      revokeObjectURL: vi.fn(),
    });
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    exportTemplatesToJson([saved]);
    const payload: unknown = JSON.parse(captured[0]);
    expect(payload).toMatchObject({
      templates: [
        {
          name: raw.name,
          items: rawItems,
          items_data: null,
          category: raw.category,
          shipping_cost: 21,
          plannedWorkflow: { keep: true },
        },
      ],
    });
    expect(captured[0]).not.toContain('"seller_id"');
    expect(captured[0]).not.toContain('"created_at"');
    expect(captured[0]).not.toContain('"updated_at"');
    expect(captured[0]).not.toContain('"id": "t1"');
  });

  it.each(['setDefaultTemplate', 'duplicateTemplate'] as const)(
    'normalizes the %s response too',
    async (method) => {
      const { result } = renderHook(() => useQuoteTemplates());
      expect(await result.current[method]('t1')).toMatchObject({ id: 't1', items_data: [item] });
      expect(state[method]).toHaveBeenCalledWith('t1');
    },
  );

  it('normalizes cloned templates and preserves target seller argument', async () => {
    const { result } = renderHook(() => useQuoteTemplates());
    expect(await result.current.cloneTemplateToSeller('t1', 'seller2')).toMatchObject({
      id: 't1',
      items_data: [item],
    });
    expect(state.cloneTemplateToSeller).toHaveBeenCalledWith('t1', 'seller2');
  });

  it('preserves null failure returns instead of inventing a template', async () => {
    state.createTemplate.mockResolvedValue(null);
    state.updateTemplate.mockResolvedValue(null);
    const { result } = renderHook(() => useQuoteTemplates());
    expect(await result.current.createTemplate({ name: 'T' })).toBeNull();
    expect(await result.current.updateTemplate('t1', {})).toBeNull();
  });

  it('memoizes adapted arrays and action references across unrelated rerenders', () => {
    const canonical: CanonicalQuoteTemplate = {
      id: 't1',
      seller_id: 's1',
      name: 'T',
      is_default: false,
      template_data: {},
      items: [item],
      discount_percent: 0,
      discount_amount: 0,
      validity_days: 30,
      created_at: '',
      updated_at: '',
    };
    state.templates = [canonical];
    const { result, rerender } = renderHook(() => useQuoteTemplates());
    const first = result.current;
    rerender();
    expect(result.current.templates).toBe(first.templates);
    expect(result.current.createTemplate).toBe(first.createTemplate);
    expect(result.current.templates[0].items_data).toMatchObject([item]);
  });
});
