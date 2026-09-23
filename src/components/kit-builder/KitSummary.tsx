/**
 * Kit Summary — Refactored orchestrator
 * Sub-components extracted to ./kit-summary/
 */
import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { AlertTriangle } from 'lucide-react';
import { KitMarginSimulator } from './KitMarginSimulator';
import { KitVisualPreview } from './KitVisualPreview';
import { DiscontinuedItemsAlert } from './DiscontinuedItemsAlert';
import { FreightEstimator } from './FreightEstimator';
import { useKitStockValidation, type KitStockStatus } from '@/hooks/kit-builder';
import { calculateTotalKitPrice, type KitIdentity, type KitState } from '@/lib/kit-builder';
import { KitIdentificationCard } from './kit-summary/KitIdentificationCard';
import { KitStatsCards } from './kit-summary/KitStatsCards';
import { KitCompositionCard } from './kit-summary/KitCompositionCard';
import { KitPricingCard } from './kit-summary/KitPricingCard';
import { KitActionsBar } from './kit-summary/KitActionsBar';
import { KitValidationChecklist } from './kit-summary/KitValidationChecklist';
import { KitConflictAlerts } from './KitConflictAlerts';
import { KitPresentablePreview } from './KitPresentablePreview';
import { KitPersonalizationPreview } from './KitPersonalizationPreview';
import { KitStockForecastCard } from './KitStockForecastCard';
import { ClientPicker, type ClientData } from '@/components/quotes/ClientPicker';

const NOTES_MAX_LENGTH = 500;

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
  identity?: KitIdentity;
  onIdentityChange?: (identity: KitIdentity) => void;
  notes?: string;
  onNotesChange?: (notes: string) => void;
  /** Navigates back to the box step, preserving state. */
  onEditBox?: () => void;
  onSaveDraft?: () => void;
  isSavingDraft?: boolean;
}

export function shouldRenderKitStockForecast(status: KitStockStatus): boolean {
  return status === 'available' || status === 'unavailable';
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
  identity,
  onIdentityChange,
  notes = '',
  onNotesChange,
  onEditBox,
  onSaveDraft,
  isSavingDraft,
}: KitSummaryProps) {
  const { box, items, personalization } = kitState;
  const pricing = calculateTotalKitPrice(box, items, personalization, kitQuantity);
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  // `totalWeight` soma apenas os pesos conhecidos (nunca assume 0 para um
  // item sem peso cadastrado); esta contagem existe para o FreightEstimator
  // avisar quando o total exibido é parcial, não a composição completa.
  const itemsWithUnknownWeight = useMemo(() => {
    const missingItems = items.filter((item) => item.weight === undefined).length;
    const missingBox = box && box.weight === undefined ? 1 : 0;
    return missingItems + missingBox;
  }, [items, box]);
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
        <section className="space-y-5 print:hidden" aria-label="Identificação e composição do kit">
          <KitIdentificationCard
            kitName={kitName}
            kitQuantity={kitQuantity}
            onKitNameChange={onKitNameChange}
            onKitQuantityChange={onKitQuantityChange}
            identity={identity}
            onIdentityChange={onIdentityChange}
          />
          {onQuoteClientChange && (
            <ClientPicker value={quoteClient} onChange={onQuoteClientChange} />
          )}
          <KitCompositionCard
            kitState={kitState}
            kitQuantity={kitQuantity}
            stockByProduct={stockByProduct}
            onEditBox={onEditBox}
          />
          {onNotesChange && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Observações</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                <Textarea
                  value={notes}
                  maxLength={NOTES_MAX_LENGTH}
                  placeholder="Informações adicionais para o time de orçamento..."
                  onChange={(e) => onNotesChange(e.target.value.slice(0, NOTES_MAX_LENGTH))}
                />
                <p className="text-right text-xs text-muted-foreground">
                  {notes.length}/{NOTES_MAX_LENGTH}
                </p>
              </CardContent>
            </Card>
          )}
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
                      key={alert.stockKey ?? `${alert.lineId ?? alert.itemId}:${alert.sku}`}
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

          {shouldRenderKitStockForecast(stockStatus) && (
            <KitStockForecastCard items={items} kitQuantity={kitQuantity} />
          )}
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
          <KitValidationChecklist kitState={kitState} stockStatus={stockStatus} />
          <KitVisualPreview kitState={kitState} />
          <KitPresentablePreview
            kitState={kitState}
            kitQuantity={kitQuantity}
            kitName={kitName}
            currentKitId={currentKitId}
            quoteClient={quoteClient}
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
          <FreightEstimator
            totalWeightGrams={kitState.totalWeight}
            kitQuantity={kitQuantity}
            itemsWithUnknownWeight={itemsWithUnknownWeight}
          />
        </aside>
      </div>

      {/* `<aside>` acima é ocultado inteiro pela regra genérica de impressão
          (header, nav, aside, .fixed { display: none }), então a impressão
          precisa de uma cópia própria fora dele — invisível na tela
          (`hidden`), visível só no PDF (`print:block`). */}
      <div className="hidden print:block">
        {/* O aviso bloqueante fica dentro da seção print:hidden — sem esta
            cópia, o PDF do cliente mostra preço normal sem indicar que o kit
            não pode ser orçado (estoque não confirmado ou pendência aberta). */}
        {(stockStatus === 'checking' ||
          stockStatus === 'unknown' ||
          stockAlerts.length > 0 ||
          !kitState.isValid) && (
          <div className="mb-4 rounded-lg border border-destructive bg-destructive/5 p-4 text-destructive print:break-inside-avoid">
            <h4 className="mb-2 flex items-center gap-2 font-semibold">
              <AlertTriangle className="h-4 w-4" /> Atenção — orçamento não confirmado
            </h4>
            <ul className="space-y-1 text-sm">
              {stockStatus === 'checking' && (
                <li>Estoque ainda em verificação — disponibilidade não confirmada.</li>
              )}
              {stockStatus === 'unknown' && (
                <li>Não foi possível validar o estoque para este kit.</li>
              )}
              {stockAlerts.map((alert) => (
                <li key={alert.stockKey ?? `${alert.lineId ?? alert.itemId}:${alert.sku}`}>
                  {alert.itemName}: disponível {alert.available} de {alert.required} (faltam{' '}
                  {alert.deficit})
                </li>
              ))}
              {kitState.validationErrors.map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          </div>
        )}
        <KitPresentablePreview
          kitState={kitState}
          kitQuantity={kitQuantity}
          kitName={kitName}
          currentKitId={currentKitId}
          quoteClient={quoteClient}
        />
      </div>

      <div className="print:hidden">
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
          onSaveDraft={onSaveDraft}
          isSavingDraft={isSavingDraft}
        />
      </div>
    </div>
  );
}
