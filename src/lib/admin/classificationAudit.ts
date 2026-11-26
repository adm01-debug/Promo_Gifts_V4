/**
 * classificationAudit — regras puras da aba "Classificação" de /admin/cadastros.
 *
 * Consome as RPCs da migration 20261126211200, que são o único caminho para o
 * schema `classification_audit` (deny-all: nenhum GRANT em tabela/view). Elas
 * guardam a trilha de sugestões de categoria — `category_suggestions`, as views
 * `v_gaps_acionaveis` / `v_kits_para_revisao` — e a ação
 * `apply_high_confidence_suggestions`, que escreve em
 * `public.product_category_assignments`.
 *
 * A confiança exibida aqui replica exatamente o CASE da view
 * `classification_audit.v_gaps_acionaveis` (matches × nível da categoria).
 */

export interface ClassificationSummary {
  totalSugestoes: number;
  naoAtribuidas: number;
  kitsParaRevisao: number;
  conflitos: number;
  altaConfianca: number;
  ultimaAnalise: string | null;
}

export type ConfidenceLevel = 'alta' | 'altissima' | 'baixa' | 'boa' | 'media';

export interface ConfidenceBadge {
  level: ConfidenceLevel;
  label: string;
  emoji: string;
  tone: 'muted' | 'success' | 'warning';
}

export interface ClassificationSuggestion {
  id: number;
  productId: string;
  sku: string;
  produto: string;
  isKit: boolean;
  categoriaSugerida: string;
  nivel: number;
  matches: number;
  score: number;
  tokensMatched: string;
  alreadyAssigned: boolean;
  categoriasAtuais: string;
  materialConflict: boolean;
  typeConflict: boolean;
  approvedAuto: boolean;
  computedAt: string | null;
  confianca: ConfidenceBadge;
}

export type ApplyOutcome = 'APLICADO' | 'DRY-RUN' | 'SEM MUDANCA';

export interface ClassificationApplyRow {
  acao: ApplyOutcome;
  productId: string;
  sku: string;
  produto: string;
  categoria: string;
  matches: number;
  score: number;
}

export interface ClassificationFilters {
  search: string;
  somenteGaps: boolean;
  minMatches: number;
  limit: number;
}

export const MIN_MATCHES_FLOOR = 1;
export const MIN_MATCHES_CEIL = 20;
export const DEFAULT_MIN_MATCHES = 2;
export const DEFAULT_LIMIT = 200;

