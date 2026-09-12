/**
 * Kit Summary — Refactored orchestrator
 * Sub-components extracted to ./kit-summary/
 */
import { Card, CardContent } from '@/components/ui/card';
import { AlertTriangle } from 'lucide-react';
import { KitMarginSimulator } from './KitMarginSimulator';
import { KitVisualPreview } from './KitVisualPreview';
import { DiscontinuedItemsAlert } from './DiscontinuedItemsAlert';
import { FreightEstimator } from './FreightEstimator';
import { useKitStockValidation } from '@/hooks/kit-builder';
import { calculateTotalKitPrice, type KitState } from '@/lib/kit-builder';
import { KitIdentificationCard } from './kit-summary/KitIdentificationCard';
import { KitStatsCards } from './kit-summary/KitStatsCards';
import { KitCompositionCard } from './kit-summary/KitCompositionCard';
import { KitPricingCard } from './kit-summary/KitPricingCard';
import { KitActionsBar } from './kit-summary/KitActionsBar';
import { KitConflictAlerts } from './KitConflictAlerts';
import { KitPresentablePreview } from './KitPresentablePreview';
import { KitPersonalizationPreview } from './KitPersonalizationPreview';
import { KitStockForecastCard } from './KitStockForecastCard';
import { ClientPicker, type ClientData } from '@/components/quotes/ClientPicker';

interface KitSummaryProps {
  kitState: KitState;
  kitQuantity: number;
  kitName: string;
  onKitNameChange: (name: string) => void;
  onKitQuantityChange: (quantity: number) => void;
  onAddToQuote?: () => void;
  onExportPDF?: () => void;
  isAddingToQuote?: boolean;
  currentKitId?: string;
  quoteClient?: Partial<ClientData>;
  onQuoteClientChange?: (next: Partial<ClientData>) => void;
}

export function KitSummary({
  kitState,
  kitQuantity,
  kitName,
  onKitNameChange,
  onKitQuantityChange,
  onAddToQuote,
  onExportPDF,
  isAddingToQuote,
  currentKitId,
  quoteClient = {},
  onQuoteClientChange,
}: KitSummaryProps) {
  const { box, items, personalization } = kitState;
  const pricing = calculateTotalKitPrice(box, items, personalization, kitQuantity);
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const personalizedCount =
    (personalization.box.enabled ? 1 : 0) +
    Object.values(personalization.items).filter((p) => p.enabled).length;
  const {
    alerts: stockAlerts,
    stockByProduct,
    hasStockIssues,
    stockStatus,
  } = useKitStockValidation(items, box, kitQuantity);

  return (
    <div className="space-y-6">
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.65fr)_minmax(22rem,1fr)]">
        <section className="space-y-5" aria-label="Identificação e composição do kit">
          <KitIdentificationCard
            kitName={kitName}
            kitQuantity={kitQuantity}
            onKitNameChange={onKitNameChange}
            onKitQuantityChange={onKitQuantityChange}
          />
          {onQuoteClientChange && (
            <ClientPicker value={quoteClient} onChange={onQuoteClientChange} />
          )}
          <KitCompositionCard
            kitState={kitState}
            kitQuantity={kitQuantity}
            stockByProduct={stockByProduct}
          />
          <KitConflictAlerts kitState={kitState} />
          <DiscontinuedItemsAlert items={items} />

          {stockStatus === 'checking' && (
            <Card className="border-warning bg-warning/5">
              <CardContent className="pt-6">
                <h4 className="mb-1 flex items-center gap-2 font-medium text-warning">
                  <AlertTriangle className="h-4 w-4" /> Verificando estoque
                </h4>
                <p className="text-sm text-muted-foreground">
                  Aguarde a confirmação de disponibilidade antes de criar o orçamento.
                </p>
              </CardContent>
            </Card>
          )}

          {stockStatus === 'unknown' && (
            <Card className="border-destructive bg-destructive/5">
              <CardContent className="pt-6">
                <h4 className="mb-1 flex items-center gap-2 font-medium text-destructive">
                  <AlertTriangle className="h-4 w-4" /> Não foi possível validar o estoque
                </h4>
                <p className="text-sm text-muted-foreground">
                  Tente novamente quando a consulta estiver disponível. O orçamento permanece
                  bloqueado para evitar uma promessa comercial sem confirmação.
                </p>
              </CardContent>
            </Card>
          )}

          {stockAlerts.length > 0 && (
            <Card className="border-warning bg-warning/5">
              <CardContent className="pt-6">
                <h4 className="mb-3 flex items-center gap-2 font-medium text-warning">
                  <AlertTriangle className="h-4 w-4" /> Alerta de estoque ({stockAlerts.length})
                </h4>
                <ul className="space-y-2">
                  {stockAlerts.map((alert) => (
                    <li
                      key={alert.lineId ?? alert.itemId}
                      className="flex items-center justify-between rounded-lg bg-background/50 p-2 text-sm"
                    >
                      <div>
                        <p className="font-medium">
                          {alert.isBox ? '📦 ' : ''}
                          {alert.itemName}
                        </p>
                        <p className="font-mono text-xs text-muted-foreground">{alert.sku}</p>
                      </div>
                      <p className="text-right text-xs text-destructive">
                        {alert.available} / {alert.required} · faltam {alert.deficit}
                      </p>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          <KitStockForecastCard items={items} kitQuantity={kitQuantity} />
          {!kitState.isValid && (
            <Card className="border-destructive bg-destructive/5">
              <CardContent className="pt-6">
                <h4 className="mb-2 font-medium text-destructive">Pendências</h4>
                <ul className="space-y-1">
                  {kitState.validationErrors.map((error) => (
                    <li key={error} className="flex items-center gap-2 text-sm text-destructive">
                      <span className="h-1 w-1 rounded-full bg-destructive" /> {error}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </section>

        <aside className="space-y-5 xl:sticky xl:top-24" aria-label="Prévia e preços do kit">
          <KitStatsCards
            kitState={kitState}
            totalItems={totalItems}
            itemsCount={items.length}
            personalizedCount={personalizedCount}
          />
          <KitVisualPreview kitState={kitState} />
          <KitPresentablePreview
            kitState={kitState}
            kitQuantity={kitQuantity}
            kitName={kitName}
            currentKitId={currentKitId}
          />
          <KitPersonalizationPreview kitState={kitState} />
          <KitPricingCard
            kitState={kitState}
            kitQuantity={kitQuantity}
            onKitQuantityChange={onKitQuantityChange}
          />
          <KitMarginSimulator
            unitPrice={pricing.unitPrice}
            totalPrice={pricing.total}
            kitQuantity={kitQuantity}
          />
          <FreightEstimator totalWeightGrams={kitState.totalWeight} kitQuantity={kitQuantity} />
        </aside>
      </div>

      <KitActionsBar
        isValid={kitState.isValid}
        isAddingToQuote={isAddingToQuote}
        hasStockIssues={hasStockIssues}
        stockStatus={stockStatus}
        kitName={kitName}
        kitTag={kitState.identity?.tag}
        kitQuantity={kitQuantity}
        unitPrice={pricing.unitPrice}
        total={pricing.total}
        items={items}
        onAddToQuote={onAddToQuote}
        onExportPDF={onExportPDF}
      />
    </div>
  );
}
