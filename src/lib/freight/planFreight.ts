/**
 * Orquestra o plano de frete: caixas e parâmetros → medidas → bloqueio →
 * quantidades → grupos → empacotamento → totais → avisos.
 *
 * Não lê relógio nem sorteia nada: `computedAt` e `itemsHash` entram por
 * parâmetro. É o que faz o plano ser reproduzível em teste e comparável com o
 * que está salvo no orçamento.
 *
 * Não lança por entrada inválida: lista de itens ou opções ausentes, item sem
 * `row`, caixa, parâmetro, quantidade, o mesmo produto com medidas diferentes e
 * pedido acima de `MAX_VOLUMES_POR_PLANO` saem como plano `dados_insuficientes`,
 * com o motivo em `warnings`.
 */
import { maiorCaixa } from './boxOrder';
import { buildGroups } from './buildGroups';
import type { ProductMeasureRow } from './columns';
import { computeVolumeTotals, type VolumeDraft } from './computeVolumeTotals';
import { expandQuantities } from './expandQuantities';
import { MAX_VOLUMES_POR_PLANO } from './limits';
import { packMixed } from './packMixed';
import { packSingleProduct } from './packSingleProduct';
import { resolveItemDimensions, type ResolvedMeasures } from './resolveItemDimensions';
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
import { validateConfig, validateEntrada } from './validateConfig';

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

/** Objeto novo a cada plano: um plano bloqueado não divide totais com outro. */
function totaisVazios(): FreightPlanTotals {
  return {
    boxesByCode: {},
    grossWeightG: 0,
    volumeM3: 0,
    cubicWeightG: { correios: 0, rodoviario: 0 },
  };
}

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
    // 6 casas, igual ao volume individual: 2 casas zerariam uma encomenda
    // pequena (caixa de 10 × 10 × 10 cm = 0,001 m³ → 0) e perderiam 0,0006 m³
    // numa caixa P. A tela formata em 2 casas; a cotação precisa do número cheio.
    volumeM3: roundDecimal(volumeM3, 6),
    cubicWeightG: {
      correios: roundDecimal(cubicWeightG.correios, 2),
      rodoviario: roundDecimal(cubicWeightG.rodoviario, 2),
    },
  };
}

const OCUPACAO_BAIXA = 0.5;

const INTEIRO = new Intl.NumberFormat('pt-BR');

/** As duas linhas do mesmo produto descrevem a mesma peça? */
function mesmasMedidas(a: ResolvedMeasures, b: ResolvedMeasures): boolean {
  return (
    a.weightG === b.weightG &&
    a.dims.heightCm === b.dims.heightCm &&
    a.dims.widthCm === b.dims.widthCm &&
    a.dims.lengthCm === b.dims.lengthCm
  );
}

/** Um volume com as contas fechadas, ao lado do rascunho de onde saiu. */
interface VolumeFechado {
  rascunho: VolumeDraft;
  volume: PackVolume;
}

/**
 * Avisos que mudam a leitura do número.
 *
 * "Fechou no peso" é literal: não cabe mais **uma** unidade da peça mais leve
 * do volume sem passar do máximo. É a mesma coisa que `limitedBy: 'weight'`,
 * medida no volume fechado, o que também funciona em caixa com produtos
 * misturados.
 *
 * A comparação é contra `maxWeightG`, não contra `maxWeightG - emptyWeightG`:
 * `grossWeightG` **já inclui** o peso da caixa vazia. Descontar de novo faria
 * uma GG de 250 g com 245 cadernetas acusar teto com 230 g ainda livres. Hoje
 * as quatro caixas têm peso vazio 0 e os dois cálculos coincidem — o erro só
 * apareceria quando alguém preenchesse `shipping_boxes.empty_weight_g`.
 */
