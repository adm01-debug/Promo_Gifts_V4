/**
 * Multiplica as quantidades das peças pelo número de kits/conjuntos pedidos.
 *
 * O orçamento e o simulador falam em "N kits"; o empacotador só entende peças.
 * Esta é a única tradução entre os dois, e ela valida a entrada em vez de
 * confiar nela: meio kit ou zero kit não é um plano de frete, é erro de tela.
 *
 * O erro é **retornado**, nunca lançado — o motor é puro e quem chama precisa
 * decidir o que mostrar sem envolver try/catch.
 */
import type { PackItem, ValidationError } from './types';

export type ExpandResult =
  { status: 'error'; error: ValidationError } | { status: 'ok'; items: PackItem[] };

function isPositiveInteger(value: number): boolean {
  return Number.isInteger(value) && value > 0;
}

export function expandQuantities(items: readonly PackItem[], kitQuantity = 1): ExpandResult {
  if (!isPositiveInteger(kitQuantity)) {
    return {
      status: 'error',
      error: {
        code: 'invalid_kit_quantity',
        message: `Quantidade de kits inválida: ${kitQuantity}. Informe um número inteiro maior que zero.`,
      },
    };
  }

  for (const item of items) {
    if (!isPositiveInteger(item.quantity)) {
      return {
        status: 'error',
        error: {
          code: 'invalid_item_quantity',
          message: `Quantidade inválida para ${item.name}: ${item.quantity}. Informe um número inteiro maior que zero.`,
          productId: item.productId,
        },
      };
    }
  }

  return {
    status: 'ok',
    items: items.map((item) => ({ ...item, quantity: item.quantity * kitQuantity })),
  };
}
