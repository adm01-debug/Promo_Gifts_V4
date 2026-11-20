/**
 * Divide as peças em grupos que não compartilham caixa.
 *
 * Dois controles decidem, e o do cadastro vence o do vendedor:
 *
 * 1. `shipsSeparately` no produto ("não mistura": frágil, líquido, volumoso)
 *    sempre ganha caixa própria.
 * 2. a escolha do vendedor no orçamento: `misturar` junta o resto num grupo,
 *    `separar` dá um grupo por produto.
 *
 * "Por produto" é por `productId`, não por linha: o mesmo produto em três
 * cores chega como três linhas e vai junto na mesma caixa. Agrupar por linha
 * abriria três caixas P para 60 cadernetas que cabem em uma (64).
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
  return a.productId < b.productId ? -1 : 1;
}

/**
 * Soma as linhas do mesmo produto numa peça só. As medidas são do cadastro do
 * produto, então a primeira linha vale por todas — `planFreight` bloqueia antes
 * o pedido em que elas divergem; "não mistura" em qualquer linha vale para o
 * produto.
 */
function somarPorProduto(items: readonly PackItem[]): PackItem[] {
  const porId = new Map<string, PackItem>();
  for (const item of items) {
    const anterior = porId.get(item.productId);
    porId.set(
      item.productId,
      anterior
        ? {
            ...anterior,
            quantity: anterior.quantity + item.quantity,
            shipsSeparately: anterior.shipsSeparately || item.shipsSeparately,
          }
        : item,
    );
  }
  return [...porId.values()];
}

export function buildGroups(items: readonly PackItem[], mixMode: MixMode): PackGroup[] {
  const ordenados = somarPorProduto(items).sort(porProductId);

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
