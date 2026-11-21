/**
 * `useFreightPlan` — o plano de volumes de uma lista de produtos.
 *
 * Junta as três fontes (medidas dos produtos, caixas ativas e parâmetros) e
 * chama `planFreight` dentro de um `useMemo`. O motor não lê relógio: o
 * `computedAt` nasce aqui, uma vez por cálculo, e o `itemsHash` vem de
 * `computeItemsHash`.
 *
 * Só recalcula quando a CHAVE muda: ids + quantidades, modo de mistura, nº de
 * kits, e os dados de caixas, parâmetros e medidas. Quem chama pode montar a
 * lista `items` a cada render: o hook compara o conteúdo, não a referência.
 *
 * Linha sem `productId` (item avulso, digitado à mão) não tem medida nem peso:
 * entra como faltante, com o nome, e o plano fica `dados_insuficientes`.
 * Produto que o banco não devolve (inativo, apagado ou fora da visão do papel)
 * é outro caso: vai em `unavailable`, não na lista de medidas faltantes, e
 * também deixa o plano `dados_insuficientes`.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useFreightSettings } from '@/hooks/freight/useFreightSettings';
import { useProductMeasures } from '@/hooks/freight/useProductMeasures';
import { useShippingBoxes } from '@/hooks/freight/useShippingBoxes';
import {
  computeItemsHash,
  planFreight,
  type FreightPlan,
  type IncompleteItem,
  type MissingMeasure,
  type MixMode,
  type PlanInput,
  type ProductMeasureRow,
} from '@/lib/freight';
import { trackFreightPlanComputed, type FreightPlanOrigin } from '@/lib/freight/telemetry';

/** Uma linha do orçamento, do kit ou do simulador. */
export interface FreightPlanLine {
  /** `null` ou vazio: item avulso, sem cadastro de medidas. */
  productId: string | null;
  /** Nome mostrado quando a linha não tem medidas (avulso ou produto não encontrado). */
  name?: string;
  quantity: number;
}

export interface UseFreightPlanInput {
  items: readonly FreightPlanLine[];
  mixMode: MixMode;
  /** Número de kits/conjuntos. Padrão 1. */
  kitQuantity?: number;
  /** Origem do cálculo, para telemetria. Padrão `quote`. */
  origin?: FreightPlanOrigin;
}

/** Produto que o banco não devolveu: não dá para saber as medidas. */
export interface UnavailableProduct {
  productId: string;
  name: string;
}

export interface UseFreightPlanResult {
  /** `null` enquanto carrega, em caso de erro ou sem nenhuma linha com quantidade. */
  plan: FreightPlan | null;
  /** Nome e SKU de cada produto encontrado, para o painel rotular os volumes. */
  products: ReadonlyMap<string, ProductMeasureRow>;
  /** Produtos que o banco não devolveu (não é falta de medida no cadastro). */
  unavailable: readonly UnavailableProduct[];
  isLoading: boolean;
  error: Error | null;
}

/** Mesma ordem do motor (resolveItemDimensions): altura, largura, comprimento, peso. */
const ALL_MEASURES: MissingMeasure[] = ['height', 'width', 'length', 'weight'];
const NO_UNAVAILABLE: readonly UnavailableProduct[] = [];
const AVULSO_NAME = 'Item avulso';
const UNAVAILABLE_NAME = 'Produto';

interface Snapshot {
  key: string;
  lines: FreightPlanLine[];
}

/** Soma as linhas do mesmo produto e descarta as de quantidade 0 (saíram do orçamento). */
function normalizeLines(items: readonly FreightPlanLine[]): FreightPlanLine[] {
  const byProduct = new Map<string, FreightPlanLine>();
  const avulsos: FreightPlanLine[] = [];

  for (const item of items) {
    if (item.quantity === 0) continue;
    if (!item.productId) {
      avulsos.push({ productId: null, name: item.name, quantity: item.quantity });
      continue;
    }
    const atual = byProduct.get(item.productId);
    if (atual) {
      atual.quantity += item.quantity;
    } else {
      byProduct.set(item.productId, { ...item });
    }
  }

  return [
    ...[...byProduct.values()].sort((a, b) => (a.productId ?? '').localeCompare(b.productId ?? '')),
    ...avulsos,
  ];
}

function linesKey(lines: readonly FreightPlanLine[]): string {
  // JSON, não concatenação: o nome do avulso é texto livre e pode conter qualquer separador.
  return JSON.stringify(lines.map((line) => [line.productId, line.name ?? null, line.quantity]));
}

