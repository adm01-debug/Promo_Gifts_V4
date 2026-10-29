/**
 * Modelo puro do gerador de mockup (sem React): limites do lote, recusa por
 * medidas ausentes (Q13/Q24) e resolução do produto de entrada (A-7).
 * Vive fora de `useMockupGenerator` para manter o hook dentro do ratchet de
 * tamanho de arquivo; o hook reexporta tudo para os consumidores existentes.
 */
import { dbInvoke } from '@/lib/db/postgrest';
import { adaptTabelaPrecoRows } from '@/lib/personalization/adapters';
import type { Product } from '@/hooks/products';
import type { Technique } from '@/hooks/mockup/mockupGenerationService';

/** Máximo de áreas (com logo) por lote de geração (decisão Q14). */
export const MAX_BATCH_AREAS = 6;

export interface BatchMockupResult {
  /** Id estável da área — nomes de área podem se repetir. */
  areaId?: string;
  areaName: string;
  url: string;
}

/** Código/servidor de recusa quando o produto não tem medidas reais (cm). */
export const MISSING_DIMENSIONS_ERROR_CODE = 'missing_dimensions' as const;
/** HTTP status equivalente na edge generate-mockup (mesmo valor em production). */
export const MISSING_DIMENSIONS_STATUS = 422 as const;
export const MISSING_DIMENSIONS_MESSAGE =
  'Este produto não tem medidas (cm) cadastradas. Peça ao administrador do catálogo para informar a largura e/ou a altura do produto antes de gerar o mockup.';

/** Motivo pelo qual a geração foi recusada no cliente (sem chamar a edge). */
export type MockupGenerationErrorCode = 'edge_error' | 'missing_dimensions';

export interface MockupGenerationRefusal {
  code: MockupGenerationErrorCode;
  message: string;
  /** HTTP status equivalente ao erro da edge generate-mockup. */
  status?: number;
}

/** Retorno tipado de `generateMockup` no sucesso e nas recusas (os guards de
 * reentrância/validação devolvem `undefined`; a UI usa `missingDimensions`). */
export type MockupGenerationOutcome = { ok: false; error: MockupGenerationRefusal } | { ok: true };

/** Recusa tipada (Q13/Q24) quando o produto não tem nenhuma medida real (cm). */
export const MISSING_DIMENSIONS_REFUSAL: MockupGenerationRefusal = {
  code: MISSING_DIMENSIONS_ERROR_CODE,
  status: MISSING_DIMENSIONS_STATUS,
  message: MISSING_DIMENSIONS_MESSAGE,
};

export interface ProductPhysicalDimensions {
  widthCm: number | null;
  heightCm: number | null;
}

/** Aceita apenas número finito > 0; qualquer outra coisa (0/negativo/NaN) ⇒ null. */
function positiveCm(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null;
}

/** Milímetros → cm (só quando positivo), espelhando a regra do payload da edge. */
function mmToCm(value: unknown): number | null {
  const mm = positiveCm(value);
  return mm === null ? null : mm / 10;
}

/**
 * Deriva as dimensões físicas reais (cm) do produto na MESMA precedência usada no
 * payload WYSIWYG da geração: largura = dimensions.width_cm → dimensions.diameter_cm
 * → metadata.width_mm/10; altura = dimensions.height_cm → metadata.height_mm/10.
 * Produto sem nenhuma dessas fontes ⇒ { widthCm: null, heightCm: null }.
 */
export function resolveProductDimensions(
  product: Product | null | undefined,
): ProductPhysicalDimensions {
  const dims = product?.dimensions ?? null;
  const meta = product?.metadata ?? null;
  return {
    widthCm: positiveCm(dims?.width_cm) ?? positiveCm(dims?.diameter_cm) ?? mmToCm(meta?.width_mm),
    heightCm: positiveCm(dims?.height_cm) ?? mmToCm(meta?.height_mm),
  };
}

/**
 * true quando o produto traz ao menos uma medida real (cm) — mesmo critério do
 * portão da edge (422 missing_dimensions). Sem nenhuma medida o mockup sairia com
 * escala inventada, então o hook recusa em vez de estimar 8×20 cm em silêncio.
 */
export function hasRealProductDimensions(dimensions: ProductPhysicalDimensions): boolean {
  return dimensions.widthCm !== null || dimensions.heightCm !== null;
}

/** Entradas aceitas para pré-selecionar o produto do gerador (a ordem importa). */
export interface MockupEntryRefs {
  /** Query string do deep link: `?product_id=` (legado) ou `?productId=` (QuickQuoteFAB). */
  search?: string | null;
  /** `location.state` do router: `preSelectedProduct.id` (badge "Visualizar com Logo"). */
  routerState?: unknown;
}

/**
 * A-7: resolve o id do produto pré-selecionado a partir das três entradas do
 * gerador, na ordem: `?product_id=` (deep link legado) → `?productId=`
 * (QuickQuoteFAB) → `state.preSelectedProduct.id` (ProductCategoryBadges).
 * Entrada vazia ou de tipo errado é ignorada (sem erro); sem nenhuma entrada
 * válida devolve null. A validação contra o catálogo é do chamador.
 */
