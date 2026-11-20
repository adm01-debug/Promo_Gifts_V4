/**
 * Card "Prazo de produção" do orçamento: em quantos dias úteis o pedido fica
 * pronto para envio, qual item define esse prazo e de onde vem cada número.
 *
 * Calcula sozinho (`useProductionLeadTime`) e preenche `estimated_delivery_days`
 * pelo `onEstimatedDeliveryDaysChange`. O valor segue o cálculo enquanto o
 * vendedor não o altera; digitando outro número, aparece "ajustado manualmente"
 * (valor diferente do calculado) e o botão "Usar o calculado" desfaz.
 *
 * PONTO ÚNICO DE MONTAGEM (ainda não montado em `QuoteBuilderPage.tsx`):
 *   <ProductionLeadTimeCard
 *     items={quoteItems.map(...)}            // productId, quantity, personalizations
 *     approvedOn={null}                      // dia da aprovação AAAA-MM-DD, ou null (= hoje)
 *     productNames={Map<productId, nome>}
 *     deliveryMode={deliveryMode}            // 'data' | 'prazo' do orçamento
 *     requestedDate={dataPedidaAAAAMMDD}     // só vale com deliveryMode === 'data'
 *     estimatedDeliveryDays={estimatedDeliveryDays}
 *     onEstimatedDeliveryDaysChange={setEstimatedDeliveryDays}
 *   />
 */
import { useEffect, useRef, type ChangeEvent } from 'react';
import { AlertTriangle, Clock, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useProductionLeadTime, type LeadTimeQuoteItemInput } from '@/hooks/freight';
import type {
  IsoDate,
  ItemLeadTime,
  PersonalizationSource,
  SupplierLeadTimeSource,
} from '@/lib/lead-time';
import { formatIsoDate, formatIsoDayMonth } from '@/lib/lead-time/formatDate';
import { cn } from '@/lib/utils';

interface ProductionLeadTimeCardProps {
  items: readonly LeadTimeQuoteItemInput[];
  /** Dia da aprovação (AAAA-MM-DD); null = o prazo começa hoje. */
  approvedOn: IsoDate | null;
  /** Nome por id de produto. */
  productNames: ReadonlyMap<string, string>;
  /** Modo de entrega do orçamento. */
  deliveryMode: 'data' | 'prazo';
  /** Data de entrega pedida (AAAA-MM-DD); só vale com `deliveryMode === 'data'`. */
  requestedDate: IsoDate | null;
  /** `quotes.estimated_delivery_days`. */
  estimatedDeliveryDays: number | null;
  onEstimatedDeliveryDaysChange: (days: number | null) => void;
  className?: string;
}

const SUPPLIER_SOURCE: Record<SupplierLeadTimeSource, string> = {
  supplier_default: 'padrão do fornecedor',
  product_exception: 'exceção do produto',
};

const PERSONALIZATION_SOURCE: Record<PersonalizationSource, string> = {
  registered: 'prazo cadastrado na técnica',
  price_table: 'tabela de preço',
};

function daysLabel(days: number): string {
  return `${days} ${days === 1 ? 'dia útil' : 'dias úteis'}`;
}

function personalizationOrigin(entry: ItemLeadTime): string {
  return entry.personalizationSource === null
    ? 'sem personalização'
    : PERSONALIZATION_SOURCE[entry.personalizationSource];
}

function breakdown(entry: ItemLeadTime): string {
  const parts = [`fornecedor ${entry.supplierDays}`, `personalização ${entry.personalizationDays}`];
  if (entry.bufferDays > 0) parts.push(`folga ${entry.bufferDays}`);
  return parts.join(' + ');
}

