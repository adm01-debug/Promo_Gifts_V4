import { CheckCircle2 } from 'lucide-react';
import { DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { isValidQuoteTransition } from '@/lib/quote-status-config';
import type { Quote } from '@/hooks/quotes';

interface QuoteRowApproveItemProps {
  quote: Quote;
  /**
   * Mesmo handler que a página já usa para a ação em lote
   * (`onBulkStatusChange` -> `updateQuoteStatus`). Reaproveitar significa que a
   * permissão efetiva continua sendo a do banco: a lista não cria regra nova
   * sobre quem pode aprovar.
   */
  onApprove?: (ids: string[], status: string) => void;
}

/**
 * Item "Aprovar" do menu da linha. Só aparece quando o pai passa o handler e
 * quando a transição para `approved` é válida para o status atual — `sent` e
 * `viewed` podem; `approved` já só vai para `converted`
 * (`src/lib/quote-status-config.ts`).
 */
export function QuoteRowApproveItem({ quote, onApprove }: QuoteRowApproveItemProps) {
  const quoteId = quote.id;
  if (!onApprove || !isValidQuoteTransition(quote.status, 'approved')) return null;

  return (
    <DropdownMenuItem
      data-testid={`quote-row-menu-approve-${quote.id}`}
      disabled={!quoteId}
      onClick={() => quoteId && onApprove([quoteId], 'approved')}
    >
      <CheckCircle2 className="mr-2 h-4 w-4" /> Aprovar
    </DropdownMenuItem>
  );
}
