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

/** Os campos que o QuoteBuilderPage entrega ao QuoteAutoSave (QuoteBuilderPage.tsx:179-199). */
export type QuoteDraftSnapshot = Pick<
  BuilderState,
  'clientId' | 'contactId' | 'deliveryTime' | 'discountType' | 'discountValue' | 'items' | 'negotiationMarkup' | 'notes' | 'paymentMethod' | 'paymentTerms' | 'shippingCost' | 'shippingType' | 'validUntil'
>;

/** Setters já expostos pelo useQuoteBuilderState; nenhum setter novo é necessário. */
export type QuoteDraftApplyTarget = Pick<
  BuilderState,
  'handleDeliveryDateChange' | 'handleDeliveryModeChange' | 'setClientId' | 'setCompanyInfo' | 'setContactId' | 'setContactInfo' | 'setDeliveryTime' | 'setDiscountType' | 'setDiscountValue' | 'setItems' | 'setNegotiationMarkup' | 'setNotes' | 'setPaymentMethod' | 'setPaymentTerms' | 'setShippingCost' | 'setShippingType' | 'setValidityDays' | 'setValidUntil'
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

/**
 * Lê e valida o rascunho de `storageKey`. Devolve null quando não existe, quando
 * o envelope está corrompido ou quando o conteúdo não passa pelo schema — nunca
 * lança, e nunca apaga nada: descartar é decisão do usuário, não do leitor.
 */
export function readStoredQuoteDraft(storageKey: string): StoredQuoteDraft | null {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(storageKey);
  } catch (err) {
    logger.warn('Rascunho local inacessível', err);
    return null;
  }
  if (!raw) return null;

  let envelope: unknown;
  try {
    envelope = JSON.parse(raw);
  } catch {
    logger.warn('Envelope de rascunho corrompido — recuperação não oferecida', { storageKey });
    return null;
  }
  if (!isRecord(envelope)) return null;

  const savedAtRaw = envelope.savedAt;
  const savedAt = typeof savedAtRaw === 'string' ? new Date(savedAtRaw).getTime() : NaN;
  if (!Number.isFinite(savedAt)) return null;

  const parsed = quoteDraftRecoverySchema.safeParse(envelope.data);
  if (!parsed.success) {
    logger.warn('Rascunho local fora de forma — recuperação não oferecida', {
      storageKey,
      issues: parsed.error.issues.slice(0, 5).map((i) => ({ path: i.path.join('.'), code: i.code })),
    });
    return null;
  }

  return { savedAt, data: parsed.data };
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

  if (draft.deliveryTime) {
    if (draft.deliveryTime.startsWith('date:')) {
      // handleDeliveryModeChange limpa deliveryTime/deliveryDate, então vem primeiro.
      s.handleDeliveryModeChange('data');
      const parsedDate = new Date(`${draft.deliveryTime.slice(5)}T12:00:00`);
      if (Number.isFinite(parsedDate.getTime())) {
        s.handleDeliveryDateChange(parsedDate);
      } else {
        logger.warn('Data de entrega do rascunho inválida', { deliveryTime: draft.deliveryTime });
      }
    } else {
      s.handleDeliveryModeChange('prazo');
      s.setDeliveryTime(draft.deliveryTime);
    }
  }

  if (draft.shippingType) s.setShippingType(draft.shippingType);
  if (typeof draft.shippingCost === 'number') s.setShippingCost(draft.shippingCost);

  if (draft.validUntil) {
    s.setValidUntil(draft.validUntil);
    // QBP-12: manter o Select de validade em sincronia com a data restaurada.
    s.setValidityDays(syncValidityDaysFromDate(draft.validUntil));
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
