import { describe, expect, it } from 'vitest';
import {
  evaluateBoxForItems,
  rankBoxesForItems,
  type KitBox,
  type KitItem,
} from '@/lib/kit-builder';

const box = (id: string, dimensions: [number, number, number], price = 10): KitBox => ({
  id,
  name: `Caixa ${id}`,
  sku: id,
  imageUrl: null,
  price,
  internalWidth: dimensions[0],
  internalHeight: dimensions[1],
  internalDepth: dimensions[2],
  internalVolume: dimensions[0] * dimensions[1] * dimensions[2],
  dimensionsKnown: true,
});

const item = (id: string, dimensions: [number, number, number], dimensionsKnown = true): KitItem => ({
  id,
  name: `Item ${id}`,
  sku: id,
  imageUrl: null,
  price: 1,
  width: dimensions[0],
  height: dimensions[1],
  depth: dimensions[2],
  volume: dimensions[0] * dimensions[1] * dimensions[2],
  dimensionsKnown,
  quantity: 1,
});

describe('box recommendations', () => {
  it('prioriza caixa compatível e separa a opção incompatível', () => {
    const compatible = box('compatível', [20, 20, 20], 15);
    const incompatible = box('pequena', [4, 4, 4], 8);
    const composition = [item('garrafa', [5, 5, 10])];

    expect(evaluateBoxForItems(compatible, composition)).toMatchObject({ status: 'compatible' });
    expect(evaluateBoxForItems(incompatible, composition)).toMatchObject({
      status: 'incompatible',
      compatibility: { fits: false, confidence: 'verified' },
    });
    expect(rankBoxesForItems([incompatible, compatible], composition).map((entry) => entry.box.id)).toEqual([
      'compatível',
      'pequena',
    ]);
  });

  it('não transforma estimativa dimensional em compatibilidade confirmada', () => {
    const result = evaluateBoxForItems(box('grande', [20, 20, 20]), [
      item('sem-medida', [5, 5, 5], false),
    ]);
    expect(result).toMatchObject({
      status: 'inconclusive',
      compatibility: { fits: true, confidence: 'unknown' },
    });
  });
});
