import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import {
  useSupplierComparison,
  getSupplierProductsInCategory,
  normalizeMaterials,
  normalizeColorNames,
  jaccard,
} from '@/hooks/products/useSupplierComparison';
import { Product } from '@/types/product-catalog';

// Mock products data
const mockBaseProduct: Product = {
  id: 'base-1',
  name: 'Caneca de Cerâmica 350ml',
  price: 50.0,
  sku: 'BASE-01',
  stock: 100,
  colors: [{ name: 'Branco', hex: '#FFF', group: 'Branco' }],
  materials: ['Cerâmica'],
  category: { id: 'cat-1', name: 'Canecas' },
  supplier: { id: 'supp-1', name: 'S1' },
  stockStatus: 'in-stock',
  images: [],
  minQuantity: 50,
  featured: false,
  newArrival: false,
  onSale: false,
  isKit: false,
  tags: { publicoAlvo: [], datasComemorativas: [], endomarketing: [], ramo: [], nicho: [] },
  is_active: true,
};

const mockAlt1: Product = {
  ...mockBaseProduct,
  id: 'alt-1',
  name: 'Caneca Cerâmica Branca',
  price: 40.0,
  sku: 'ALT-01',
  stock: 200,
  supplier: { id: 'supp-2', name: 'S2' },
};

const mockAlt2: Product = {
  ...mockBaseProduct,
  id: 'alt-2',
  name: 'Copo Térmico', // Not similar enough
  price: 30.0,
  sku: 'ALT-02',
  category: { id: 'cat-1', name: 'Canecas' },
  supplier: { id: 'supp-3', name: 'S3' },
};

// Mock useProducts hook
const mockUseProducts = vi.fn();
vi.mock('@/hooks/products/useProducts', () => ({
  useProducts: (...args: any[]) => mockUseProducts(...args),
}));

