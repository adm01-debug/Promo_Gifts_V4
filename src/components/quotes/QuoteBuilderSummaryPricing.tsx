import { AlertTriangle } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { QuoteItem } from '@/hooks/quotes';
import {
  NegotiationMarkupCard,
  NegotiationPriceComparison,
} from '@/components/quotes/NegotiationMarkupCard';
import { getDiscountValidationMessage } from '@/lib/quotes/discount-validation-messages';

interface QuoteBuilderSummaryPricingProps {
  items: QuoteItem[];
  discountType: 'amount' | 'percent';
  discountValue: number;
  setDiscountValue: (v: number) => void;
  discountAmount: number;
  presentedSubtotal: number;
  handleDiscountTypeChange: (next: 'amount' | 'percent') => void;
  isDiscountExceeded?: boolean;
  maxDiscountPercent?: number | null;
  negotiationMarkup?: number;
  setNegotiationMarkup?: (v: number) => void;
  realSubtotal?: number;
  realDiscountPercent?: number;
  formatCurrency: (v: number) => string;
}

export function QuoteBuilderSummaryPricing({
  items,
  discountType,
  discountValue,
  setDiscountValue,
  discountAmount,
  presentedSubtotal,
  handleDiscountTypeChange,
  isDiscountExceeded,
  maxDiscountPercent,
  negotiationMarkup = 0,
  setNegotiationMarkup,
  realSubtotal = 0,
  realDiscountPercent = 0,
  formatCurrency,
}: QuoteBuilderSummaryPricingProps) {
  if (items.length === 0) return null;

  return (
    <>
      {/* Discount */}
      <div className="space-y-2.5 border-t border-border/50 bg-card/95 px-4 pt-3 shadow-[0_-16px_24px_-24px_hsl(var(--foreground)/0.55)] backdrop-blur supports-[backdrop-filter]:bg-card/85">
        <div className="flex items-center gap-2">
          <TooltipProvider delayDuration={200}>
            {(() => {
              const tooltipContent = (
                <TooltipContent
                  side="top"
                  align="start"
                  id="quote-discount-tooltip"
                  data-testid="quote-discount-tooltip"
                  className="max-w-[240px] text-xs leading-relaxed"
                >
                  <p className="mb-1 font-semibold">Como aplicar o desconto</p>
                  <ul className="space-y-0.5 text-muted-foreground">
                    <li>
                      <span className="font-medium text-foreground">%</span> sobre o subtotal
                      — ex.: 5 = 5%.
                    </li>
                    <li>
                      <span className="font-medium text-foreground">R$</span> valor fixo —
                      ex.: 50,00.
                    </li>
                  </ul>
                  {maxDiscountPercent !== null && maxDiscountPercent !== undefined && (
                    <p className="mt-1.5 border-t border-border/40 pt-1 text-[11px]">
                      {isDiscountExceeded ? (
                        <>
                          <span className="font-semibold text-amber-500">
                            Acima do seu limite ({maxDiscountPercent}%).
                          </span>{' '}
                          Será enviado ao gestor comercial para aprovação antes do envio ao
                          cliente.
                        </>
                      ) : (
                        <>
                          Limite sem aprovação do gestor:{' '}
                          <span className="font-bold text-foreground">
                            {maxDiscountPercent}%
                          </span>
                          .
                        </>
                      )}
                    </p>
                  )}
                </TooltipContent>
              );
              return (
                <>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="inline-flex">
                        <Select
                          value={discountType}
                          onValueChange={(v) =>
                            handleDiscountTypeChange(v as 'amount' | 'percent')
                          }
                        >
                          <SelectTrigger
                            data-testid="quote-discount-type-select"
                            className="h-8 w-16 text-xs"
                            aria-label="Tipo de desconto — alternar entre % e R$"
                            aria-describedby="quote-discount-tooltip"
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="percent">%</SelectItem>
                            <SelectItem value="amount">R$</SelectItem>
                          </SelectContent>
                        </Select>
                      </span>
                    </TooltipTrigger>
                    {tooltipContent}
                  </Tooltip>
                  <div className="flex-1">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="inline-flex w-full">
                          <CurrencyInput
                            data-testid="quote-discount-input"
                            value={discountValue}
                            onChange={setDiscountValue}
                            max={discountType === 'percent' ? 100 : presentedSubtotal}
                            aria-describedby="quote-discount-tooltip"
                            aria-invalid={isDiscountExceeded || undefined}
                            className={cn(
                              'h-8 w-full text-xs font-semibold tabular-nums',
                              isDiscountExceeded
                                ? 'border-amber-500/50 focus-visible:ring-amber-500/30'
                                : 'border-border/50',
                            )}
                          />
                        </span>
                      </TooltipTrigger>
                      {tooltipContent}
                    </Tooltip>
                  </div>
                </>
              );
            })()}
          </TooltipProvider>
        </div>
        {(() => {
          const rawPercent =
            discountType === 'percent'
              ? discountValue
              : presentedSubtotal > 0
                ? (discountValue / presentedSubtotal) * 100
                : 0;
          const validation = getDiscountValidationMessage({
            rawPercent,
            realDiscountPercent,
            maxDiscountPercent: maxDiscountPercent ?? null,
            hasMarkup: (negotiationMarkup ?? 0) > 0,
            markupPercent: negotiationMarkup ?? 0,
          });
          if (validation.kind === 'idle' || validation.kind === 'within_limit') return null;
          const palette =
            validation.severity === 'error'
              ? 'border-destructive/40 bg-destructive/10 text-destructive'
              : validation.severity === 'warning'
                ? 'border-amber-500/30 bg-amber-500/10 text-amber-600'
                : 'border-border/40 bg-muted/40 text-muted-foreground';
          const iconClass =
            validation.severity === 'error'
              ? 'text-destructive'
              : validation.severity === 'warning'
                ? 'text-amber-500'
                : 'text-muted-foreground';
          return (
            <div
              role="status"
              aria-live="polite"
              data-testid="quote-discount-validation"
              data-kind={validation.kind}
              className={cn('flex items-start gap-2 rounded-lg border px-3 py-2', palette)}
            >
              <AlertTriangle className={cn('mt-0.5 h-4 w-4 shrink-0', iconClass)} />
              <div className="space-y-0.5">
                {validation.title && (
                  <p className="text-xs font-semibold leading-tight">{validation.title}</p>
                )}
                <p className="text-[11px] leading-snug opacity-90">
                  {validation.description}
                </p>
                {validation.callToAction && (
                  <p className="text-[11px] font-medium leading-snug">
                    → {validation.callToAction}
                  </p>
                )}
              </div>
            </div>
          );
        })()}
        {discountAmount > 0 && (
          <div
            className={cn(
              'flex flex-col gap-0.5 rounded-lg px-2.5 py-1.5 text-xs transition-colors',
              isDiscountExceeded
                ? 'border border-amber-500/30 bg-amber-500/10'
                : 'border border-destructive/20 bg-destructive/5',
            )}
            aria-live="polite"
            data-testid="discount-effective"
          >
            <div className="flex justify-between text-destructive">
              <span className="font-medium">Desconto aplicado</span>
              <span
                className="font-semibold tabular-nums"
                data-testid="discount-effective-amount"
              >
                -{formatCurrency(discountAmount)}
              </span>
            </div>
            {presentedSubtotal > 0 && (
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>Equivalente</span>
                <span className="tabular-nums" data-testid="discount-effective-equivalent">
                  {discountType === 'percent'
                    ? `${formatCurrency(discountAmount)} sobre ${formatCurrency(presentedSubtotal)}`
                    : `${((discountAmount / (presentedSubtotal || 1)) * 100).toFixed(2).replace('.', ',')}% sobre ${formatCurrency(presentedSubtotal)}`}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Negotiation Markup + Price Comparison (lado a lado) */}
      {setNegotiationMarkup && (
        <div className="px-4 pt-3">
          <div className="flex flex-wrap items-start gap-3">
            <div className="min-w-[280px] flex-1">
              <NegotiationMarkupCard
                value={negotiationMarkup}
                onChange={setNegotiationMarkup}
                realSubtotal={realSubtotal}
                apparentDiscountPercent={
                  discountType === 'percent'
                    ? discountValue
                    : realSubtotal > 0
                      ? (discountAmount /
                          (realSubtotal * (1 + (negotiationMarkup || 0) / 100))) *
                        100
                      : 0
                }
                realDiscountPercent={realDiscountPercent}
                maxDiscountPercent={maxDiscountPercent ?? null}
                hidePriceComparison
              />
            </div>
            {negotiationMarkup > 0 && (
              <div className="min-w-[280px] flex-1">
                <NegotiationPriceComparison
                  realSubtotal={realSubtotal}
                  apparentDiscountPercent={
                    discountType === 'percent'
                      ? discountValue
                      : realSubtotal > 0
                        ? (discountAmount /
                            (realSubtotal * (1 + (negotiationMarkup || 0) / 100))) *
                          100
                        : 0
                  }
                  realDiscountPercent={realDiscountPercent}
                  presentedSubtotal={realSubtotal * (1 + negotiationMarkup / 100)}
                  isOverLimit={
                    maxDiscountPercent !== null &&
                    maxDiscountPercent !== undefined &&
                    realDiscountPercent > maxDiscountPercent
                  }
                />
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