export function ProductionLeadTimeCard({
  items,
  approvedOn,
  productNames,
  deliveryMode,
  requestedDate,
  estimatedDeliveryDays,
  onEstimatedDeliveryDaysChange,
  className,
}: ProductionLeadTimeCardProps) {
  const { leadTime, unlinkedItems, isLoading, isError, refetch } = useProductionLeadTime({
    items,
    approvedOn,
  });
  const totalDays = leadTime?.status === 'ok' ? leadTime.totalDays : null;
  const readyDate = leadTime?.status === 'ok' ? leadTime.readyDate : null;

  // Último valor que o próprio card gravou: enquanto o campo for igual a ele, segue o cálculo.
  const autoFilled = useRef<number | null>(null);
  useEffect(() => {
    if (totalDays === null) return;
    // Campo vazio só é preenchido na primeira vez: se o vendedor apagou, é para digitar outro valor.
    const followsCalculation =
      (estimatedDeliveryDays === null && autoFilled.current === null) ||
      estimatedDeliveryDays === autoFilled.current;
    if (followsCalculation && estimatedDeliveryDays !== totalDays) {
      autoFilled.current = totalDays;
      onEstimatedDeliveryDaysChange(totalDays);
    } else if (estimatedDeliveryDays === totalDays) {
      autoFilled.current = totalDays;
    }
  }, [totalDays, estimatedDeliveryDays, onEstimatedDeliveryDaysChange]);

  const adjustedManually =
    totalDays !== null && estimatedDeliveryDays !== null && estimatedDeliveryDays !== totalDays;
  const lateForRequestedDate =
    deliveryMode === 'data' &&
    requestedDate !== null &&
    readyDate !== null &&
    requestedDate < readyDate;

  const handleDaysChange = (event: ChangeEvent<HTMLInputElement>) => {
    const text = event.target.value.trim();
    if (text === '') {
      onEstimatedDeliveryDaysChange(null);
      return;
    }
    const value = Number(text);
    if (Number.isInteger(value) && value >= 0) onEstimatedDeliveryDaysChange(value);
  };

  const critical = leadTime?.perItem.filter((entry) => entry.isCritical) ?? [];
  const criticalNames = critical
    .map((entry) => productNames.get(entry.productId) ?? 'Produto')
    .join(' e ');

  return (
    <section
      aria-labelledby="prazo-producao-titulo"
      data-testid="production-lead-time-card"
      className={cn('space-y-3 rounded-lg border p-4', className)}
    >
      <h3 id="prazo-producao-titulo" className="flex items-center gap-2 text-base font-semibold">
        <Clock className="h-4 w-4 text-primary" aria-hidden="true" />
        Prazo de produção
      </h3>

      {isLoading ? (
        <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          Calculando o prazo de produção...
        </p>
      ) : isError ? (
        <div role="alert" className="flex flex-wrap items-center gap-3 text-sm">
          <span className="text-destructive">
            Não foi possível calcular o prazo de produção. Tente novamente.
          </span>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              void refetch();
            }}
          >
            Tentar novamente
          </Button>
        </div>
      ) : leadTime === null ? (
        <p className="text-sm text-muted-foreground">
          Adicione produtos ao orçamento para calcular o prazo de produção.
        </p>
      ) : leadTime.status === 'dados_insuficientes' ? (
        <div role="alert" className="space-y-1 text-sm">
          <p className="font-medium text-warning-foreground">
            Não dá para calcular o prazo ainda. Falta cadastrar:
          </p>
          <ul className="list-disc space-y-0.5 pl-5 text-muted-foreground">
            {leadTime.missing.map((issue) => (
              <li key={`${issue.code}-${issue.productId ?? 'pedido'}-${issue.message}`}>
                {issue.productId === null
                  ? issue.message
                  : `${productNames.get(issue.productId) ?? 'Produto'}: ${issue.message}`}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <>
          <p className="text-sm" data-testid="production-lead-time-summary">
            <strong>
              Pronto para envio em {daysLabel(leadTime.totalDays ?? 0)} (
              {formatIsoDayMonth(leadTime.readyDate ?? '')})
            </strong>
            {critical[0] && (
              <>
                {' '}
                — definido por {criticalNames} ({breakdown(critical[0])})
              </>
            )}
          </p>

          {lateForRequestedDate && requestedDate && readyDate && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-md border border-warning/40 bg-warning/10 p-3 text-sm"
            >
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span>
                A data pedida ({formatIsoDate(requestedDate)}) é anterior ao dia em que o pedido
                fica pronto para envio ({formatIsoDate(readyDate)}). Combine outra data com o
                cliente ou antecipe a produção.
              </span>
            </div>
          )}

          <ul className="divide-y rounded-md border text-sm" aria-label="Prazo por item">
            {leadTime.perItem.map((entry, index) => (
              <li
                key={`${entry.productId}-${index}`}
                className="flex flex-col gap-0.5 p-3 sm:flex-row sm:items-baseline sm:justify-between"
              >
                <span className="font-medium">
                  {productNames.get(entry.productId) ?? 'Produto'}
                  {entry.isCritical && (
                    <span className="ml-2 rounded bg-primary/10 px-1.5 py-0.5 text-xs font-normal text-primary">
                      define o prazo
                    </span>
                  )}
                </span>
                <span className="text-muted-foreground">
                  {daysLabel(entry.total)}: fornecedor {entry.supplierDays} (
                  {SUPPLIER_SOURCE[entry.supplierSource]}) + personalização{' '}
                  {entry.personalizationDays} ({personalizationOrigin(entry)})
                  {entry.bufferDays > 0 ? ` + folga ${entry.bufferDays}` : ''}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}

      {unlinkedItems > 0 && (
        <p role="status" className="text-sm text-muted-foreground">
          {unlinkedItems === 1
            ? '1 item sem produto do catálogo ficou fora do cálculo.'
            : `${unlinkedItems} itens sem produto do catálogo ficaram fora do cálculo.`}
        </p>
      )}

      <div className="space-y-1">
        <Label htmlFor="estimated-delivery-days" className="text-xs">
          Prazo de entrega estimado (dias úteis)
        </Label>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            id="estimated-delivery-days"
            type="number"
            inputMode="numeric"
            min={0}
            value={estimatedDeliveryDays ?? ''}
            onChange={handleDaysChange}
            className="h-9 w-28"
          />
          {/* Também aparece com o campo vazio (apagado), não só quando o valor difere do
              calculado: senão o vendedor precisaria redigitar o número de cabeça. */}
          {(adjustedManually || (estimatedDeliveryDays === null && totalDays !== null)) && (
            <>
              {adjustedManually && (
                <span className="text-xs text-muted-foreground">ajustado manualmente</span>
              )}
              <Button
                type="button"
                size="sm"
                variant="link"
                className="h-auto p-0 text-xs"
                onClick={() => onEstimatedDeliveryDaysChange(totalDays)}
              >
                Usar o calculado ({totalDays})
              </Button>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