function incompleteOf(productId: string, name: string): IncompleteItem {
  return { productId, name, missing: ALL_MEASURES };
}

function planSemMedidas(base: FreightPlan, missing: IncompleteItem[]): FreightPlan {
  return {
    ...base,
    status: 'dados_insuficientes',
    volumes: [],
    totals: {
      boxesByCode: {},
      grossWeightG: 0,
      volumeM3: 0,
      cubicWeightG: { correios: 0, rodoviario: 0 },
    },
    warnings: [],
    missing,
  };
}

export function useFreightPlan({
  items,
  mixMode,
  kitQuantity = 1,
  origin = 'quote',
}: UseFreightPlanInput): UseFreightPlanResult {
  const incoming = normalizeLines(items);
  const incomingKey = linesKey(incoming);

  // Estado derivado (padrão da documentação do React): a lista só é trocada
  // quando o CONTEÚDO muda, então `items` novo com o mesmo conteúdo não recalcula.
  const [snapshot, setSnapshot] = useState<Snapshot>({ key: incomingKey, lines: incoming });
  if (snapshot.key !== incomingKey) setSnapshot({ key: incomingKey, lines: incoming });
  const lines = snapshot.lines;

  const productIds = useMemo(
    () => lines.flatMap((line) => (line.productId ? [line.productId] : [])),
    [lines],
  );

  const measuresQuery = useProductMeasures(productIds);
  const boxesQuery = useShippingBoxes();
  const settingsQuery = useFreightSettings();

  const { measures } = measuresQuery;
  const { boxes } = boxesQuery;
  const { settings } = settingsQuery;

  const isLoading = measuresQuery.isLoading || boxesQuery.isLoading || settingsQuery.isLoading;
  // Falha de refetch de fundo não apaga plano válido: só vale como erro a fonte que não tem dado nenhum.
  const loadError =
    (measuresQuery.hasData ? null : measuresQuery.error) ??
    (boxes.length > 0 ? null : boxesQuery.error) ??
    (settings ? null : settingsQuery.error);
  const missingSettings = !isLoading && !loadError && settings === null;

  const computed = useMemo<{
    plan: FreightPlan | null;
    unavailable: readonly UnavailableProduct[];
  }>(() => {
    if (isLoading || loadError || !settings || lines.length === 0) {
      return { plan: null, unavailable: NO_UNAVAILABLE };
    }

    const inputs: PlanInput[] = [];
    const faltantes: IncompleteItem[] = [];
    const indisponiveis: UnavailableProduct[] = [];
    // Hash sobre a quantidade efetiva (linha × kits): mudar o nº de kits muda o plano e o hash.
    const hashItems = lines.map((line, index) => ({
      productId: line.productId ?? `avulso:${index}:${line.name ?? ''}`,
      quantity: line.quantity * kitQuantity,
    }));

    lines.forEach((line) => {
      if (!line.productId) {
        faltantes.push(incompleteOf('', line.name ?? AVULSO_NAME));
        return;
      }
      const row = measures.get(line.productId);
      if (!row) {
        indisponiveis.push({ productId: line.productId, name: line.name ?? UNAVAILABLE_NAME });
        return;
      }
      inputs.push({ row, quantity: line.quantity, shipsSeparately: row.ships_separately });
    });

    const calculado = planFreight(
      inputs,
      boxes,
      {
        mixMode,
        kitQuantity,
        computedAt: new Date().toISOString(),
        itemsHash: computeItemsHash(hashItems),
      },
      settings,
    );

    if (faltantes.length === 0 && indisponiveis.length === 0) {
      return { plan: calculado, unavailable: NO_UNAVAILABLE };
    }
    return {
      plan: planSemMedidas(calculado, [...calculado.missing, ...faltantes]),
      unavailable: indisponiveis,
    };
  }, [isLoading, loadError, settings, lines, measures, boxes, mixMode, kitQuantity]);

  const plan = computed.plan;
  const prevPlanRef = useRef<FreightPlan | null>(null);
  useEffect(() => {
    if (!plan || plan === prevPlanRef.current) return;
    prevPlanRef.current = plan;
    trackFreightPlanComputed(plan, origin);
  }, [plan, origin]);

  const error =
    loadError ??
    (missingSettings ? new Error('Os parâmetros de frete não estão disponíveis.') : null);

  return {
    plan: computed.plan,
    products: measures,
    unavailable: computed.unavailable,
    isLoading,
    error,
  };
}
