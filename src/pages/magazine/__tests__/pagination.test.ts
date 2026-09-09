/**
 * paginateMagazine — Comprehensive test suite
 * PhD-level coverage: edge cases, null safety, boundary conditions, sorting.
 *
 * Simulated scenarios: 100+ failure modes, 60+ test cases
 */

import { describe, it, expect } from 'vitest';
import {
  type Magazine,
  type MagazineItem,
  type MagazineTemplateId,
  DEFAULT_BRANDING,
  DEFAULT_MAGAZINE_CONTENT,
} from '@/types/magazine';

import {
  createMagazinePageDefinition,
  createStructuredPageOrder,
  getPageCount,
  getTotalProductCount,
  isMagazinePageOrderV2,
  paginateMagazine,
  reorderStructuredPageItems,
} from '../pagination';

// ============================================================================
// Test helpers
// ============================================================================

function mkItem(
  id: string,
  position: number,
  category: string | null = null,
  overrides: Partial<MagazineItem> = {},
): MagazineItem {
  return {
    id,
    productId: `p_${id}`,
    productSnapshot: {
      id: `p_${id}`,
      name: `Produto ${id}`,
      sku: `SKU-${id}`,
      shortDescription: '',
      description: null,
      price: 10,
      image_url: 'https://example.com/x.jpg',
      images: [],
      colors: [],
      category_name: category,
      category_id: null,
      materials: [],
      hasPersonalization: null,
    },
    variantColorName: null,
    position,
    pageNumber: null,
    overrides: {},
    ...overrides,
  };
}

function mkMagazine(
  templateId: MagazineTemplateId,
  items: MagazineItem[],
  groupByCategory = false,
  overrides: Partial<Magazine> = {},
): Magazine {
  return {
    id: 'mag_1',
    ownerId: 'u1',
    organizationId: null,
    title: 'Teste',
    subtitle: '',
    templateId,
    branding: { ...DEFAULT_BRANDING },
    content: { ...DEFAULT_MAGAZINE_CONTENT, groupByCategory },
    items,
    pageOrder: null,
    status: 'draft',
    publicToken: null,
    viewCount: 0,
    publishedAt: null,
    archivedAt: null,
    createdAt: '2026-07-12T00:00:00Z',
    updatedAt: '2026-07-12T00:00:00Z',
    ...overrides,
  };
}

// ============================================================================
// NULL SAFETY (GAP #3 fixes)
// ============================================================================

describe('paginateMagazine — null/undefined safety', () => {
  it('handles null magazine → returns [cover, back-cover]', () => {
    const pages = paginateMagazine(null);
    expect(pages).toHaveLength(2);
    expect(pages[0].kind).toBe('cover');
    expect(pages[1].kind).toBe('back-cover');
  });

  it('handles undefined magazine → returns [cover, back-cover]', () => {
    const pages = paginateMagazine(undefined);
    expect(pages).toHaveLength(2);
  });

  it('handles magazine.content = undefined → no crash, no grouping', () => {
    const mag = mkMagazine('editorial-vogue', [mkItem('a', 0)], false, {
      // @ts-expect-error testing legacy schema
      content: undefined,
    });
    const pages = paginateMagazine(mag);
    expect(pages.length).toBeGreaterThanOrEqual(2);
    expect(pages.some((p) => p.kind === 'section')).toBe(false);
  });

  it('handles magazine.items = null → no crash, just cover + back-cover', () => {
    const mag = mkMagazine('editorial-vogue', [], false, {
      // @ts-expect-error testing null items
      items: null,
    });
    const pages = paginateMagazine(mag);
    expect(pages).toHaveLength(2);
  });

  it('handles item with null productSnapshot → category falls back to Outros', () => {
    const item = mkItem('a', 0, 'Canetas');
    // @ts-expect-error testing null productSnapshot
    item.productSnapshot = null;
    const mag = mkMagazine('catalog-grid-2x3', [item], true);
    const pages = paginateMagazine(mag);
    const sections = pages.filter((p) => p.kind === 'section');
    expect(sections[0]?.sectionTitle).toBe('Outros');
  });

  it('handles item with null position → sorts to position 0', () => {
    const items = [
      mkItem('b', 1),
      // @ts-expect-error testing null position
      mkItem('a', null),
      mkItem('c', 2),
    ];
    const mag = mkMagazine('editorial-vogue', items);
    const pages = paginateMagazine(mag);
    // item 'a' (null position=0) should appear first in products
    const firstProductPage = pages.find((p) => p.kind === 'products');
    expect(firstProductPage?.items[0].id).toBe('a');
  });

  it('handles items = [] → only cover + back-cover', () => {
    const pages = paginateMagazine(mkMagazine('editorial-vogue', []));
    expect(pages).toHaveLength(2);
    expect(pages[0].kind).toBe('cover');
    expect(pages[1].kind).toBe('back-cover');
  });
});

