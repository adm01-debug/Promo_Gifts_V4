/**
 * Leitura, comparação e aplicação dos rascunhos locais gravados pelo QuoteAutoSave.
 *
 * Por que este módulo existe: o QuoteAutoSave não tem guarda de modo de edição
 * (QuoteAutoSave.tsx:45-52). Ele grava `quote_draft_<quoteId>` e os snapshots
 * `_v<n>` a cada alteração, inclusive ao editar um orçamento existente. Do outro
 * lado, useAutoSaveQuote só restaura a chave `quote_builder_autosave` e apenas
 * quando NÃO é edição (useQuoteBuilderState.ts:255-257, `!isEditMode`).
 *
 * Resultado até aqui: as alterações não salvas de um orçamento existente eram
 * gravadas a cada 2s, nunca lidas de volta por ninguém, e apagadas por
 * cleanOldQuoteDrafts (useAutoSaveQuote.ts:61-80) depois de 7 dias. O leitor
 * chegou a existir em `useQuoteAutoSave` (QuoteAutoSave.tsx:370) mas tinha zero
 * consumidores. Este módulo é a metade que faltava.
 */
import { logger } from '@/lib/logger';
import { quoteDraftRecoverySchema } from '@/lib/quotes/quoteDraftRecovery';
import { syncValidityDaysFromDate } from '@/hooks/quotes/useQuoteBuilderState.helpers';
import type { useQuoteBuilderState } from '@/hooks/quotes/useQuoteBuilderState';

export const QUOTE_DRAFT_KEY_PREFIX = 'quote_draft_';

type BuilderState = ReturnType<typeof useQuoteBuilderState>;

/**
 * Os campos que o QuoteBuilderPage entrega ao QuoteAutoSave.
 *
 * `companyInfo`, `contactInfo`, `validityDays`, `deliveryMode` e `deliveryDate`
 * entraram em 2026-11-18. `applyDraftToBuilder` já os lia (linhas 171-172 e
 * 188-215) porque a cobertura veio do QuoteBuilderDraftRecovery escrito por
 * outro agente, mas a página nunca os gravava — o rascunho local não tinha esses
 * campos, então aquele trecho de restauração nunca podia rodar. Efeito para o
 * vendedor: empresa, contato, validade escolhida e data de entrega sumiam ao
 * recuperar o rascunho, e mexer só nesses campos não acendia "alterações não
 * salvas".
 */
export type QuoteDraftSnapshot = Pick<
  BuilderState,
  | 'clientId'
  | 'companyInfo'
  | 'contactId'
  | 'contactInfo'
  | 'deliveryDate'
  | 'deliveryMode'
  | 'deliveryTime'
  | 'discountType'
  | 'discountValue'
  | 'items'
  | 'negotiationMarkup'
  | 'notes'
  | 'paymentMethod'
  | 'paymentTerms'
  | 'shippingCost'
  | 'shippingType'
  | 'validityDays'
  | 'validUntil'
>;

/** Setters já expostos pelo useQuoteBuilderState; nenhum setter novo é necessário. */
export type QuoteDraftApplyTarget = Pick<
  BuilderState,
  | 'handleDeliveryDateChange'
  | 'handleDeliveryModeChange'
  | 'setClientId'
  | 'setCompanyInfo'
  | 'setContactId'
  | 'setContactInfo'
  | 'setDeliveryTime'
  | 'setDiscountType'
  | 'setDiscountValue'
  | 'setItems'
  | 'setNegotiationMarkup'
  | 'setNotes'
  | 'setPaymentMethod'
  | 'setPaymentTerms'
  | 'setShippingCost'
  | 'setShippingType'
  | 'setValidityDays'
  | 'setValidUntil'
>;

export type RecoveredQuoteDraft = ReturnType<typeof quoteDraftRecoverySchema.parse>;

export interface StoredQuoteDraft {
  /** Epoch ms de quando o QuoteAutoSave gravou este rascunho. */
  savedAt: number;
  data: RecoveredQuoteDraft;
}