export function resolveEntryProductId({ search, routerState }: MockupEntryRefs = {}):
  string | null {
  const params = new URLSearchParams(search ?? '');
  for (const key of ['product_id', 'productId']) {
    const value = params.get(key)?.trim();
    if (value) return value;
  }
  if (!routerState || typeof routerState !== 'object') return null;
  const preSelected = (routerState as { preSelectedProduct?: { id?: unknown } | null })
    .preSelectedProduct;
  const id = preSelected?.id;
  return typeof id === 'string' && id.trim() ? id.trim() : null;
}

/** Área com logo, no que importa para o aviso de limite (cm). */
export interface LogoLimitArea {
  name: string;
  logoWidth: number;
  logoHeight: number;
  maxWidthCm?: number | null;
  maxHeightCm?: number | null;
}

/** Limite (cm) da técnica, quando ela traz `maxWidth`/`maxHeight` cadastrados. */
function techniqueLimit(
  technique: object | null | undefined,
  key: 'maxHeight' | 'maxWidth',
): number | null {
  if (!technique || !(key in technique)) return null;
  const value: unknown = Reflect.get(technique, key);
  return typeof value === 'number' ? value : null;
}

/**
 * Avisos (não bloqueiam) de logo acima do limite da área ou da técnica, com 0,5 cm
 * de folga. A geração segue: o servidor compõe o que recebe.
 */
export function logoLimitWarnings(
  areas: LogoLimitArea[],
  technique: object | null | undefined,
): string[] {
  const techW = techniqueLimit(technique, 'maxWidth');
  const techH = techniqueLimit(technique, 'maxHeight');
  const warnings: string[] = [];
  for (const area of areas) {
    const maxW = area.maxWidthCm ?? techW;
    const maxH = area.maxHeightCm ?? techH;
    if (maxW && area.logoWidth > maxW + 0.5)
      warnings.push(
        `"${area.name}": logo ${area.logoWidth.toFixed(1)} cm excede o limite de ${maxW} cm de largura.`,
      );
    if (maxH && area.logoHeight > maxH + 0.5)
      warnings.push(
        `"${area.name}": logo ${area.logoHeight.toFixed(1)} cm excede o limite de ${maxH} cm de altura.`,
      );
  }
  return warnings;
}

/**
 * Técnicas oficiais (tabela_preco_gravacao_oficial, só ativas), ordenadas por nome.
 * MIGRAÇÃO REST-NATIVO (2026-05-30): dbInvoke (REST-native-first, silencioso
 * quando o kill-switch `edge_external_db_bridge` está OFF) em vez do invokeWithRetry
 * legado, que disparava o banner de "catálogo indisponível" no estado OFF esperado.
 * `tabela_preco_gravacao_oficial` está na whitelist do REST nativo e possui coluna `ativo`.
 */
export async function loadMockupTechniques(): Promise<Technique[]> {
  const { records: rawRecords } = await dbInvoke<Record<string, unknown>>({
    table: 'tabela_preco_gravacao_oficial',
    operation: 'select',
    filters: { ativo: true },
    limit: 100,
    countMode: 'none',
  });
  const techniquesData: Technique[] = adaptTabelaPrecoRows(rawRecords ?? []).map((r) => ({
    id: r.id,
    name: r.name ?? r.nome ?? '',
    code: r.codigo_curto ?? r.codigo_tabela ?? r.code ?? r.codigo ?? null,
  }));
  techniquesData.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  return techniquesData;
}

/**
 * Grava cada resultado do lote na SUA área (id estável; sem `areaId` — resposta
 * legada — cai no índice, nunca no nome), em paralelo. Devolve o último registro
 * salvo com id, para a ficha/estado "salvo".
 */
export async function saveBatchResults<A extends { id: string }>(
  batchResults: BatchMockupResult[],
  areasWithLogos: A[],
  save: (url: string, area: A) => Promise<string | null>,
): Promise<{ recordId: string; url: string } | null> {
  const settled = await Promise.allSettled(
    batchResults.map((r, i) => {
      const area = r.areaId ? areasWithLogos.find((a) => a.id === r.areaId) : areasWithLogos[i];
      if (!area) return Promise.resolve({ recordId: null, r });
      return save(r.url, area).then((recordId) => ({ recordId, r }));
    }),
  );
  const lastFulfilled = settled
    .filter(
      (res): res is PromiseFulfilledResult<{ recordId: string | null; r: BatchMockupResult }> =>
        res.status === 'fulfilled',
    )
    .pop();
  const recordId = lastFulfilled?.value.recordId;
  return recordId ? { recordId, url: lastFulfilled.value.r.url } : null;
}

/**
 * Erro próprio para cada área com logo que não voltou no lote. Só decide quando
 * todos os resultados trazem `areaId` (senão não há como casar): devolve null.
 */
export function failedAreaErrors(
  batchResults: BatchMockupResult[],
  areasWithLogos: { id: string }[],
): Record<string, string> | null {
  if (!batchResults.every((r) => r.areaId)) return null;
  const okIds = new Set(batchResults.map((r) => r.areaId));
  const errs: Record<string, string> = {};
  for (const a of areasWithLogos) {
    if (!okIds.has(a.id)) errs[a.id] = 'Falha ao gerar esta área. Tente regerar só ela.';
  }
  return errs;
}