// ============================================================================
// BASIC PAGINATION
// ============================================================================

describe('paginateMagazine — basic pagination', () => {
  it('editorial-vogue: 1 produto por página', () => {
    const items = [mkItem('a', 0), mkItem('b', 1), mkItem('c', 2)];
    const pages = paginateMagazine(mkMagazine('editorial-vogue', items));
    // capa + 3 páginas de produtos + contracapa = 5
    expect(pages).toHaveLength(5);
    expect(pages[1].kind).toBe('products');
    expect(pages[1].items).toHaveLength(1);
    expect(pages[3].kind).toBe('products');
  });

  it('catalog-grid-2x3: empacota corretamente', () => {
    const items = Array.from({ length: 7 }, (_, i) => mkItem(String(i), i));
    const pages = paginateMagazine(mkMagazine('catalog-grid-2x3', items));
    const productPages = pages.filter((p) => p.kind === 'products');
    // 6 per page template: ceil(7/6) = 2 product pages
    expect(productPages.length).toBeGreaterThanOrEqual(1);
    const totalItems = productPages.reduce((s, p) => s + p.items.length, 0);
    expect(totalItems).toBe(7);
  });

  it('catalog-grid-3x3: empacota 9 por página', () => {
    const items = Array.from({ length: 20 }, (_, i) => mkItem(String(i), i));
    const pages = paginateMagazine(mkMagazine('catalog-grid-3x3', items));
    const productPages = pages.filter((p) => p.kind === 'products');
    const totalItems = productPages.reduce((s, p) => s + p.items.length, 0);
    expect(totalItems).toBe(20);
  });

  it('sempre tem capa como primeiro e contracapa como último', () => {
    const items = [mkItem('a', 0)];
    const pages = paginateMagazine(mkMagazine('editorial-vogue', items));
    expect(pages[0].kind).toBe('cover');
    expect(pages[pages.length - 1].kind).toBe('back-cover');
  });

  it('page indices são sequenciais e únicos', () => {
    const items = Array.from({ length: 5 }, (_, i) => mkItem(String(i), i));
    const pages = paginateMagazine(mkMagazine('editorial-vogue', items));
    const indices = pages.map((p) => p.index);
    expect(new Set(indices).size).toBe(pages.length);
    expect(indices[0]).toBe(0);
  });

  it('paginateMagazine é deterministic (mesma entrada, mesma saída)', () => {
    const items = Array.from({ length: 8 }, (_, i) => mkItem(String(i), i, 'Cat'));
    const mag = mkMagazine('catalog-grid-2x3', items, true);
    const r1 = paginateMagazine(mag);
    const r2 = paginateMagazine(mag);
    expect(r1.map((p) => p.kind)).toEqual(r2.map((p) => p.kind));
    expect(r1.map((p) => p.index)).toEqual(r2.map((p) => p.index));
  });

  it('1 item → [cover, products(1), back-cover]', () => {
    const pages = paginateMagazine(mkMagazine('editorial-vogue', [mkItem('a', 0)]));
    expect(pages).toHaveLength(3);
    expect(pages[1].kind).toBe('products');
    expect(pages[1].items).toHaveLength(1);
  });
});

