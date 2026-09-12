import { describe, expect, it } from 'vitest';
import { resolveKitAICompositions } from '@/lib/kit-builder/ai-composition';
import type { KitAISuggestionBrief, KitBox, KitItem } from '@/lib/kit-builder/types';

const item = (id: string, name: string, price: number): KitItem => ({
  id,
  name,
  sku: id,
  imageUrl: null,
  price,
  width: 2,
  height: 2,
  depth: 2,
  volume: 8,
  dimensionsKnown: true,
  quantity: 1,
});

const box: KitBox = {
  id: 'box-1',
  name: 'Caixa Kraft Premium',
  sku: 'BOX-1',
  imageUrl: null,
  price: 20,
  internalWidth: 30,
  internalHeight: 20,
  internalDepth: 20,
  internalVolume: 12_000,
  dimensionsKnown: true,
  material: 'kraft',
};

const brief: KitAISuggestionBrief = {
  kit_type: 'montado',
  box_keywords: ['kraft'],
  item_keywords: ['garrafa', 'caderno', 'caneta'],
  target_price_brl: { min: 80, max: 150 },
  narrative: 'Uma composição corporativa equilibrada.',
};

describe('resolveKitAICompositions', () => {
  it('returns catalog-backed alternatives under budget with a compatible package', () => {
    const alternatives = resolveKitAICompositions(
      brief,
      [
        item('p1', 'Garrafa térmica', 45),
        item('p2', 'Caderno executivo', 25),
        item('p3', 'Caneta', 10),
      ],
      [box],
    );

    expect(alternatives.length).toBeGreaterThan(0);
    expect(alternatives[0].box.id).toBe('box-1');
    expect(alternatives[0].items.map((candidate) => candidate.id)).toEqual(
      expect.arrayContaining(['p1', 'p2', 'p3']),
    );
    expect(alternatives[0].unitPrice).toBeLessThanOrEqual(150);
    expect(alternatives[0].items.every((candidate) => Boolean(candidate.lineId))).toBe(true);
  });

  it('fails closed when no real composition fits the budget', () => {
    expect(
      resolveKitAICompositions(
        { ...brief, target_price_brl: { min: 1, max: 10 } },
        [item('p1', 'Garrafa', 45)],
        [box],
      ),
    ).toEqual([]);
  });

  it('backtracks items to reserve the package budget', () => {
    const alternatives = resolveKitAICompositions(
      { ...brief, target_price_brl: { min: 80, max: 90 } },
      [
        item('p1', 'Garrafa térmica', 45),
        item('p2', 'Caderno executivo', 25),
        item('p3', 'Caneta', 10),
      ],
      [box],
    );

    expect(alternatives[0]).toMatchObject({ unitPrice: 90 });
    expect(alternatives[0].items.map((candidate) => candidate.id)).toEqual(
      expect.arrayContaining(['p1', 'p2']),
    );
  });

  it('never presents a composition below the requested minimum', () => {
    expect(
      resolveKitAICompositions(
        { ...brief, target_price_brl: { min: 250, max: 500 } },
        [item('p1', 'Garrafa', 45), item('p2', 'Caderno', 25)],
        [box],
      ),
    ).toEqual([]);
  });

  it('rejects an inverted budget range instead of silently changing its meaning', () => {
    expect(
      resolveKitAICompositions(
        { ...brief, target_price_brl: { min: 200, max: 100 } },
        [item('p1', 'Garrafa', 45)],
        [box],
      ),
    ).toEqual([]);
  });

  it('continues searching when the first six ranked candidates do not fit any box', () => {
    const tooLarge = Array.from({ length: 6 }, (_, index) => ({
      ...item(`large-${index}`, `Garrafa corporativa ${index}`, 10),
      width: 100,
      height: 100,
      depth: 100,
      volume: 1_000_000,
    }));
    const validSeventh = item('valid-7', 'Garrafa corporativa compacta', 70);

    const alternatives = resolveKitAICompositions(brief, [...tooLarge, validSeventh], [box]);

    expect(alternatives[0]?.items).toEqual([
      expect.objectContaining({ id: 'valid-7' }),
    ]);
    expect(alternatives[0]?.unitPrice).toBe(90);
  });
});
