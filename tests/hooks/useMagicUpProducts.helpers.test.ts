import { beforeEach, describe, it, expect, vi } from 'vitest';
const m = vi.hoisted(() => ({ fetch: vi.fn() }));
vi.mock('@/lib/external-db', () => ({ fetchPromobrindProducts: m.fetch }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: vi.fn() } }));
vi.mock('@/lib/crm-db', () => ({ searchCrm: vi.fn() }));
import { fetchMagicUpProducts } from '@/hooks/intelligence/useMagicUpState.helpers';
const row = (id, name = 'Caneta') => ({
  id,
  name,
  sku: 'SKU-' + id,
  images: ['https://cdn.test/' + id + '-a', 'https://cdn.test/' + id + '-b'],
  primary_image_url: 'https://cdn.test/primary-' + id,
  image_url: 'https://cdn.test/legacy-' + id,
  og_image_url: 'https://cdn.test/og-' + id,
});
beforeEach(() => {
  vi.clearAllMocks();
});
describe('Canonical product mapper uses real image records without changing ranking/contracts', () => {
  it('fixes string-image getter while preserving IDs, gallery order and all URLs', async () => {
    const input = row('p1');
    m.fetch.mockResolvedValue([input]);
    const [p] = await fetchMagicUpProducts('');
    expect(input.images[0].url_cdn).toBeUndefined();
    expect(p.images[0].url_cdn).toBe(input.images[0]);
    expect(p).toEqual({
      id: input.id,
      name: input.name,
      sku: input.sku,
      images: input.images.map((url_cdn) => ({ url_cdn })),
      primary_image_url: input.primary_image_url,
      og_image_url: input.og_image_url,
    });
    expect(m.fetch).toHaveBeenCalledWith({ search: undefined, limit: 50 });
  });
  it.each([
    [null, 'legacy'],
    ['primary', 'primary'],
  ])('preserves primary/image_url precedence %j', async (primary, expected) => {
    m.fetch.mockResolvedValue([{ ...row('p'), primary_image_url: primary, image_url: 'legacy' }]);
    expect((await fetchMagicUpProducts(''))[0].primary_image_url).toBe(expected);
  });
  it('preserves FTS candidates, name-match ranking, diacritics and limit50', async () => {
    m.fetch.mockResolvedValue([
      row('fts', 'Outros'),
      ...Array.from({ length: 52 }, (_, i) => row('m' + i, 'Mochíla ' + i)),
    ]);
    const out = await fetchMagicUpProducts('mochila');
    expect(m.fetch).toHaveBeenCalledWith({ search: 'mochila', limit: 150 });
    expect(out).toHaveLength(50);
    expect(out[0].id).toBe('m0');
    expect(out[49].id).toBe('m49');
  });
  it('normalizes absent image galleries without inventing image URLs', async () => {
    m.fetch.mockResolvedValue([
      {
        id: 'real',
        name: 'Produto',
        sku: 'REAL',
        images: null,
        primary_image_url: null,
        image_url: null,
        og_image_url: null,
      },
    ]);
    expect((await fetchMagicUpProducts(''))[0]).toMatchObject({
      images: [],
      primary_image_url: null,
      og_image_url: null,
    });
  });
  it('propagates server failure for the caller to show a real error', async () => {
    m.fetch.mockRejectedValue(Error('offline'));
    await expect(fetchMagicUpProducts('x')).rejects.toThrow('offline');
  });
});
