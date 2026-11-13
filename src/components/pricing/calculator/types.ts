/**
 * Types for QuantityPriceCalculator module.
 */

export interface CalcProduct {
  id: string;
  name: string;
  sku: string;
  price: number;
  images: string[] | null | undefined;
  category_name: string | null;
}

export interface ProductTechnique {
  id: string;
  techniqueId: string;
  techniqueName: string;
  techniqueCode: string;
  componentName: string;
  locationName: string;
  locationCode: string;
  composedCode: string;
  maxWidth: number | null;
  maxHeight: number | null;
  maxArea: number | null;
  maxColors: number | null;
  isDefault: boolean;
}

export interface SelectedTechniqueConfig {
  technique: ProductTechnique;
  colors: number;
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('pt-BR').format(value);
}