describe('useSupplierComparison', () => {
  it('should return null when no product is provided', () => {
    mockUseProducts.mockReturnValue({ data: [], isLoading: false });
    const { result } = renderHook(() => useSupplierComparison(null));
    expect(result.current.result).toBeNull();
  });

  it('should query by category name when the product has no category id', () => {
    mockUseProducts.mockReturnValue({ data: [], isLoading: false });
    const productSemId = {
      ...mockBaseProduct,
      category: { name: 'Canecas' },
    } as Product;
    const { result } = renderHook(() => useSupplierComparison(productSemId));
    // Sem alternativas (data vazia) → result null; o ramo `category: name` foi avaliado.
    expect(result.current.result).toBeNull();
    expect(result.current.isLoading).toBe(false);
    // 2º argumento (options.enabled) deve ser true pois há categoryName.
    expect(mockUseProducts).toHaveBeenCalledWith(
      { category: 'Canecas', limit: 1000 },
      expect.objectContaining({ enabled: true }),
    );
  });

  it('should pass undefined filters when the product has no category at all', () => {
    mockUseProducts.mockReturnValue({ data: [], isLoading: false });
    const productSemCategoria = {
      ...mockBaseProduct,
      category: undefined,
    } as unknown as Product;
    const { result } = renderHook(() => useSupplierComparison(productSemCategoria));
    expect(result.current.result).toBeNull();
    expect(mockUseProducts).toHaveBeenCalledWith(
      undefined,
      expect.objectContaining({ enabled: false }),
    );
  });

  it('should filter and rank alternatives correctly', () => {
    mockUseProducts.mockReturnValue({
      data: [mockBaseProduct, mockAlt1, mockAlt2],
      isLoading: false,
    });

    const { result } = renderHook(() => useSupplierComparison(mockBaseProduct));

    expect(result.current.result).not.toBeNull();
    const comparison = result.current.result!;

    // Alt 1 should be included, Alt 2 should be filtered out by similarity
    expect(comparison.alternatives).toHaveLength(1);
    expect(comparison.alternatives[0].product.id).toBe('alt-1');

    // Metrics check
    expect(comparison.lowestPrice).toBe(40.0);
    expect(comparison.highestStock).toBe(200);
    expect(comparison.alternatives[0].priceDiff).toBe(-10.0);
    expect(comparison.alternatives[0].isLowestPrice).toBe(true);
    expect(comparison.alternatives[0].isBestStock).toBe(true);
  });

  it('should respect the onlyVerified option', () => {
    const inactiveAlt = { ...mockAlt1, id: 'alt-inactive', is_active: false };
    mockUseProducts.mockReturnValue({
      data: [mockBaseProduct, mockAlt1, inactiveAlt],
      isLoading: false,
    });

    // Test with onlyVerified: true
    const { result: resVerified } = renderHook(() =>
      useSupplierComparison(mockBaseProduct, { onlyVerified: true }),
    );
    expect(resVerified.current.result?.alternatives).toHaveLength(1);
    expect(resVerified.current.result?.alternativesUnfiltered).toHaveLength(2);

    // Test with onlyVerified: false
    const { result: resAll } = renderHook(() =>
      useSupplierComparison(mockBaseProduct, { onlyVerified: false }),
    );
    expect(resAll.current.result?.alternatives).toHaveLength(2);
  });

  it('should sort alternatives by different criteria', () => {
    const altExpensive = { ...mockAlt1, id: 'alt-expensive', price: 100.0, stock: 1000 };
    mockUseProducts.mockReturnValue({
      data: [mockBaseProduct, mockAlt1, altExpensive],
      isLoading: false,
    });

    // Sort by price
    const { result: resPrice } = renderHook(() =>
      useSupplierComparison(mockBaseProduct, { sortBy: 'price' }),
    );
    expect(resPrice.current.result?.alternatives[0].product.id).toBe('alt-1');

    // Sort by stock
    const { result: resStock } = renderHook(() =>
      useSupplierComparison(mockBaseProduct, { sortBy: 'stock' }),
    );
    expect(resStock.current.result?.alternatives[0].product.id).toBe('alt-expensive');

    // Sort by leadTime
    const altFast = { ...mockAlt1, id: 'alt-fast', leadTimeDays: 2 };
    mockUseProducts.mockReturnValue({
      data: [mockBaseProduct, mockAlt1, altFast],
      isLoading: false,
    });
    const { result: resLead } = renderHook(() =>
      useSupplierComparison(mockBaseProduct, { sortBy: 'leadTime' }),
    );
    expect(resLead.current.result?.alternatives[0].product.id).toBe('alt-fast');

    // Sort by commonColors
    const altManyColors = {
      ...mockAlt1,
      id: 'alt-colors',
      colors: [
        { name: 'Branco', hex: '#FFF' },
        { name: 'Azul', hex: '#00F' },
      ],
    };
    mockUseProducts.mockReturnValue({
      data: [mockBaseProduct, mockAlt1, altManyColors],
      isLoading: false,
    });
    const { result: resColors } = renderHook(() =>
      useSupplierComparison(mockBaseProduct, { sortBy: 'commonColors' }),
    );
    // alt-colors has 1 common color (Branco), alt-1 also has 1.
    // Wait, mockBaseProduct has 1 color (Branco).
    // Let's make one have 0.
    const altNoColors = {
      ...mockAlt1,
      id: 'alt-no-colors',
      colors: [{ name: 'Preto', hex: '#000' }],
    };
    mockUseProducts.mockReturnValue({
      data: [mockBaseProduct, altNoColors, altManyColors],
      isLoading: false,
    });
    const { result: resColors2 } = renderHook(() =>
      useSupplierComparison(mockBaseProduct, { sortBy: 'commonColors' }),
    );
    expect(resColors2.current.result?.alternatives[0].product.id).toBe('alt-colors');

    // Default sort (score)
    const { result: resDefault } = renderHook(() => useSupplierComparison(mockBaseProduct));
    expect(resDefault.current.result?.alternatives).toBeDefined();
  });

  describe('getSupplierProductsInCategory', () => {
    it('should group products by supplier correctly', () => {
      const products = [
        { ...mockBaseProduct, supplier: { id: 's1' }, category: { id: 'c1' } },
        { ...mockBaseProduct, id: 'p2', supplier: { id: 's1' }, category: { id: 'c1' } },
        { ...mockBaseProduct, id: 'p3', supplier: { id: 's2' }, category: { id: 'c1' } },
        { ...mockBaseProduct, id: 'p4', supplier: { id: 's1' }, category: { id: 'c2' } }, // different category
      ];

      const map = getSupplierProductsInCategory(products, 'c1');
      expect(map.size).toBe(2);
      expect(map.get('s1')).toHaveLength(2);
      expect(map.get('s2')).toHaveLength(1);
    });
  });

  describe('helpers', () => {
    it('normalizeMaterials should handle non-array', () => {
      expect(normalizeMaterials(null as any)).toEqual([]);
      expect(normalizeMaterials(undefined as any)).toEqual([]);
    });

    it('normalizeColorNames should handle non-array', () => {
      expect(normalizeColorNames(null as any)).toEqual([]);
    });

    it('normalizeColorNames descarta cores sem nome e normaliza acentos', () => {
      const colors = [
        { name: ' Azul Céu ', hex: '#0AF' },
        { hex: '#000' },
        null,
      ] as unknown as Product['colors'];
      expect(normalizeColorNames(colors)).toEqual(['azul ceu']);
    });

    it('jaccard retorna 0 quando um dos conjuntos está vazio', () => {
      expect(jaccard([], ['ceramica'])).toBe(0);
      expect(jaccard(new Set(['ceramica']), [])).toBe(0);
      expect(jaccard(['ceramica', 'inox'], ['ceramica'])).toBe(0.5);
    });
  });

  describe('filtros e cálculos de borda', () => {
    it('enquanto os produtos da categoria não chegam, não há comparação e o loading é repassado', () => {
      mockUseProducts.mockReturnValue({ data: undefined, isLoading: true });
      const { result } = renderHook(() => useSupplierComparison(mockBaseProduct));
      expect(result.current.result).toBeNull();
      expect(result.current.isLoading).toBe(true);
    });

    it('exclui alternativas do mesmo fornecedor, de outra categoria ou com preço inválido', () => {
      const mesmoFornecedor = { ...mockAlt1, id: 'same-supp', supplier: mockBaseProduct.supplier };
      const outraCategoria = {
        ...mockAlt1,
        id: 'other-cat',
        category: { id: 'cat-2', name: 'Copos' },
      };
      const precoZero = { ...mockAlt1, id: 'zero-price', price: 0 };
      const precoNegativo = { ...mockAlt1, id: 'neg-price', price: -5 };
      mockUseProducts.mockReturnValue({
        data: [
          mockBaseProduct,
          mesmoFornecedor,
          outraCategoria,
          precoZero,
          precoNegativo,
          mockAlt1,
        ],
        isLoading: false,
      });
      const { result } = renderHook(() => useSupplierComparison(mockBaseProduct));
      expect(result.current.result?.alternativesUnfiltered.map((a) => a.product.id)).toEqual([
        'alt-1',
      ]);
    });

    it('retorna null quando nenhum produto da categoria é alternativa válida', () => {
      const mesmoFornecedor = { ...mockAlt1, id: 'same-supp', supplier: mockBaseProduct.supplier };
      mockUseProducts.mockReturnValue({
        data: [mockBaseProduct, mesmoFornecedor, mockAlt2],
        isLoading: false,
      });
      const { result } = renderHook(() => useSupplierComparison(mockBaseProduct));
      expect(result.current.result).toBeNull();
    });

    it('subcategoria igual dá bônus que torna similar um nome pouco parecido', () => {
      // "caneca esmaltada grande" x "caneca ceramica 350ml" → jaccard 0,2 + material 0,1 = 0,3 (< 0,4)
      const base = { ...mockBaseProduct, subcategory: 'Canecas de Cerâmica' };
      const mesmaSub = {
        ...mockAlt1,
        id: 'same-sub',
        name: 'Caneca Esmaltada Grande',
        subcategory: ' canecas de cerâmica ',
      };
      const outraSub = {
        ...mockAlt1,
        id: 'other-sub',
        name: 'Caneca Esmaltada Grande',
        subcategory: 'Canecas Térmicas',
      };
      mockUseProducts.mockReturnValue({ data: [base, mesmaSub, outraSub], isLoading: false });
      const { result } = renderHook(() => useSupplierComparison(base));
      expect(result.current.result?.alternatives.map((a) => a.product.id)).toEqual(['same-sub']);
    });

    it('material em comum dá bônus; sem material em comum o produto fica abaixo do limite', () => {
      const comMaterial = { ...mockAlt1, id: 'mat-ok', name: 'Caneca Esmaltada Grande' };
      const semMaterial = {
        ...mockAlt1,
        id: 'mat-no',
        name: 'Caneca Esmaltada Grande',
        materials: ['Inox'],
      };
      mockUseProducts.mockReturnValue({
        data: [mockBaseProduct, comMaterial, semMaterial],
        isLoading: false,
      });
      const { result } = renderHook(() =>
        useSupplierComparison(mockBaseProduct, { minNameSimilarity: 0.3 }),
      );
      expect(result.current.result?.alternatives.map((a) => a.product.id)).toEqual(['mat-ok']);
      expect(result.current.result?.alternatives[0].commonMaterials).toEqual(['ceramica']);
    });

    it('sem MOQ cadastrado usa 1 unidade para economia e pontuação de MOQ', () => {
      const base = { ...mockBaseProduct, minQuantity: undefined };
      const alt = { ...mockAlt1, minQuantity: undefined };
      mockUseProducts.mockReturnValue({ data: [base, alt], isLoading: false });
      const { result } = renderHook(() => useSupplierComparison(base));
      const a = result.current.result!.alternatives[0];
      expect(a.effectiveMOQ).toBe(1);
      expect(a.economiaPorMOQ).toBe(10);
      expect(a.scoreBreakdown.moq).toBeCloseTo(14.85);
      expect(result.current.result!.maxEconomiaPorMOQ).toBe(10);
    });

    it('produto base sem preço não gera variação percentual nem economia', () => {
      const base = { ...mockBaseProduct, price: 0 };
      mockUseProducts.mockReturnValue({ data: [base, mockAlt1], isLoading: false });
      const { result } = renderHook(() => useSupplierComparison(base));
      const a = result.current.result!.alternatives[0];
      expect(a.priceDiff).toBe(40);
      expect(a.priceDiffPercent).toBe(0);
      expect(a.economiaPorMOQ).toBe(0);
      expect(a.isLowestPrice).toBe(false);
    });

    it('sem estoque em nenhum produto o critério estoque pontua 0 (sem NaN)', () => {
      const base = { ...mockBaseProduct, stock: 0 };
      const alt = { ...mockAlt1, stock: 0 };
      mockUseProducts.mockReturnValue({ data: [base, alt], isLoading: false });
      const { result } = renderHook(() => useSupplierComparison(base));
      const a = result.current.result!.alternatives[0];
      expect(result.current.result!.highestStock).toBe(0);
      expect(a.scoreBreakdown.stock).toBe(0);
      expect(Number.isFinite(a.score)).toBe(true);
    });

    it('ordenar por prazo coloca prazos desconhecidos por último', () => {
      const semPrazo1 = { ...mockAlt1, id: 'lead-null-1', leadTimeDays: null };
      const prazo5 = { ...mockAlt1, id: 'lead-5', leadTimeDays: 5 };
      const semPrazo2 = { ...mockAlt1, id: 'lead-null-2', leadTimeDays: undefined };
      const prazo2 = { ...mockAlt1, id: 'lead-2', leadTimeDays: 2 };
      mockUseProducts.mockReturnValue({
        data: [mockBaseProduct, semPrazo1, prazo5, semPrazo2, prazo2],
        isLoading: false,
      });
      const { result } = renderHook(() =>
        useSupplierComparison(mockBaseProduct, { sortBy: 'leadTime' }),
      );
      const ids = result.current.result!.alternatives.map((a) => a.product.id);
      expect(ids.slice(0, 2)).toEqual(['lead-2', 'lead-5']);
      expect(ids.slice(2).sort()).toEqual(['lead-null-1', 'lead-null-2']);
      expect(result.current.result!.fastestLeadTimeDays).toBe(2);
    });
  });
});
