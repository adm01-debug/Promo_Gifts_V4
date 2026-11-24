/**
 * Caminho único de escrita de status de orçamento (etapa 095 · ACH-086).
 *
 * O mapa `QUOTE_VALID_TRANSITIONS` existe desde sempre, mas nada obrigava um
 * ponto de escrita a consultá-lo. Este módulo é o único lugar do front que pode
 * mandar um `UPDATE ... SET status` em `public.quotes`: valida o par (de → para)
 * pelo mapa, emite telemetria quando barra e traduz o erro de transição do
 * banco (SQLSTATE 23514) em mensagem legível.
 *
 * Escopo deliberado: NÃO dispara e-mail transacional nem grava histórico —
 * isso continua em `quoteService.updateQuoteStatus`, que tem contrato próprio.
 * Aqui a responsabilidade é a guarda de transição + a chamada ao banco.
 */
import { supabase } from '@/integrations/supabase/client';
import { QUOTE_STATUS_CONFIG, isValidQuoteTransition } from '@/lib/quote-status-config';
import {
  logInvalidStatusTransition,
  type InvalidTransitionSource,
} from '@/lib/telemetry/quoteStatusTelemetry';
import type { QuoteStatus } from '@/types/quote';

/** Erro de transição, com mensagem pronta para o usuário final. */
export class QuoteStatusTransitionError extends Error {
  readonly code = 'QUOTE_STATUS_TRANSITION_BLOCKED';
  readonly fromStatus: QuoteStatus;
  readonly toStatus: QuoteStatus;
  readonly quoteId: string | null;
  readonly source: InvalidTransitionSource;

  constructor(params: {
    quoteId: string | null;
    fromStatus: QuoteStatus;
    toStatus: QuoteStatus;
    reason: 'config' | 'db';
    source: InvalidTransitionSource;
    dbConstraint?: string | null;
  }) {
    const fromLabel = QUOTE_STATUS_CONFIG[params.fromStatus]?.label ?? params.fromStatus;
    const toLabel = QUOTE_STATUS_CONFIG[params.toStatus]?.label ?? params.toStatus;
    super(
      params.reason === 'db'
        ? `O banco recusou a mudança de status de "${fromLabel}" para "${toLabel}". Atualize a página e tente novamente.`
        : `Não é possível alterar o status de "${fromLabel}" para "${toLabel}".`,
    );
    this.name = 'QuoteStatusTransitionError';
    this.quoteId = params.quoteId;
    this.fromStatus = params.fromStatus;
    this.toStatus = params.toStatus;
    this.source = params.source;
  }
}

export interface UpdateQuoteStatusInput {
  quoteId: string;
  /** Status de destino. */
  to: QuoteStatus;
  /**
   * Status atual, quando o chamador já o conhece (ex.: veio do `quote` em tela).
   * Omitido → é lido do banco, custando um round-trip extra.
   */
  from?: QuoteStatus | null;
  /** Origem da escrita, para a telemetria. Padrão: `service`. */
  source?: InvalidTransitionSource;
}

export interface UpdateQuoteStatusResult {
  fromStatus: QuoteStatus;
  toStatus: QuoteStatus;
  /** `true` quando o status já era o destino e nenhum UPDATE foi enviado. */
  unchanged: boolean;
}

export interface QuoteStatusTarget {
  /** Aceita `{ status }`, uma linha completa de `quotes` ou o status cru. */
  status?: unknown;
}

function normalizeStatus(value: unknown): QuoteStatus | null {
  if (typeof value === 'string') return value as QuoteStatus;
  if (value && typeof value === 'object' && 'status' in (value as QuoteStatusTarget)) {
    const inner = (value as QuoteStatusTarget).status;
    return typeof inner === 'string' ? (inner as QuoteStatus) : null;
  }
  return null;
}

/** Lança `QuoteStatusTransitionError` quando o mapa do FE proíbe o par. */
export function assertQuoteStatusTransition(
  from: unknown,
  to: unknown,
  context: { quoteId?: string | null; source?: InvalidTransitionSource } = {},
): void {
  const fromStatus = normalizeStatus(from);
  const toStatus = normalizeStatus(to);
  const source = context.source ?? 'service';
  const quoteId = context.quoteId ?? null;
  if (!fromStatus || !toStatus) {
    throw new Error('Status de orçamento inválido na chamada de transição.');
  }
  if (fromStatus === toStatus) return;
  if (isValidQuoteTransition(fromStatus, toStatus)) return;
  logInvalidStatusTransition({
    quoteId,
    from: fromStatus,
    to: toStatus,
    reason: 'not_allowed_by_config',
    source,
  });
  throw new QuoteStatusTransitionError({
    quoteId,
    fromStatus,
    toStatus,
    reason: 'config',
    source,
  });
}

async function readCurrentStatus(quoteId: string): Promise<QuoteStatus> {
  const { data, error } = await supabase
    .from('quotes') // rls-allow: SELECT por id; RLS (can_access_quote) valida ownership
    .select('status')
    .eq('id', quoteId)
    .single();
  if (error) throw error;
  if (!data) throw new Error('Orçamento não encontrado');
  return data.status as QuoteStatus;
}

/**
 * Único caminho de escrita de status no front. Valida pelo mapa e só então
 * chama o Supabase. Devolve o par efetivamente aplicado.
 */
export async function updateQuoteStatusSafely(
  input: UpdateQuoteStatusInput,
): Promise<UpdateQuoteStatusResult> {
  const { quoteId, to } = input;
  const source = input.source ?? 'service';
  const fromStatus =
    input.from === undefined || input.from === null
      ? await readCurrentStatus(quoteId)
      : input.from;

  assertQuoteStatusTransition(fromStatus, to, { quoteId, source });

  if (fromStatus === to) {
    return { fromStatus, toStatus: to, unchanged: true };
  }

  const { error } = await supabase
    .from('quotes') // rls-allow: UPDATE de status por id; RLS valida ownership
    .update({ status: to })
    .eq('id', quoteId);

  if (error) {
    const pgError = error as { code?: string; message?: string; hint?: string | null };
    const isConstraintViolation =
      pgError.code === '23514' ||
      /valid_quote_status|Transicao de status|Transição de status/i.test(pgError.message ?? '');
    if (isConstraintViolation) {
      logInvalidStatusTransition({
        quoteId,
        from: fromStatus,
        to,
        reason: 'db_check_violation',
        source: 'db',
        dbError: { code: pgError.code, hint: pgError.hint ?? null, constraint: 'quotes_status' },
      });
      throw new QuoteStatusTransitionError({
        quoteId,
        fromStatus,
        toStatus: to,
        reason: 'db',
        source,
        dbConstraint: 'quotes_status',
      });
    }
    throw error;
  }

  return { fromStatus, toStatus: to, unchanged: false };
}