export function quoteDraftKey(quoteId: string): string {
  return `${QUOTE_DRAFT_KEY_PREFIX}${quoteId}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Por que um rascunho existente não pôde ser lido. */
export type MotivoIlegivel =
  'data-invalida' | 'envelope-invalido' | 'fora-de-forma' | 'inacessivel' | 'json-invalido';

export type EstadoRascunho =
  | { estado: 'ausente' }
  | { estado: 'ilegivel'; motivo: MotivoIlegivel }
  | { estado: 'ok'; draft: StoredQuoteDraft };

/**
 * Inspeciona o rascunho de `storageKey` e diz em que estado ele está. Nunca lança
 * e nunca apaga nada: descartar é decisão do usuário, não do leitor.
 *
 * Distinguir "ausente" de "ilegível" não é preciosismo. O
 * tests/components/QuoteAutoSave.recovery.test.tsx escrito por outro agente
 * (branch salvo/codex-fix-gate1-kit-pdf-types-261109-2252) especifica
 * "keeps a rejected snapshot available and displays the real error": um rascunho
 * que existe mas não pode ser lido tem de ser DITO ao vendedor, não só logado —
 * senão ele acha que não havia nada para recuperar.
 */
export function inspectStoredQuoteDraft(storageKey: string): EstadoRascunho {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(storageKey);
  } catch (err) {
    logger.warn('Rascunho local inacessível', err);
    return { estado: 'ilegivel', motivo: 'inacessivel' };
  }
  if (!raw) return { estado: 'ausente' };

  let envelope: unknown;
  try {
    envelope = JSON.parse(raw);
  } catch {
    logger.warn('Envelope de rascunho corrompido', { storageKey });
    return { estado: 'ilegivel', motivo: 'json-invalido' };
  }
  if (!isRecord(envelope)) return { estado: 'ilegivel', motivo: 'envelope-invalido' };

  const savedAtRaw = envelope.savedAt;
  const savedAt = typeof savedAtRaw === 'string' ? new Date(savedAtRaw).getTime() : NaN;
  if (!Number.isFinite(savedAt)) return { estado: 'ilegivel', motivo: 'data-invalida' };

  const parsed = quoteDraftRecoverySchema.safeParse(envelope.data);
  if (!parsed.success) {
    logger.warn('Rascunho local fora de forma', {
      storageKey,
      issues: parsed.error.issues
        .slice(0, 5)
        .map((i) => ({ path: i.path.join('.'), code: i.code })),
    });
    return { estado: 'ilegivel', motivo: 'fora-de-forma' };
  }

  return { estado: 'ok', draft: { savedAt, data: parsed.data } };
}

/** Atalho para quem só quer o rascunho legível. */
export function readStoredQuoteDraft(storageKey: string): StoredQuoteDraft | null {
  const resultado = inspectStoredQuoteDraft(storageKey);
  return resultado.estado === 'ok' ? resultado.draft : null;
}

/** Normaliza para os defaults do builder ('' e 0) para que nulo e vazio não contem como diferença. */
function comparable(snapshot: {
  clientId?: string | null;
  contactId?: string | null;
  validUntil?: string | null;
  discountType?: string | null;
  discountValue?: number | null;
  negotiationMarkup?: number | null;
  paymentMethod?: string | null;
  paymentTerms?: string | null;
  deliveryTime?: string | null;
  shippingType?: string | null;
  shippingCost?: number | null;
  notes?: string | null;
  items?: unknown[] | null;
}): string {
  const text = (value?: string | null) => value ?? '';
  const num = (value?: number | null) => value ?? 0;
  // discountType nasce 'percent' no builder (useQuoteBuilderState.ts:82); normalizar para ''
  // faria todo rascunho sem o campo parecer diferente da tela e abriria o diálogo à toa.
  const discountType = snapshot.discountType ?? 'percent';
  return JSON.stringify([
    text(snapshot.clientId),
    text(snapshot.contactId),
    text(snapshot.validUntil),
    discountType,
    num(snapshot.discountValue),
    num(snapshot.negotiationMarkup),
    text(snapshot.paymentMethod),
    text(snapshot.paymentTerms),
    text(snapshot.deliveryTime),
    text(snapshot.shippingType),
    num(snapshot.shippingCost),
    text(snapshot.notes),
    snapshot.items ?? [],
  ]);
}

/** True quando o rascunho tem algo que a tela não tem — só aí vale incomodar o usuário. */
export function draftDiffersFromCurrent(
  draft: RecoveredQuoteDraft,
  current: QuoteDraftSnapshot,
): boolean {
  return comparable(draft) !== comparable(current);
}

/**
 * Aplica o rascunho ao builder usando apenas setters já expostos.
 *
 * Ordem do frete não é estilo: o `setShippingType` exposto é o
 * handleShippingTypeChange (useQuoteBuilderState.ts:155-170), que ZERA o
 * shippingCost quando o tipo não é 'fob_pre'. O custo precisa ser reaplicado
 * depois dele, senão a restauração perde o frete que acabou de restaurar.
 */
export function applyDraftToBuilder(draft: RecoveredQuoteDraft, s: QuoteDraftApplyTarget): void {
  if (draft.clientId) s.setClientId(draft.clientId);
  if (draft.contactId) s.setContactId(draft.contactId);
  if (draft.companyInfo) s.setCompanyInfo(draft.companyInfo);
  if (draft.contactInfo) s.setContactInfo(draft.contactInfo);
  if (draft.items) s.setItems(draft.items);
  if (draft.discountType) s.setDiscountType(draft.discountType);
  if (typeof draft.discountValue === 'number') s.setDiscountValue(draft.discountValue);
  if (typeof draft.negotiationMarkup === 'number' && draft.negotiationMarkup > 0) {
    s.setNegotiationMarkup(draft.negotiationMarkup);
  }
  if (draft.paymentMethod) s.setPaymentMethod(draft.paymentMethod);
  if (draft.paymentTerms) s.setPaymentTerms(draft.paymentTerms);

  // O rascunho pode trazer o modo de entrega explícito (`deliveryMode`/`deliveryDate`) ou só
  // `deliveryTime`. Os campos explícitos vêm do QuoteBuilderDraftRecovery escrito por outro
  // agente em salvo/codex-fix-gate1-kit-pdf-types-261109-2252
  // (src/components/quotes/QuoteBuilderDraftRecovery.tsx): aquele componente dependia de uma
  // prop `onRestore` que o QuoteAutoSave da main não tem, mas a cobertura de campos dele é
  // maior que a minha e fica preservada aqui.
  const modoExplicito = draft.deliveryMode === 'data' || draft.deliveryMode === 'prazo';
  if (modoExplicito || draft.deliveryTime) {
    const porData = modoExplicito
      ? draft.deliveryMode === 'data'
      : Boolean(draft.deliveryTime?.startsWith('date:'));
    // handleDeliveryModeChange limpa deliveryTime/deliveryDate, então vem primeiro.
    s.handleDeliveryModeChange(porData ? 'data' : 'prazo');
    if (porData) {
      const iso =
        draft.deliveryDate ??
        (draft.deliveryTime?.startsWith('date:')
          ? `${draft.deliveryTime.slice(5)}T12:00:00`
          : null);
      const parsedDate = iso ? new Date(iso) : null;
      if (parsedDate && Number.isFinite(parsedDate.getTime())) {
        s.handleDeliveryDateChange(parsedDate);
      } else {
        logger.warn('Data de entrega do rascunho inválida', {
          deliveryTime: draft.deliveryTime,
          deliveryDate: draft.deliveryDate,
        });
      }
    } else if (draft.deliveryTime) {
      s.setDeliveryTime(draft.deliveryTime);
    }
  }

  if (draft.shippingType) s.setShippingType(draft.shippingType);
  if (typeof draft.shippingCost === 'number') s.setShippingCost(draft.shippingCost);

  if (draft.validUntil) {
    s.setValidUntil(draft.validUntil);
    // QBP-12: manter o Select de validade em sincronia com a data restaurada. Se o rascunho
    // trouxe o `validityDays` que o vendedor escolheu (campo que o QuoteBuilderDraftRecovery
    // citado acima já gravava), respeita a escolha em vez de deduzir da data.
    s.setValidityDays(draft.validityDays || syncValidityDaysFromDate(draft.validUntil));
  } else if (draft.validityDays) {
    s.setValidityDays(draft.validityDays);
  }
  if (draft.notes) s.setNotes(draft.notes);
}

/** Remove o rascunho e todo o histórico `_v<n>` daquele orçamento. */
export function discardStoredQuoteDraft(storageKey: string): void {
  try {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && (k === storageKey || k.startsWith(`${storageKey}_v`))) keys.push(k);
    }
    for (const k of keys) localStorage.removeItem(k);
  } catch (err) {
    logger.warn('Falha ao descartar rascunho local', err);
  }
}
