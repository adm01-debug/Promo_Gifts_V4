import { describe, expect, it } from 'vitest';
import { sortItemsByRelevance, type RelevanceSortable } from '@/lib/kit-builder/item-sort';

function makeItem(overrides: Partial<RelevanceSortable> = {}): RelevanceSortable {
  return {
    id: 'p1',
    name: 'Item',
    sku: 'SKU',
    imageUrl: null,
    price: 10,
    quantity: 1,
    width: 1,
    height: 1,
    depth: 1,
    volume: 1,
    compatibility: null,
    ...overrides,
  };
}

describe('sortItemsByRelevance', () => {
  it('preserves catalog order when no box is selected (compatibility null on every item)', () => {
    const items = [
      makeItem({ id: 'a' }),
      makeItem({ id: 'b' }),
      makeItem({ id: 'c' }),
    ];

    expect(sortItemsByRelevance(items).map((i) => i.id)).toEqual(['a', 'b', 'c']);
  });

  it('moves compatible items ahead of incompatible ones while keeping relative order stable', () => {
    const items = [
      makeItem({ id: 'incompatible-1', compatibility: { fits: false } }),
      makeItem({ id: 'compatible-1', compatibility: { fits: true } }),
      makeItem({ id: 'incompatible-2', compatibility: { fits: false } }),
      makeItem({ id: 'compatible-2', compatibility: { fits: true } }),
    ];

    expect(sortItemsByRelevance(items).map((i) => i.id)).toEqual([
      'compatible-1',
      'compatible-2',
      'incompatible-1',
      'incompatible-2',
    ]);
  });

  it('treats a missing compatibility result as fitting (pending validation, not excluded)', () => {
    const items = [
      makeItem({ id: 'incompatible', compatibility: { fits: false } }),
      makeItem({ id: 'pending', compatibility: undefined }),
    ];

    expect(sortItemsByRelevance(items).map((i) => i.id)).toEqual(['pending', 'incompatible']);
  });

  it('does not mutate the input array', () => {
    const items = [
      makeItem({ id: 'a', compatibility: { fits: false } }),
      makeItem({ id: 'b', compatibility: { fits: true } }),
    ];
    const original = [...items];

    sortItemsByRelevance(items);

    expect(items).toEqual(original);
  });
});
