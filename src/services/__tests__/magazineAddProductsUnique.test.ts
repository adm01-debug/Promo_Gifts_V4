import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Product } from '@/types/product-catalog';

const state = vi.hoisted(() => ({
  rpc: vi.fn(),
  row: {
    id: 'mag_x',
    owner_id: 'u1',
    organization_id: null,
    title: 'T',
    subtitle: '',
    template_id: 'editorial-vogue',
    branding: {},
    content_settings: {},
    page_order: null,
    status: 'draft',
    public_token: null,
    published_at: null,
    archived_at: null,
    view_count: 0,
    created_at: '',
    updated_at: '',
    deleted_at: null,
    edit_version: 1,
  },
}));

const builder = vi.hoisted(() => (table: string) => {
  const q: Record<string, unknown> = {};
  q.select = () => q;
  q.eq = () => q;
  q.is = () => q;
  q.maybeSingle = () =>
    Promise.resolve({ data: table === 'magazines' ? state.row : null, error: null });
  q.order = () => Promise.resolve({ data: [], error: null });
  return q;
});

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: (table: string) => builder(table), rpc: state.rpc },
}));

import { magazineService } from '@/services/magazineService';

const productFactory = (id: string): Product =>
  ({ id, name: `P-${id}`, sku: id, price: 1, images: [], colors: [] }) as unknown as Product;

beforeEach(() => {
  state.row.edit_version = 1;
  state.rpc.mockReset();
  state.rpc.mockImplementation((name: string) => {
    if (name !== 'magazine_add_items_v2') return Promise.resolve({ data: null, error: null });
    state.row.edit_version++;
    return Promise.resolve({
      data: { inserted: 1, edit_version: state.row.edit_version },
      error: null,
    });
  });
});

describe('magazineService.addProducts — RPC v2', () => {
  it('envia o batch ao banco, autoridade de deduplicação e limite', async () => {
    await magazineService.addProducts('mag_x', [productFactory('p1'), productFactory('p1')], 1);
    expect(state.rpc).toHaveBeenCalledOnce();
    expect(state.rpc).toHaveBeenCalledWith(
      'magazine_add_items_v2',
      expect.objectContaining({
        p_magazine_id: 'mag_x',
        p_expected_edit_version: 1,
        p_items: expect.arrayContaining([expect.objectContaining({ product_id: 'p1' })]),
      }),
    );
  });

  it('propaga conflito CAS em vez de retornar snapshot como falso sucesso', async () => {
    state.rpc.mockResolvedValueOnce({
      data: null,
      error: { code: '40001', message: 'magazine_edit_conflict' },
    });
    await expect(magazineService.addProducts('mag_x', [productFactory('p1')], 0)).rejects.toThrow(
      'alterada em outra sessão',
    );
  });

  it('não faz DML nem RPC para batch vazio', async () => {
    await magazineService.addProducts('mag_x', [], 1);
    expect(state.rpc).not.toHaveBeenCalled();
  });
});
