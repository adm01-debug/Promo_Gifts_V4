import { describe, expect, it } from 'vitest';
import { defaultFilters } from '@/components/filters/FilterPanel';
import { applyVoiceFilterPatch } from '@/lib/filters/voiceFilterPatch';
import { applyVoiceFilterPatch as compatibleVoiceFilterPatch } from '@/pages/filters/voiceFilterPatch';

describe('legacy voice product filters', () => {
  it('preserves the original helper path as the same public function', () => {
    expect(compatibleVoiceFilterPatch).toBe(applyVoiceFilterPatch);
  });
  it.each([
    [{ minPrice: 0, maxPrice: 0 }, [0, 0]],
    [{ minPrice: 0, maxPrice: 80 }, [0, 80]],
    [{ minPrice: 50, maxPrice: 80 }, [50, 80]],
    [{ minPrice: 100, maxPrice: 80 }, [80, 100]],
    [{ maxPrice: 0 }, [0, 10]],
    [{ minPrice: 0 }, [0, 200]],
    [{ minPrice: 50 }, [50, 200]],
    [{}, [10, 200]],
  ] as const)('applies real price bounds together, including zero: %j', (patch, expected) => {
    const previous = { ...defaultFilters, priceRange: [10, 200] as [number, number] };
    const next = applyVoiceFilterPatch(previous, patch);
    expect(next.priceRange).toEqual(expected);
    expect(previous.priceRange).toEqual([10, 200]);
  });
  it('preserves unrelated filters, does not duplicate repeated selections, and keeps the unbounded sentinel', () => {
    const previous = {
      ...defaultFilters,
      colors: ['Azul'],
      suppliers: ['fornecedor'],
      priceRange: [0, 9999] as [number, number],
    };
    const next = applyVoiceFilterPatch(previous, {
      color: 'Azul',
      category: 'Canetas',
      material: 'Aço',
      minPrice: 12000,
    });
    expect(next.colors).toEqual(['Azul']);
    expect(next.categories).toEqual(['Canetas']);
    expect(next.materiais).toEqual(['Aço']);
    expect(next.suppliers).toEqual(['fornecedor']);
    expect(next.priceRange).toEqual([12000, 9999]);
    expect(previous.categories).toEqual([]);
  });
  it('honors false and zero values instead of retaining an older true/minimum value', () => {
    const previous = {
      ...defaultFilters,
      inStock: true,
      isKit: true,
      featured: true,
      isNew: true,
      hasPersonalization: true,
      onSale: true,
      minStock: 100,
    };
    expect(
      applyVoiceFilterPatch(previous, {
        inStock: false,
        isKit: false,
        featured: false,
        isNew: false,
        hasPersonalization: false,
        onSale: false,
        minStock: 0,
      }),
    ).toMatchObject({
      inStock: false,
      isKit: false,
      featured: false,
      isNew: false,
      hasPersonalization: false,
      onSale: false,
      minStock: 0,
    });
  });
});
