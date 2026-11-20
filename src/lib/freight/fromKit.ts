/**
 * Traduz o kit do kit builder na entrada do motor de frete.
 *
 * O kit só diz **quais** produtos e quantos (`KitItem.id`/`quantity`, `KitBox.id`;
 * `src/lib/kit-builder/types.ts:14`, `:46`). Medida e peso vêm da linha de
 * catálogo (`products`, chave = `products.id`) que quem chama entrega em
 * `catalogo`: é a mesma fonte do orçamento, em cm e g, sem conversão. O
 * `box.id` do kit é um `products.id` (a caixa é um produto do catálogo).
 *
 * Dois formatos, os mesmos da tela do kit:
 *   - com caixa própria: o kit viaja fechado, então a peça de frete é a caixa
 *     do kit. Envelope = medida **externa** da linha de catálogo da caixa
 *     (`height_cm`/`width_cm`/`length_cm`; a interna subestimaria o volume) e
 *     peso = peso da caixa + soma dos itens. `kitQuantity` é quantos kits;
 *   - sem caixa: cada item vira uma linha com a linha de catálogo dele, para
 *     `ships_separately` e o resto entrarem pelo caminho normal do motor.
 *
 * Peso ou medida desconhecidos viram `missing` com o id e o nome **reais** do
 * produto (o painel de pendências monta o link do cadastro com esse id). Com
 * `missing` não há plano parcial: `status: 'incomplete'` e `inputs` vazio.
 */
import type { KitBox, KitItem } from '@/lib/kit-builder/types';

import type { ProductMeasureRow } from './columns';
import type { PlanInput, PlanOptions } from './planFreight';
import { resolveItemDimensions } from './resolveItemDimensions';
import type { IncompleteItem, MissingMeasure, ValidationError } from './types';
import { isKnownMeasure, roundDecimal } from './units';

/** O que o frete precisa do kit: a caixa (ou ausência dela) e as linhas. */
export interface FreightKit {
  box: Pick<KitBox, 'id' | 'name'> | null;
  items: readonly Pick<KitItem, 'id' | 'name' | 'quantity'>[];
}

type KitPackOptions = Pick<PlanOptions, 'kitQuantity' | 'mixMode'>;

export type KitPackInput =
  | { status: 'error'; error: ValidationError }
  | { status: 'incomplete'; inputs: []; options: KitPackOptions; missing: IncompleteItem[] }
  | { status: 'ok'; inputs: PlanInput[]; options: KitPackOptions; missing: [] };

type Catalogo = ReadonlyMap<string, ProductMeasureRow>;

const TODAS_AS_MEDIDAS: MissingMeasure[] = ['height', 'length', 'weight', 'width'];

/** `ships_separately` ainda não está em `ProductMeasureRow` (bloco D): lê se vier. */
function shipsSeparately(row: ProductMeasureRow): boolean {
  return 'ships_separately' in row && row.ships_separately === true;
}

/** Linha de item sem catálogo: nada se sabe dele, então tudo falta. */
function semCatalogo(item: Pick<KitItem, 'id' | 'name'>): IncompleteItem {
  return { productId: item.id, name: item.name, missing: TODAS_AS_MEDIDAS };
}

/** Item dentro da caixa: só o peso importa; a medida é a da caixa. */
function itemDentroDaCaixa(
  item: Pick<KitItem, 'id' | 'name'>,
  row: ProductMeasureRow | undefined,
): { incomplete: IncompleteItem } | { weightG: number } {
  if (row && isKnownMeasure(row.weight_g)) return { weightG: row.weight_g };
  return {
    incomplete: { productId: item.id, name: row?.name ?? item.name, missing: ['weight'] },
  };
}

function kitFechado(
  box: Pick<KitBox, 'id' | 'name'>,
  items: FreightKit['items'],
  catalogo: Catalogo,
): { missing: IncompleteItem[] } | { row: ProductMeasureRow } {
  const missing: IncompleteItem[] = [];
  const boxRow = catalogo.get(box.id);

  const faltaNaCaixa: MissingMeasure[] = [];
  if (!isKnownMeasure(boxRow?.height_cm)) faltaNaCaixa.push('height');
  if (!isKnownMeasure(boxRow?.length_cm)) faltaNaCaixa.push('length');
  if (!isKnownMeasure(boxRow?.weight_g)) faltaNaCaixa.push('weight');
  if (!isKnownMeasure(boxRow?.width_cm)) faltaNaCaixa.push('width');
  if (faltaNaCaixa.length > 0) {
    missing.push({ productId: box.id, name: boxRow?.name ?? box.name, missing: faltaNaCaixa });
  }

  let total = boxRow?.weight_g ?? 0;
  for (const item of items) {
    if (item.quantity === 0) continue;
    const peso = itemDentroDaCaixa(item, catalogo.get(item.id));
    if ('incomplete' in peso) missing.push(peso.incomplete);
    else total += peso.weightG * item.quantity;
  }

  if (missing.length > 0 || !boxRow) return { missing };
  return { row: { ...boxRow, diameter_cm: null, weight_g: roundDecimal(total, 2) } };
}

export function kitToPackInput(
  kit: FreightKit,
  kitQuantity: number,
  catalogo: Catalogo,
): KitPackInput {
  if (!Number.isInteger(kitQuantity) || kitQuantity <= 0) {
    return {
      status: 'error',
      error: {
        code: 'invalid_kit_quantity',
        message: `Quantidade de kits inválida: ${kitQuantity}. Informe um número inteiro maior que zero.`,
      },
    };
  }

  for (const item of kit.items) {
    if (!Number.isInteger(item.quantity) || item.quantity < 0) {
      return {
        status: 'error',
        error: {
          code: 'invalid_item_quantity',
          message: `Quantidade inválida para ${item.name}: ${item.quantity}. Informe um número inteiro, zero ou maior.`,
          productId: item.id,
        },
      };
    }
  }

  const options = { kitQuantity, mixMode: 'misturar' as const };
  const incompleto = (missing: IncompleteItem[]): KitPackInput => ({
    status: 'incomplete',
    inputs: [],
    options,
    missing,
  });

  if (kit.box) {
    const fechado = kitFechado(kit.box, kit.items, catalogo);
    if ('missing' in fechado) return incompleto(fechado.missing);
    return {
      status: 'ok',
      inputs: [{ row: fechado.row, quantity: 1 }],
      options,
      missing: [],
    };
  }

  const inputs: PlanInput[] = [];
  const missing: IncompleteItem[] = [];
  for (const item of kit.items) {
    if (item.quantity === 0) continue;
    const row = catalogo.get(item.id);
    if (!row) {
      missing.push(semCatalogo(item));
      continue;
    }
    const resolvido = resolveItemDimensions(row);
    if (resolvido.status === 'incomplete') missing.push(resolvido.incomplete);
    inputs.push({ row, quantity: item.quantity, shipsSeparately: shipsSeparately(row) });
  }

  if (missing.length > 0) return incompleto(missing);
  return { status: 'ok', inputs, options, missing: [] };
}
