/**
 * Harness público para regressão visual do bloco Frete do QuoteBuilderPage.
 *
 * Rota: `/__visual/quote-freight-block` (somente em DEV).
 * Sem auth — acessível pelo projeto chromium-public do Playwright.
 *
 * Replica fielmente a estrutura JSX de QuoteBuilderPage.tsx (bloco Frete):
 * testids, classes, opções e lógica condicional de exibição de col-2.
 */
import { useState } from 'react';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CurrencyInput } from '@/components/ui/currency-input';
import { cn } from '@/lib/utils';

type ShippingType = 'cif' | 'fob_pre' | 'fob';

export default function QuoteFreightBlockHarness() {
  const [shippingType, setShippingType] = useState<ShippingType>('cif');
  const [shippingCost, setShippingCost] = useState<number>(0);

  return (
    <div
      data-testid="quote-freight-block-harness"
      className="flex min-h-screen items-start justify-center bg-background p-8"
    >
      <div className="w-full max-w-lg rounded-lg border border-border bg-card p-6 shadow-sm">
        <div className="mt-1 border-t border-border/30 pt-3">
          <div
            className="grid grid-cols-1 items-end gap-3 md:grid-cols-3"
            data-testid="freight-grid"
          >
            <div className="space-y-1" data-testid="freight-grid-col-1">
              <Label htmlFor="freight-select" className="text-xs text-muted-foreground">
                Frete
              </Label>
              <Select
                data-testid="shipping-type-select-root"
                value={shippingType}
                onValueChange={(v) => setShippingType(v as ShippingType)}
              >
                <SelectTrigger
                  id="freight-select"
                  data-testid="shipping-type-select"
                  aria-label="Modalidade de frete"
                  className={cn(
                    'h-8 text-xs [&>span]:flex-1 [&>span]:text-left [&>span]:leading-none',
                  )}
                >
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cif">CIF | Frete grátis</SelectItem>
                  <SelectItem value="fob">FOB | Repassado ao cliente</SelectItem>
                  <SelectItem value="fob_pre">FOB | Valor pré negociado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {shippingType === 'fob_pre' && (
              <div className="space-y-1" data-testid="freight-grid-col-2">
                <Label htmlFor="freight-value" className="text-xs text-muted-foreground">
                  Valor R$
                </Label>
                <CurrencyInput
                  id="freight-value"
                  data-testid="shipping-cost-input"
                  aria-label="Valor do frete em reais"
                  value={shippingCost}
                  onChange={(n) => setShippingCost(Math.max(0, n))}
                  className="h-8 text-xs"
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
