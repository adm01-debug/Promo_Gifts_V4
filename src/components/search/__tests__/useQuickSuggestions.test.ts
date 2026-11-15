import { describe, expect, it } from 'vitest';
import type { CategoryIcon } from '@/hooks/products/useCategoryIcons';
import { buildQuickSuggestions } from '../useQuickSuggestions';

const row = (name: string | null) => ({ category_name: name }) as unknown as CategoryIcon;

describe('buildQuickSuggestions', () => {
  it('retorna vazio sem dados', () => {
    expect(buildQuickSuggestions(undefined)).toEqual([]);
    expect(buildQuickSuggestions([])).toEqual([]);
  });

  it('ordena, remove repetidos/vazios e limita a 6', () => {
    const rows = ['Squeezes', 'Canecas', 'Canecas', ' ', null, 'Bolsas', 'Agendas', 'Chaveiros', 'Mochilas', 'Kits'].map(
      row,
    );
    expect(buildQuickSuggestions(rows).map((s) => s.label)).toEqual([
      'Agendas',
      'Bolsas',
      'Canecas',
      'Chaveiros',
      'Kits',
      'Mochilas',
    ]);
  });
});