const CONFIDENCE_BY_LEVEL: Record<ConfidenceLevel, ConfidenceBadge> = {
  altissima: { level: 'altissima', label: 'Altíssima', emoji: '🟢', tone: 'success' },
  alta: { level: 'alta', label: 'Alta', emoji: '🟢', tone: 'success' },
  boa: { level: 'boa', label: 'Boa (folha específica)', emoji: '🟡', tone: 'warning' },
  media: { level: 'media', label: 'Média', emoji: '🟡', tone: 'warning' },
  baixa: { level: 'baixa', label: 'Baixa', emoji: '🔴', tone: 'muted' },
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asText(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function asNumber(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
}

/** Mesmo CASE de `classification_audit.v_gaps_acionaveis`. */
export function confidenceOf(matches: number, categoryLevel: number): ConfidenceBadge {
  const m = Number.isFinite(matches) ? matches : 0;
  const nivel = Number.isFinite(categoryLevel) ? categoryLevel : 0;
  if (m >= 4) return CONFIDENCE_BY_LEVEL.altissima;
  if (m === 3) return CONFIDENCE_BY_LEVEL.alta;
  if (m === 2 && nivel >= 4) return CONFIDENCE_BY_LEVEL.boa;
  if (m === 2 && nivel === 3) return CONFIDENCE_BY_LEVEL.media;
  return CONFIDENCE_BY_LEVEL.baixa;
}

export function isMinMatchesValid(value: number): boolean {
  return Number.isInteger(value) && value >= MIN_MATCHES_FLOOR && value <= MIN_MATCHES_CEIL;
}

export function normalizeMinMatches(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_MIN_MATCHES;
  const inteiro = Math.trunc(value);
  if (inteiro < MIN_MATCHES_FLOOR) return MIN_MATCHES_FLOOR;
  if (inteiro > MIN_MATCHES_CEIL) return MIN_MATCHES_CEIL;
  return inteiro;
}

export function hasConflict(
  row: Pick<ClassificationSuggestion, 'materialConflict' | 'typeConflict'>,
): boolean {
  return row.materialConflict || row.typeConflict;
}

export function parseClassificationSummary(data: unknown): ClassificationSummary {
  const row = Array.isArray(data) ? data.find(isRecord) : isRecord(data) ? data : undefined;
  if (!row) {
    return {
      totalSugestoes: 0,
      naoAtribuidas: 0,
      kitsParaRevisao: 0,
      conflitos: 0,
      altaConfianca: 0,
      ultimaAnalise: null,
    };
  }
  const ultima = asText(row.ultima_analise).trim();
  return {
    totalSugestoes: asNumber(row.total_sugestoes),
    naoAtribuidas: asNumber(row.nao_atribuidas),
    kitsParaRevisao: asNumber(row.kits_para_revisao),
    conflitos: asNumber(row.conflitos),
    altaConfianca: asNumber(row.alta_confianca),
    ultimaAnalise: ultima || null,
  };
}

export function parseClassificationSuggestions(data: unknown): ClassificationSuggestion[] {
  if (!Array.isArray(data)) return [];
  const rows: ClassificationSuggestion[] = [];
  for (const item of data) {
    if (!isRecord(item)) continue;
    const productId = asText(item.product_id).trim();
    if (!productId) continue;
    const matches = asNumber(item.matches);
    const nivel = asNumber(item.nivel);
    rows.push({
      id: asNumber(item.id),
      productId,
      sku: asText(item.sku),
      produto: asText(item.produto),
      isKit: item.is_kit === true,
      categoriaSugerida: asText(item.categoria_sugerida),
      nivel,
      matches,
      score: asNumber(item.score),
      tokensMatched: asText(item.tokens_matched),
      alreadyAssigned: item.already_assigned === true,
      categoriasAtuais: asText(item.categorias_atuais),
      materialConflict: item.material_conflict === true,
      typeConflict: item.type_conflict === true,
      approvedAuto: item.approved_auto === true,
      computedAt: asText(item.computed_at).trim() || null,
      confianca: confidenceOf(matches, nivel),
    });
  }
  return rows;
}

export interface ClassificationListSummary {
  total: number;
  gaps: number;
  conflitos: number;
  kits: number;
  altaConfianca: number;
}

export function resumirSuggestions(rows: ClassificationSuggestion[]): ClassificationListSummary {
  const resumo: ClassificationListSummary = {
    total: rows.length,
    gaps: 0,
    conflitos: 0,
    kits: 0,
    altaConfianca: 0,
  };
  for (const row of rows) {
    if (!row.alreadyAssigned) resumo.gaps += 1;
    if (hasConflict(row)) resumo.conflitos += 1;
    if (row.isKit) resumo.kits += 1;
    if (!row.alreadyAssigned && row.matches >= 4) resumo.altaConfianca += 1;
  }
  return resumo;
}

export function parseApplyResult(data: unknown): ClassificationApplyRow[] {
  if (!Array.isArray(data)) return [];
  const rows: ClassificationApplyRow[] = [];
  for (const item of data) {
    if (!isRecord(item)) continue;
    const acao = asText(item.acao).toUpperCase();
    rows.push({
      acao: acao === 'DRY-RUN' || acao === 'SEM MUDANCA' ? (acao as ApplyOutcome) : 'APLICADO',
      productId: asText(item.product_id),
      sku: asText(item.sku),
      produto: asText(item.produto),
      categoria: asText(item.categoria),
      matches: asNumber(item.matches),
      score: asNumber(item.score),
    });
  }
  return rows;
}

/**
 * Traduz o resultado da aplicação para uma frase de negócio. `SEM MUDANCA` é o
 * caso normal quando o admin repete a ação: a RPC só registra auditoria quando
 * cria atribuição de verdade.
 */
export function describeApplyOutcome(rows: ClassificationApplyRow[]): string {
  if (rows.length === 0) return 'Nenhuma sugestão atingiu o mínimo de matches informado.';
  const acao = rows[0].acao;
  if (acao === 'DRY-RUN') {
    return `${rows.length} sugestão(ões) seriam aplicadas. Nada foi gravado.`;
  }
  if (acao === 'SEM MUDANCA') {
    return `${rows.length} sugestão(ões) avaliadas, mas nenhuma atribuição nova foi criada.`;
  }
  return `${rows.length} atribuição(ões) de categoria criadas e registradas na auditoria.`;
}

export function formatarDataHora(iso: string | null): string {
  if (!iso) return '—';
  const data = new Date(iso);
  if (Number.isNaN(data.getTime())) return '—';
  return data.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

export function describeClassificationError(error: unknown): string {
  const bruto =
    error instanceof Error ? error.message : isRecord(error) ? asText(error.message) : '';
  const texto = bruto.toLowerCase();

  if (texto.includes('restrito a administradores')) {
    return 'Sua conta não tem permissão de administrador para ver a classificação.';
  }
  if (texto.includes('autenticacao obrigatoria') || texto.includes('autenticação obrigatória')) {
    return 'Sessão expirada. Entre novamente para ver a classificação.';
  }
  if (texto.includes('fora da faixa')) {
    return 'O mínimo de matches precisa estar entre 1 e 20.';
  }
  if (texto.includes('pgrst202') || texto.includes('could not find the function')) {
    return 'A classificação ainda não está publicada no banco (migration 20261126211200).';
  }
  if (bruto) return `Não foi possível consultar a classificação: ${bruto}`;
  return 'Não foi possível consultar a classificação. Tente novamente.';
}
