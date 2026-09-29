import { describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  magazineRanges: [] as Array<[number, number]>,
  itemIdBatches: [] as string[][],
}));

function row(index: number) {
  return {
    id: `mag-${String(index).padStart(4, '0')}`,
    owner_id: 'owner-1',
    organization_id: null,
    title: `Revista ${index}`,
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
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    deleted_at: null,
    edit_version: 0,
  };
}

const allRows = Array.from({ length: 1_001 }, (_, index) => row(index));

vi.mock('@/integrations/supabase/magazine-schema', () => ({
  magazineDb: {
    from: (table: string) => {
      const query: Record<string, unknown> = {};
      for (const method of ['select', 'eq', 'is', 'order']) query[method] = () => query;
      query.in = (_column: string, values: string[]) => {
        if (table === 'magazine_items') state.itemIdBatches.push(values);
        return query;
      };
      query.range = (from: number, to: number) => {
        if (table === 'magazines') {
          state.magazineRanges.push([from, to]);
          return Promise.resolve({ data: allRows.slice(from, to + 1), error: null });
        }
        return Promise.resolve({ data: [], error: null });
      };
      return query;
    },
  },
}));

describe('magazineService.list — paginação estável', () => {
  it('carrega além do limite padrão de 1000 linhas', async () => {
    state.magazineRanges.length = 0;
    state.itemIdBatches.length = 0;
    const { magazineService } = await import('../magazineService');
    const magazines = await magazineService.list('owner-1');
    expect(magazines).toHaveLength(1_001);
    expect(state.magazineRanges).toEqual([
      [0, 999],
      [1_000, 1_999],
    ]);
    expect(state.itemIdBatches).toHaveLength(11);
    expect(state.itemIdBatches.every((batch) => batch.length <= 100)).toBe(true);
    expect(state.itemIdBatches.flat()).toHaveLength(1_001);
  });
});