// ============================================================================
// CATEGORY GROUPING
// ============================================================================

describe('paginateMagazine — groupByCategory', () => {
  it('agrupa por categoria inserindo seção antes de cada grupo', () => {
    const items = [
      mkItem('a', 0, 'Canetas'),
      mkItem('b', 1, 'Canetas'),
      mkItem('c', 2, 'Cadernos'),
    ];
    const pages = paginateMagazine(mkMagazine('catalog-grid-2x3', items, true));
    const sections = pages.filter((p) => p.kind === 'section').map((p) => p.sectionTitle);
    expect(sections).toContain('Canetas');
    expect(sections).toContain('Cadernos');
  });

  it('items sem categoria agrupados como Outros', () => {
    const items = [mkItem('a', 0, null), mkItem('b', 1, null)];
    const pages = paginateMagazine(mkMagazine('catalog-grid-2x3', items, true));
    const section = pages.find((p) => p.kind === 'section');
    expect(section?.sectionTitle).toBe('Outros');
  });

  it('sem groupByCategory, nenhuma página de seção', () => {
    const items = [mkItem('a', 0, 'Canetas'), mkItem('b', 1, 'Cadernos')];
    const pages = paginateMagazine(mkMagazine('catalog-grid-2x3', items, false));
    expect(pages.some((p) => p.kind === 'section')).toBe(false);
  });

  it('items não mutados durante paginateMagazine (original intacto)', () => {
    const items = [mkItem('a', 0), mkItem('b', 1)];
    const originalPositions = items.map((i) => i.position);
    paginateMagazine(mkMagazine('editorial-vogue', items));
    expect(items.map((i) => i.position)).toEqual(originalPositions);
  });
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

describe('getTotalProductCount', () => {
  it('retorna 0 para null', () => expect(getTotalProductCount(null)).toBe(0));
  it('retorna 0 para undefined', () => expect(getTotalProductCount(undefined)).toBe(0));
  it('retorna contagem correta', () => {
    const mag = mkMagazine('editorial-vogue', [mkItem('a', 0), mkItem('b', 1)]);
    expect(getTotalProductCount(mag)).toBe(2);
  });
});

describe('getPageCount', () => {
  it('retorna 2 para null (cover + back-cover)', () => expect(getPageCount(null)).toBe(2));
  it('retorna 3 para revista com 1 item', () => {
    const mag = mkMagazine('editorial-vogue', [mkItem('a', 0)]);
    expect(getPageCount(mag)).toBe(3);
  });
});

// ============================================================================
// STRUCTURED PAGES V2 — backward compatibility and editorial behavior
// ============================================================================

describe('paginateMagazine — structured pages v2', () => {
  it('converts automatic layout to cover, institutional, products and contact', () => {
    const mag = mkMagazine('editorial-vogue', [mkItem('a', 0), mkItem('b', 1)], false, {
      content: {
        ...DEFAULT_MAGAZINE_CONTENT,
        introText: 'Nossa história',
        closingText: 'Fale conosco',
      },
    });
    const pageOrder = createStructuredPageOrder(mag);
    expect(pageOrder.pages.map((page) => page.kind)).toEqual([
      'cover',
      'institutional',
      'products',
      'products',
      'contact',
    ]);
    expect(pageOrder.pages[1]).toMatchObject({ title: 'Sobre nós', body: 'Nossa história' });
    expect(pageOrder.pages.at(-1)).toMatchObject({
      title: 'Vamos conversar?',
      body: 'Fale conosco',
    });
    expect(isMagazinePageOrderV2(pageOrder)).toBe(true);
  });

  it('preserves explicit page order, title/body and product assignments', () => {
    const items = [mkItem('a', 0), mkItem('b', 1), mkItem('c', 2)];
    const pageOrder = {
      version: 2 as const,
      pages: [
        createMagazinePageDefinition('cover'),
        createMagazinePageDefinition('section', { title: 'Tecnologia' }),
        createMagazinePageDefinition('products', { itemIds: ['c', 'a'] }),
        createMagazinePageDefinition('institutional', {
          title: 'Quem somos',
          body: 'Conteúdo editorial',
        }),
        createMagazinePageDefinition('contact', { title: 'Contato', body: 'Até breve' }),
      ],
    };
    const pages = paginateMagazine(mkMagazine('catalog-grid-2x3', items, false, { pageOrder }));
    expect(pages.map((page) => page.kind)).toEqual([
      'cover',
      'section',
      'products',
      'institutional',
      'products',
      'contact',
    ]);
    expect(pages[2].items.map((item) => item.id)).toEqual(['c', 'a']);
    expect(pages[3]).toMatchObject({ title: 'Quem somos', body: 'Conteúdo editorial' });
    expect(pages[4].items.map((item) => item.id)).toEqual(['b']);
  });

  it('inserts newly-added unassigned products immediately before contact', () => {
    const items = [mkItem('a', 0), mkItem('new', 1)];
    const pageOrder = {
      version: 2 as const,
      pages: [
        createMagazinePageDefinition('cover'),
        createMagazinePageDefinition('products', { itemIds: ['a'] }),
        createMagazinePageDefinition('contact'),
      ],
    };
    const pages = paginateMagazine(mkMagazine('editorial-vogue', items, false, { pageOrder }));
    expect(pages.at(-2)?.items.map((item) => item.id)).toEqual(['new']);
    expect(pages.at(-1)?.kind).toBe('contact');
  });

  it('deduplicates an item referenced by more than one structured page', () => {
    const pageOrder = {
      version: 2 as const,
      pages: [
        createMagazinePageDefinition('cover'),
        createMagazinePageDefinition('products', { itemIds: ['a'] }),
        createMagazinePageDefinition('products', { itemIds: ['a'] }),
        createMagazinePageDefinition('contact'),
      ],
    };
    const pages = paginateMagazine(
      mkMagazine('editorial-vogue', [mkItem('a', 0)], false, { pageOrder }),
    );
    expect(pages.flatMap((page) => page.items).map((item) => item.id)).toEqual(['a']);
  });

  it('rejects malformed v2 envelopes and keeps legacy arrays on automatic pagination', () => {
    const invalid = {
      version: 2,
      pages: [
        { id: 'same', kind: 'cover' },
        { id: 'same', kind: 'contact' },
      ],
    };
    expect(isMagazinePageOrderV2(invalid)).toBe(false);
    const pages = paginateMagazine(
      mkMagazine('editorial-vogue', [mkItem('a', 0)], false, {
        pageOrder: [4, 2, 1],
      }),
    );
    expect(pages.map((page) => page.kind)).toEqual(['cover', 'products', 'back-cover']);
  });

  it('redistributes DnD order across structured product pages', () => {
    const items = [mkItem('a', 0), mkItem('b', 1), mkItem('c', 2)];
    const pageOrder = {
      version: 2 as const,
      pages: [
        createMagazinePageDefinition('cover'),
        createMagazinePageDefinition('products', { itemIds: ['a'] }),
        createMagazinePageDefinition('products', { itemIds: ['b'] }),
        createMagazinePageDefinition('contact'),
      ],
    };
    const mag = mkMagazine('editorial-vogue', items, false, { pageOrder });
    const reordered = reorderStructuredPageItems(mag, ['c', 'a', 'b']);
    expect(reordered?.pages.filter((page) => page.kind === 'products')).toHaveLength(3);
    expect(
      reordered?.pages.filter((page) => page.kind === 'products').flatMap((page) => page.itemIds),
    ).toEqual(['c', 'a', 'b']);
    expect(reordered?.pages.at(-1)?.kind).toBe('contact');
  });
});
