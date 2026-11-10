import type { useQuoteBuilderState } from '@/hooks/useQuoteBuilderState';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export function QuoteBuilderPaymentMethodField({
  state: s,
}: {
  state: Pick<
    ReturnType<typeof useQuoteBuilderState>,
    'paymentMethod' | 'setPaymentMethod' | 'validationErrors'
  >;
}) {
  return (
    <div className="space-y-1">
      <Label htmlFor="legacy-quote-payment-method" className="text-xs text-muted-foreground">
        Forma | Pagamento
      </Label>
      <Select value={s.paymentMethod} onValueChange={s.setPaymentMethod}>
        <SelectTrigger
          id="legacy-quote-payment-method"
          className={cn(
            'h-8 text-xs',
            s.validationErrors.includes('forma_pagamento') && 'border-destructive',
          )}
        >
          <SelectValue placeholder="Selecione" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="boleto">Boleto Bancário</SelectItem>
          <SelectItem value="pix_transferencia">Transferência Bancária / Pix</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
