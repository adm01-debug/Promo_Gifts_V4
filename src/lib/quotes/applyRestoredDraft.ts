/**
 * Aplica ao construtor de orçamento um rascunho restaurado do localStorage.
 *
 * Extraído de `useQuoteBuilderState.onRestore` (o hook está acima do limite do gate
 * de tamanho de arquivo) seguindo o mesmo padrão de `applyLoadedQuote` em
 * `useQuoteBuilderState.helpers.ts`: um objeto de setters, um aplicador puro.
 *
 * GUARD: o chamador só entrega aqui rascunho já validado por
 * `validarRascunhoRestaurado` (src/lib/quotes/quoteDraftRecovery.ts). Esta função
 * não valida de novo — ela aplica, campo a campo, só o que existe.
 */
import type { QuoteItem } from '@/hooks/quotes';
import type {
  SelectedCompanyInfo,
  SelectedContactInfo,
} from '@/components/quotes/CompanyContactSelector';
import { parseFreightMixMode, parseShowFreightPlan } from '@/hooks/quotes/useFreightPlanOptions';
import type { MixMode } from '@/lib/freight';
import { logger } from '@/lib/logger';

/** Forma do rascunho que o autosave do construtor grava. */
export interface RestoredQuoteDraft {
  clientId?: string | null;
  contactId?: string | null;
  companyInfo?: SelectedCompanyInfo | null;
  contactInfo?: SelectedContactInfo | null;
  items?: QuoteItem[] | null;
  discountType?: 'amount' | 'percent' | null;
  discountValue?: number | null;
  negotiationMarkup?: number | null;
  paymentMethod?: string | null;
  paymentTerms?: string | null;
  deliveryTime?: string | null;
  shippingType?: string | null;
  shippingCost?: number | null;
  /** Gravados pelo autosave; valor fora do esperado vira o padrão na restauração. */
  freightMixMode?: unknown;
  showFreightPlanToClient?: unknown;
  validUntil?: string | null;
  notes?: string | null;
}

export interface RestoredDraftSetters {
  setClientId: (v: string) => void;
  setContactId: (v: string) => void;
  setCompanyInfo: (v: SelectedCompanyInfo) => void;
  setContactInfo: (v: SelectedContactInfo) => void;
  setItems: (v: QuoteItem[]) => void;
  setDiscountType: (v: 'amount' | 'percent') => void;
  setDiscountValue: (v: number) => void;
  setNegotiationMarkup: (v: number) => void;
  setPaymentMethod: (v: string) => void;
  setPaymentTerms: (v: string) => void;
  setDeliveryTime: (v: string) => void;
  setDeliveryMode: (v: 'data' | 'prazo') => void;
  setDeliveryDate: (v: Date) => void;
  /** QBP-07: state pendente + efeito com cleanup, evita setState em desmontado. */
  setPendingShippingTypeRestore: (v: string) => void;
  setShippingCost: (v: number) => void;
  setFreightMixMode: (v: MixMode) => void;
  setShowFreightPlanToClient: (v: boolean) => void;
  setValidUntil: (v: string) => void;
  setValidityDays: (v: string) => void;
  setNotes: (v: string) => void;
  setDraftRestoredAt: (v: number) => void;
  syncValidityDaysFromDate: (isoDate: string) => string;
}

export function applyRestoredDraft(saved: RestoredQuoteDraft, s: RestoredDraftSetters): void {
  if (saved.clientId) s.setClientId(saved.clientId);
  if (saved.contactId) s.setContactId(saved.contactId);
  if (saved.companyInfo) s.setCompanyInfo(saved.companyInfo);
  if (saved.contactInfo) s.setContactInfo(saved.contactInfo);
  if (saved.items) s.setItems(saved.items);
  if (saved.discountType) s.setDiscountType(saved.discountType);
  if (typeof saved.discountValue === 'number') s.setDiscountValue(saved.discountValue);
  if (typeof saved.negotiationMarkup === 'number' && saved.negotiationMarkup > 0)
    s.setNegotiationMarkup(saved.negotiationMarkup);
  if (saved.paymentMethod) s.setPaymentMethod(saved.paymentMethod);
  if (saved.paymentTerms) s.setPaymentTerms(saved.paymentTerms);
  if (saved.deliveryTime) {
    s.setDeliveryTime(saved.deliveryTime);
    if (saved.deliveryTime.startsWith('date:')) {
      s.setDeliveryMode('data');
      try {
        s.setDeliveryDate(new Date(`${saved.deliveryTime.slice(5)}T12:00:00`));
      } catch (e) {
        logger.warn('Failed to restore delivery date', e);
      }
    } else {
      s.setDeliveryMode('prazo');
    }
  }
  if (saved.shippingType) s.setPendingShippingTypeRestore(saved.shippingType);
  if (saved.shippingCost) s.setShippingCost(saved.shippingCost);
  if (saved.freightMixMode !== undefined)
    s.setFreightMixMode(parseFreightMixMode(saved.freightMixMode));
  if (saved.showFreightPlanToClient !== undefined) {
    s.setShowFreightPlanToClient(parseShowFreightPlan(saved.showFreightPlanToClient));
  }
  if (saved.validUntil) {
    s.setValidUntil(saved.validUntil);
    // QBP-12: sincroniza o Select de validade; antes ficava em "Selecione".
    s.setValidityDays(s.syncValidityDaysFromDate(saved.validUntil));
  }
  if (saved.notes) s.setNotes(saved.notes);
  if (!saved.shippingType) s.setDraftRestoredAt(Date.now());
}
