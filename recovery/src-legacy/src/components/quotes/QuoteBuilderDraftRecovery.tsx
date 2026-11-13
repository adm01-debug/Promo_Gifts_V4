import type { ComponentProps } from 'react';
import type { useQuoteBuilderState } from '@/hooks/useQuoteBuilderState';
import { quoteDraftRecoverySchema } from '@/lib/quotes/quoteDraftRecovery';
import { format, addDays } from 'date-fns';
import { toast } from 'sonner';
import { QuoteAutoSave } from './QuoteAutoSave';

export function QuoteBuilderDraftRecovery({
  state: s,
  onChange,
}: {
  state: ReturnType<typeof useQuoteBuilderState>;
  onChange: ComponentProps<typeof QuoteAutoSave>['onChange'];
}) {
  return (
    <QuoteAutoSave
      quoteId={s.quoteId}
      data={{
        clientId: s.clientId,
        contactId: s.contactId,
        companyInfo: s.companyInfo,
        contactInfo: s.contactInfo,
        validityDays: s.validityDays,
        validUntil: s.validUntil,
        discountType: s.discountType,
        discountValue: s.discountValue,
        negotiationMarkup: s.negotiationMarkup,
        notes: s.notes,
        internalNotes: s.internalNotes,
        paymentMethod: s.paymentMethod,
        paymentTerms: s.paymentTerms,
        deliveryTime: s.deliveryTime,
        deliveryMode: s.deliveryMode,
        deliveryDate: s.deliveryDate,
        shippingType: s.shippingType,
        shippingCost: s.shippingCost,
        items: s.items,
      }}
      onChange={onChange}
      onRestore={(raw) => {
        const parsed = quoteDraftRecoverySchema.safeParse(raw);
        if (!parsed.success)
          throw new Error('O rascunho contém dados incompatíveis e foi preservado sem alterações.');
        const data = parsed.data;
        s.setClientId(data.clientId || '');
        if (typeof data.contactId === 'string') s.setContactId(data.contactId);
        if (data.companyInfo !== undefined) s.setCompanyInfo(data.companyInfo);
        if (data.contactInfo !== undefined) s.setContactInfo(data.contactInfo);
        if (typeof data.validityDays === 'string') s.setValidityDays(data.validityDays);
        s.setValidUntil(data.validUntil || format(addDays(new Date(), 30), 'yyyy-MM-dd'));
        s.setDiscountType(data.discountType || 'percent');
        s.setDiscountValue(data.discountValue || 0);
        if (typeof data.negotiationMarkup === 'number')
          s.setNegotiationMarkup(data.negotiationMarkup);
        s.setNotes(data.notes || '');
        s.setInternalNotes(data.internalNotes || '');
        if (typeof data.paymentMethod === 'string') s.setPaymentMethod(data.paymentMethod);
        if (typeof data.paymentTerms === 'string') s.setPaymentTerms(data.paymentTerms);
        if (typeof data.deliveryTime === 'string') s.setDeliveryTime(data.deliveryTime);
        if (typeof data.deliveryMode === 'string') s.setDeliveryMode(data.deliveryMode);
        if (typeof data.deliveryDate === 'string') s.setDeliveryDate(new Date(data.deliveryDate));
        else if (data.deliveryDate === null) s.setDeliveryDate(undefined);
        else if (data.deliveryTime?.startsWith('date:')) {
          s.setDeliveryMode('data');
          s.setDeliveryDate(new Date(`${data.deliveryTime.slice(5)}T12:00:00`));
        }
        if (typeof data.shippingType === 'string') s.setShippingType(data.shippingType);
        if (typeof data.shippingCost === 'number') s.setShippingCost(data.shippingCost);
        s.setItems(data.items || []);
        toast.success('Rascunho restaurado!');
      }}
      className="fixed right-4 top-20 z-40"
    />
  );
}
