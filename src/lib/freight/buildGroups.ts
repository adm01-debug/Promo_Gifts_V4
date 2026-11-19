/**
 * Divide as peças em grupos que não compartilham caixa.
 *
 * Dois controles decidem, e o do cadastro vence o do vendedor:
 *
 * 1. `shipsSeparately` no produto ("não mistura": frágil, líquido, volumoso)
 *    sempre ganha caixa própria.
 * 2. a escolha do vendedor no orçamento: `misturar` junta o resto num grupo,
 *    `separar` dá um grupo por produto.
 */
import type { MixMode, PackItem } from './types';

/** Por que estas peças estão juntas (ou sozinhas). */
export type GroupReason = 'mixed' | 'ships_separately' | 'single_product';

export interface PackGroup {
  /** Nunca vazio, e o tipo garante: quem consome lê `items[0]` sem checar. */
  items: [PackItem, ...PackItem[]];
  reason: GroupReason;
}

/**
 * Ordem estável por `productId`: o plano salvo no orçamento é comparado com o
 * recalculado, e uma ordem que variasse marcaria plano desatualizado sem nada
 * ter mudado.
 */
function porProductId(a: PackItem, b: PackItem): number {
  return a.productId < b.productId ? -1 : a.productId > b.productId ? 1 : 0;
}

export function buildGroups(items: readonly PackItem[], mixMode: MixMode): PackGroup[] {
  const ordenados = [...items].sort(porProductId);

  const separados = ordenados.filter((item) => item.shipsSeparately);
  const restantes = ordenados.filter((item) => !item.shipsSeparately);

  const grupos: PackGroup[] = separados.map((item) => ({
    items: [item],
    reason: 'ships_separately',
  }));

  const [primeiro, ...demais] = restantes;
  if (primeiro) {
    if (mixMode === 'misturar') {
      grupos.push({ items: [primeiro, ...demais], reason: 'mixed' });
    } else {
      for (const item of restantes) {
        grupos.push({ items: [item], reason: 'single_product' });
      }
    }
  }

  return grupos;
}
