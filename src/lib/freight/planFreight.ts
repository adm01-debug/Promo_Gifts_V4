/**
 * Orquestra o plano de frete: medidas → bloqueio → quantidades → grupos →
 * empacotamento → totais → avisos.
 *
 * Não lê relógio nem sorteia nada: `computedAt` e `itemsHash` entram por
 * parâmetro. É o que faz o plano ser reproduzível em teste e comparável com o
 * que está salvo no orçamento.
 */
import { maiorCaixa } from './boxOrder';
import { buildGroups } from './buildGroups';
import type { ProductMeasureRow } from './columns';
import { computeVolumeTotals, type VolumeDraft } from './computeVolumeTotals';
import { expandQuantities } from './expandQuantities';
import { packMixed } from './packMixed';
import { packSingleProduct } from './packSingleProduct';
import { resolveItemDimensions } from './resolveItemDimensions';
import type {
  CubicWeightG,
  FreightPlan,
  FreightPlanTotals,
  FreightSettings,
  IncompleteItem,
  MixMode,
  PackItem,
  PackVolume,
  ShippingBox,
} from './types';
import { roundDecimal } from './units';

/** Uma linha do orçamento, do kit ou do simulador. */
export interface PlanInput {
  row: ProductMeasureRow;
  quantity: number;
  /** De `products.ships_separately` (bloco D). Ausente é `false`. */
  shipsSeparately?: boolean;
}

export interface PlanOptions {
  mixMode: MixMode;
  /** Número de kits/conjuntos. Multiplica a quantidade de cada linha. */
  kitQuantity?: number;
  /** ISO, injetado por quem chama. */
  computedAt: string;
  /** Impressão digital dos itens, injetada por quem chama. */
  itemsHash: string;
}

const TOTAIS_VAZIOS: FreightPlanTotals = {
  boxesByCode: {},
  grossWeightG: 0,
  volumeM3: 0,
  cubicWeightG: { correios: 0, rodoviario: 0 },
};

/**
 * Impressão digital determinística de ids + quantidades, para detectar plano
 * velho sem recalcular (etapa 65).
 *
 * FNV-1a, não um hash criptográfico: a função roda no browser, tem de ser
 * síncrona e só precisa mudar quando a lista muda. `crypto.subtle` é
 * assíncrono e `node:crypto` não existe no bundle.
 */