function montarAvisos(fechados: VolumeFechado[]): string[] {
  const avisos: string[] = [];

  const ociosas = new Map<string, number>();
  const noTeto = new Set<string>();

  for (const { rascunho, volume } of fechados) {
    if (volume.fillRatio < OCUPACAO_BAIXA) {
      ociosas.set(volume.box.code, (ociosas.get(volume.box.code) ?? 0) + 1);
    }

    // O rascunho é a origem deste volume e carrega as peças com peso — não há
    // o que procurar nem valor ausente para tratar.
    const pesos = rascunho.contents.map(({ item }) => item.weightG);
    const maisLeve = pesos.reduce((menor, peso) => Math.min(menor, peso), Infinity);
    if (volume.grossWeightG + maisLeve > volume.box.maxWeightG) noTeto.add(volume.box.code);
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
  // Opções ausentes são recusadas logo abaixo; o plano devolvido ainda precisa
  // de um molde, então os campos que faltam saem vazios.
  const opcoes: Partial<PlanOptions> =
    typeof options === 'object' && options !== null ? options : {};
  const base = {
    mixMode: opcoes.mixMode ?? 'separar',
    computedAt: opcoes.computedAt ?? '',
    itemsHash: opcoes.itemsHash ?? '',
  };
  /** Plano que não pôde ser calculado, com o motivo dito em aviso. */
  const bloqueado = (warnings: string[]): FreightPlan => ({
    ...base,
    status: 'dados_insuficientes',
    volumes: [],
    totals: totaisVazios(),
    warnings,
    missing: [],
  });

  // Falha fechada: caixa ou parâmetro inválido bloqueia antes de qualquer
  // conta, em vez de virar peso cubado 0 num plano `ok` (ver `validateConfig`).
  const problemasDeConfiguracao = [
    ...validateEntrada(inputs, options),
    ...validateConfig(boxes, settings),
  ];
  if (problemasDeConfiguracao.length > 0) return bloqueado(problemasDeConfiguracao);

  // Linha com quantidade zerada é linha que saiu do orçamento, não erro.
  const relevantes = inputs.filter((input) => input.quantity !== 0);

  // Sem nada para despachar não existe plano: `ok` com zero volume passaria
  // adiante como frete de 0 kg.
  if (relevantes.length === 0) {
    return {
      ...base,
      status: 'dados_insuficientes',
      volumes: [],
      totals: totaisVazios(),
      warnings: ['Nenhum item com quantidade para calcular o frete.'],
      missing: [],
    };
  }

  const missing: IncompleteItem[] = [];
  const semMedida = new Set<string>();
  const itens: PackItem[] = [];
  const medidasPorProduto = new Map<string, ResolvedMeasures>();
  /** productId → "Nome (SKU)" dos produtos que chegaram com medidas divergentes. */
  const divergentes = new Map<string, string>();

  for (const input of relevantes) {
    const resolvido = resolveItemDimensions(input.row);
    if (resolvido.status === 'incomplete') {
      // Uma entrada por produto, na ordem da primeira ocorrência: o mesmo
      // produto em três linhas é um cadastro a corrigir, não três.
      if (!semMedida.has(input.row.id)) {
        semMedida.add(input.row.id);
        missing.push(resolvido.incomplete);
      }
      continue;
    }

    const primeiraLinha = medidasPorProduto.get(input.row.id);
    if (!primeiraLinha) {
      medidasPorProduto.set(input.row.id, resolvido.measures);
    } else if (!mesmasMedidas(primeiraLinha, resolvido.measures)) {
      divergentes.set(input.row.id, `${input.row.name} (${input.row.sku})`);
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
      totals: totaisVazios(),
      warnings: [],
      missing,
    };
  }

  // As linhas do mesmo produto são somadas numa peça só (`buildGroups`), com as
  // medidas da primeira. Se elas divergem, somar seria escolher uma em
  // silêncio — e o plano mudaria com a ordem das linhas. Bloqueia e diz qual.
  if (divergentes.size > 0) {
    return bloqueado(
      [...divergentes.values()].map(
        (peca) =>
          `${peca} aparece em mais de uma linha com medidas ou peso diferentes. Deixe o produto com uma medida só para calcular o frete.`,
      ),
    );
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
      totals: totaisVazios(),
      warnings: [expandido.error.message],
      missing: [],
    };
  }

  const grupos = buildGroups(expandido.items, options.mixMode);

  // Acima de 2^53 − 1 o JavaScript já não conta de um em um: as contas de
  // caixas deixariam de ser exatas. É a soma das linhas vezes os kits que
  // importa, por isso a checagem é aqui, depois de agrupar.
  const foraDaConta = grupos
    .flatMap((grupo) => grupo.items)
    .find((item) => !Number.isSafeInteger(item.quantity));
  if (foraDaConta) {
    return bloqueado([`Quantidade grande demais para ${foraDaConta.name}. Confira a quantidade.`]);
  }

  const rascunhos: VolumeDraft[] = [];
  let totalDeVolumes = 0;

  for (const grupo of grupos) {
    // Cada empacotador conta os volumes antes de montar e só monta o que ainda
    // cabe no teto do plano. Passou do teto, os grupos seguintes só contam:
    // o aviso precisa do número inteiro.
    const aindaCabem = Math.max(0, MAX_VOLUMES_POR_PLANO - totalDeVolumes);
    const resultado =
      grupo.items.length === 1
        ? packSingleProduct(grupo.items[0], boxes, settings, aindaCabem)
        : packMixed(grupo.items, boxes, settings, aindaCabem);

    if (resultado.status === 'nao_cabe') {
      const peca = `${resultado.item.name} (${resultado.item.sku})`;
      const maior = maiorCaixa(boxes);
      let aviso: string;
      if (!maior) {
        aviso = `${peca} não cabe: nenhuma caixa ativa cadastrada.`;
      } else if (boxes.every((box) => resultado.item.weightG > box.maxWeightG - box.emptyWeightG)) {
        aviso = `${peca} pesa mais do que o peso máximo de qualquer caixa ativa.`;
      } else {
        aviso = `${peca} não cabe nem na maior caixa ativa (${maior.code}).`;
      }
      return {
        ...base,
        status: 'nao_cabe',
        volumes: [],
        totals: totaisVazios(),
        warnings: [aviso],
        missing: [],
      };
    }

    if (resultado.status === 'volumes_demais') {
      totalDeVolumes += resultado.quantos;
      continue;
    }

    totalDeVolumes += resultado.volumes.length;
    // Laço, não `push(...volumes)`: o espalhamento passa cada volume como
    // argumento e estoura a pilha a partir de ~125 mil.
    for (const rascunho of resultado.volumes) rascunhos.push(rascunho);
  }

  if (totalDeVolumes > MAX_VOLUMES_POR_PLANO) {
    return bloqueado([
      `O pedido daria ${INTEIRO.format(totalDeVolumes)} caixas, acima do limite de ${INTEIRO.format(MAX_VOLUMES_POR_PLANO)} caixas por plano. Confira a quantidade de cada item.`,
    ]);
  }

  const fechados: VolumeFechado[] = rascunhos.map((rascunho) => ({
    rascunho,
    volume: computeVolumeTotals(rascunho, settings),
  }));
  const volumes = fechados.map(({ volume }) => volume);

  return {
    ...base,
    status: 'ok',
    volumes,
    totals: somarTotais(volumes),
    warnings: montarAvisos(fechados),
    missing: [],
  };
}
