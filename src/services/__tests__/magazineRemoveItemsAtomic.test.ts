import { beforeEach, describe, expect, it, vi } from 'vitest';

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
    edit_version: 7,
  },
}));

const builder = vi.hoisted(() => (table: string) => {
  const query: Record<string, unknown> = {};
  query.select = () => query;
  query.eq = () => query;
  query.is = () => query;
  query.maybeSingle = () =>
    Promise.resolve({ data: table === 'magazines' ? state.row : null, error: null });
  query.order = () => Promise.resolve({ data: [], error: null });
  return query;
});

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: (table: string) => builder(table), rpc: state.rpc },
}));

import { magazineService } from '@/services/magazineService';

beforeEach(() => {
  state.row.edit_version = 7;
  state.rpc.mockReset();
  state.rpc.mockImplementation((name: string) => {
    if (name !== 'magazine_remove_items_v2') return Promise.resolve({ data: null, error: null });
    state.row.edit_version += 1;
    return Promise.resolve({
      data: { removed: 2, edit_version: state.row.edit_version },
      error: null,
    });
  });
});

describe('magazineService.removeItems — batch atômico', () => {
  it('envia todos os IDs deduplicados em uma única RPC', async () => {
    await magazineService.removeItems('mag_x', ['item-a', 'item-b', 'item-a'], 7);
    expect(state.rpc).toHaveBeenCalledOnce();
    expect(state.rpc).toHaveBeenCalledWith('magazine_remove_items_v2', {
      p_magazine_id: 'mag_x',
      p_expected_edit_version: 7,
      p_item_ids: ['item-a', 'item-b'],
    });
  });

  it('propaga conflito CAS sem tentar remover novamente', async () => {
    state.rpc.mockResolvedValueOnce({
      data: null,
      error: { code: '40001', message: 'magazine_edit_conflict' },
    });
    await expect(magazineService.removeItems('mag_x', ['item-a'], 6)).rejects.toThrow(
      'alterada em outra sessão',
    );
    expect(state.rpc).toHaveBeenCalledOnce();
  });

  it('não chama RPC para lista vazia', async () => {
    await magazineService.removeItems('mag_x', [], 7);
    expect(state.rpc).not.toHaveBeenCalled();
  });
});