export function computeItemsHash(
  items: ReadonlyArray<{ productId: string; quantity: number }>,
): string {
  const canonico = [...items]
    .map(({ productId, quantity }) => `${productId}:${quantity}`)
    .sort()
    .join('|');
  let hash = 0x811c9dc5;
  for (let i = 0; i < canonico.length; i += 1) {
    hash ^= canonico.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

/** Fecha os totais do plano somando os volumes já calculados. */
function somarTotais(volumes: PackVolume[]): FreightPlanTotals {
  const boxesByCode: Record<string, number> = {};
  let grossWeightG = 0;
  let volumeM3 = 0;
  const cubicWeightG: CubicWeightG = { correios: 0, rodoviario: 0 };

  for (const volume of volumes) {
    boxesByCode[volume.box.code] = (boxesByCode[volume.box.code] ?? 0) + 1;
    grossWeightG += volume.grossWeightG;
    volumeM3 += volume.volumeM3;
    cubicWeightG.correios += volume.cubicWeightG.correios;
    cubicWeightG.rodoviario += volume.cubicWeightG.rodoviario;
  }

  return {
    boxesByCode,
    grossWeightG: roundDecimal(grossWeightG, 2),
    volumeM3: roundDecimal(volumeM3, 2),
    cubicWeightG: {
      correios: roundDecimal(cubicWeightG.correios, 2),
      rodoviario: roundDecimal(cubicWeightG.rodoviario, 2),
    },
  };
}

const OCUPACAO_BAIXA = 0.5;

/**
 * Avisos que mudam a leitura do número.
 *
 * "Fechou no peso" é literal: não cabe mais **uma** unidade da peça mais leve
 * do volume sem passar do máximo. É a mesma coisa que `limitedBy: 'weight'`,
 * medida no volume fechado, o que também funciona em caixa com produtos
 * misturados.
 */
function montarAvisos(volumes: PackVolume[], rascunhos: VolumeDraft[]): string[] {
  const avisos: string[] = [];

  const ociosas = new Map<string, number>();
  const noTeto = new Set<string>();

  for (const [indice, volume] of volumes.entries()) {
    if (volume.fillRatio < OCUPACAO_BAIXA) {
      ociosas.set(volume.box.code, (ociosas.get(volume.box.code) ?? 0) + 1);
    }

    // O rascunho na mesma posição é a origem deste volume e carrega as peças
    // com peso — não há o que procurar nem valor ausente para tratar.
    const pesos = rascunhos[indice].contents.map(({ item }) => item.weightG);
    const maisLeve = Math.min(...pesos);
    const disponivelG = volume.box.maxWeightG - volume.box.emptyWeightG;
    if (volume.grossWeightG + maisLeve > disponivelG) noTeto.add(volume.box.code);
  }

  for (const [code, quantas] of ociosas) {
    avisos.push(
      quantas === 1
        ? `1 caixa ${code} vai com menos de metade do espaço aproveitável ocupado.`
        : `${quantas} caixas ${code} vão com menos de metade do espaço aproveitável ocupado.`,
    );
  }
  for (const code of noTeto) {
    avisos.push(`A caixa ${code} fechou no peso máximo, não no espaço.`);
  }

  return avisos;
}

export function planFreight(
  inputs: readonly PlanInput[],
  boxes: readonly ShippingBox[],
  options: PlanOptions,
  settings: FreightSettings,
): FreightPlan {
  const base = {
    mixMode: options.mixMode,
    computedAt: options.computedAt,
    itemsHash: options.itemsHash,
  };

  // Linha com quantidade zerada é linha que saiu do orçamento, não erro.
  const relevantes = inputs.filter((input) => input.quantity !== 0);

  const missing: IncompleteItem[] = [];
  const itens: PackItem[] = [];

  for (const input of relevantes) {
    const resolvido = resolveItemDimensions(input.row);
    if (resolvido.status === 'incomplete') {
      missing.push(resolvido.incomplete);
      continue;
    }
    itens.push({
      productId: input.row.id,
      name: input.row.name,
      sku: input.row.sku,
      quantity: input.quantity,
      dims: resolvido.measures.dims,
      weightG: resolvido.measures.weightG,
      shipsSeparately: input.shipsSeparately ?? false,
      source: resolvido.measures.source,
    });
  }

  // Decisão 7: sem peso ou sem dimensão não existe estimativa parcial.
  if (missing.length > 0) {
    return {
      ...base,
      status: 'dados_insuficientes',
      volumes: [],
      totals: TOTAIS_VAZIOS,
      warnings: [],
      missing,
    };
  }

  const expandido = expandQuantities(itens, options.kitQuantity ?? 1);
  if (expandido.status === 'error') {
    // Quantidade não inteira é erro de quem chamou, não dado faltando do
    // cadastro. Não há estado próprio para isso no contrato, então o plano sai
    // bloqueado e o aviso diz exatamente qual linha está errada.
    return {
      ...base,
      status: 'dados_insuficientes',
      volumes: [],
      totals: TOTAIS_VAZIOS,
      warnings: [expandido.error.message],
      missing: [],
    };
  }

  const grupos = buildGroups(expandido.items, options.mixMode);
  const rascunhos: VolumeDraft[] = [];

  for (const grupo of grupos) {
    const resultado =
      grupo.items.length === 1
        ? packSingleProduct(grupo.items[0], boxes, settings)
        : packMixed(grupo.items, boxes, settings);

    if (resultado.status === 'nao_cabe') {
      const maior = maiorCaixa(boxes);
      const aviso = maior
        ? `${resultado.item.name} (${resultado.item.sku}) não cabe nem na maior caixa ativa (${maior.code}).`
        : `${resultado.item.name} (${resultado.item.sku}) não cabe: nenhuma caixa ativa cadastrada.`;
      return {
        ...base,
        status: 'nao_cabe',
        volumes: [],
        totals: TOTAIS_VAZIOS,
        warnings: [aviso],
        missing: [],
      };
    }

    rascunhos.push(...resultado.volumes);
  }

  const volumes = rascunhos.map((rascunho) => computeVolumeTotals(rascunho, settings));

  return {
    ...base,
    status: 'ok',
    volumes,
    totals: somarTotais(volumes),
    warnings: montarAvisos(volumes, rascunhos),
    missing: [],
  };
}
