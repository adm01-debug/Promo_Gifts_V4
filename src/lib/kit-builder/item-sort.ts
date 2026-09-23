/**
 * Item Sort
 * Comparador puro para a opção "Mais relevantes" do ItemSelector.
 */
import type { CompatibilityResult, KitItem } from './types';

export interface RelevanceSortable extends KitItem {
  compatibility?: CompatibilityResult | null;
}

/**
 * Itens compatíveis com a caixa selecionada vêm primeiro; sem caixa selecionada
 * (compatibility null/undefined em todos os itens) a ordem original do catálogo
 * é preservada — Array.prototype.sort é estável no runtime alvo (V8/Node ≥ 12).
 */
export function sortItemsByRelevance<T extends RelevanceSortable>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const aFits = a.compatibility ? a.compatibility.fits : true;
    const bFits = b.compatibility ? b.compatibility.fits : true;
    if (aFits === bFits) return 0;
    return aFits ? -1 : 1;
  });
}
