/**
 * Kit Presentable Preview — client-facing proposal view
 * Renders the kit as a visual presentation card with narrative, items grid,
 * and pricing summary.
 */
import { useMemo } from 'react';
import { Sparkles, Calendar, Package } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { formatCurrency, getKitItemLineId, type KitState } from '@/lib/kit-builder';
import type { ClientData } from '@/components/quotes/ClientPicker';

interface KitPresentablePreviewProps {
  kitState: KitState;
  kitQuantity: number;
  kitName: string;
  currentKitId?: string;
  /** Frozen customer data — without it, two proposals for different clients are indistinguishable once printed. */
  quoteClient?: Partial<ClientData>;
  /**
   * The print-only copy of this component is `display: none` on screen, so
   * lazily-loaded images never enter the viewport and `window.print()` can
   * fire before they load — set true on that copy to load eagerly instead.
   */
  eagerImages?: boolean;
}

function buildNarrative(kitState: KitState, kitName: string): string {
  const itemCount = kitState.items.length;
  const totalUnits = kitState.items.reduce((s, i) => s + i.quantity, 0);
  const personalized =
    Object.values(kitState.personalization.items).filter((p) => p.enabled).length +
    (kitState.personalization.box.enabled ? 1 : 0);
  const label = kitName?.trim() || 'Este kit';
  const personalizationLine =
    personalized > 0
      ? ` Conta com ${personalized} ponto(s) de personalização para reforçar a identidade da sua marca.`
      : '';
  const boxLine = kitState.box ? ` Apresentado em ${kitState.box.name.toLowerCase()},` : '';
  return `${label} foi pensado para gerar conexão e gratidão.${boxLine} reúne ${itemCount} produto(s) selecionado(s) (${totalUnits} unidade(s) no total) que combinam utilidade, design e qualidade.${personalizationLine}`;
}

export function KitPresentablePreview({
  kitState,
  kitQuantity,
  kitName,
  quoteClient,
  eagerImages,
}: KitPresentablePreviewProps) {
  const narrative = useMemo(() => buildNarrative(kitState, kitName), [kitState, kitName]);
  // `totalPrice` already represents the complete lot. Multiplying by
  // `kitQuantity` again made client-facing previews overstate the total.
  const grandTotal = kitState.totalPrice;
  const perKitPrice = kitQuantity > 0 ? grandTotal / kitQuantity : grandTotal;
  const validityDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toLocaleDateString('pt-BR');
  }, []);

  if (!kitState.box && kitState.items.length === 0) return null;

  const clientLabel = [quoteClient?.client_name, quoteClient?.client_company]
    .filter(Boolean)
    .join(' — ');

  return (
    <Card className="overflow-hidden border-[1.5px] border-primary/20">
      <div className="border-b bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-6">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-xs font-medium uppercase tracking-wider text-primary">
              Apresentação para o cliente
            </span>
          </div>
          <Badge variant="outline" className="gap-1 text-[10px]">
            <Calendar className="h-3 w-3" /> Válido até {validityDate}
          </Badge>
        </div>
        <h3 className="font-display text-2xl font-bold leading-tight">
          {kitName?.trim() || 'Kit Personalizado'}
        </h3>
        {clientLabel && (
          <p className="mt-1 text-sm font-medium text-primary">Proposta para {clientLabel}</p>
        )}
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{narrative}</p>
      </div>

      <CardContent className="space-y-5 p-6">
        {/* Items grid */}
        <div>
          <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <Package className="h-4 w-4 text-muted-foreground" />
            Composição
          </h4>
          {/* Densidade maior só na impressão: reduz quantas páginas um kit
              com muitas linhas ocupa, mas não é uma garantia matemática de
              1–2 páginas — um kit com dezenas de linhas ainda pode passar
              disso; um cap real exigiria paginação, fora do escopo aqui. */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 print:grid-cols-6 print:gap-1.5">
            {kitState.box && (
              <div className="space-y-2 rounded-lg border bg-card p-2 print:p-1">
                <div className="flex aspect-square items-center justify-center overflow-hidden rounded-md bg-muted/40">
                  {kitState.box.imageUrl ? (
                    <img
                      src={kitState.box.imageUrl}
                      alt={kitState.box.name}
                      className="h-full w-full object-contain"
                      loading={eagerImages ? 'eager' : 'lazy'}
                    />
                  ) : (
                    <Package className="h-6 w-6 text-muted-foreground" />
                  )}
                </div>
                <div>
                  <Badge variant="secondary" className="mb-1 text-[9px]">
                    Embalagem
                  </Badge>
                  <p className="line-clamp-2 text-xs font-medium leading-tight">
                    {kitState.box.name}
                  </p>
                  {kitState.personalization.box.enabled &&
                    kitState.personalization.box.techniqueName && (
                      <p className="truncate text-[9px] text-primary">
                        {kitState.personalization.box.techniqueName}
                      </p>
                    )}
                </div>
              </div>
            )}
            {kitState.items.map((item) => {
              const lineId = getKitItemLineId(item);
              const itemPersonalization =
                kitState.personalization.items[lineId] ?? kitState.personalization.items[item.id];
              // Lines that share a product but differ by variant/technique render
              // identical image+name otherwise — the customer can't tell which
              // configuration the quoted total covers without these identifiers.
              const variantLabel = [item.selectedColor?.name, item.selectedSize]
                .filter(Boolean)
                .join(' / ');
              return (
                <div
                  key={lineId}
                  className="space-y-2 rounded-lg border bg-card p-2 print:break-inside-avoid print:p-1"
                >
                  <div className="flex aspect-square items-center justify-center overflow-hidden rounded-md bg-muted/40">
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="h-full w-full object-contain"
                        loading={eagerImages ? 'eager' : 'lazy'}
                      />
                    ) : (
                      <Package className="h-6 w-6 text-muted-foreground" />
                    )}
                  </div>
                  <div>
                    {item.quantity > 1 && (
                      <Badge variant="outline" className="mb-1 text-[9px]">
                        {item.quantity}x
                      </Badge>
                    )}
                    <p className="line-clamp-2 text-xs font-medium leading-tight">{item.name}</p>
                    <p className="mt-0.5 truncate text-[9px] text-muted-foreground">
                      {[item.sku, variantLabel || null].filter(Boolean).join(' • ')}
                    </p>
                    {itemPersonalization?.enabled && itemPersonalization.techniqueName && (
                      <p className="truncate text-[9px] text-primary">
                        {itemPersonalization.techniqueName}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <Separator />

        {/* Pricing block. A forced page break here guaranteed a 3rd page once
            a long composition alone already filled 2 pages, breaking the
            documented 1–2 page contract — `break-inside-avoid` keeps the
            block from splitting mid-content without forcing an extra page. */}
        <div className="grid grid-cols-3 gap-3 text-center print:break-inside-avoid">
          <div className="rounded-lg bg-muted/30 p-3">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Quantidade</p>
            <p className="font-display text-lg font-bold">
              {kitQuantity}
              <span className="text-xs font-normal text-muted-foreground"> kits</span>
            </p>
          </div>
          <div className="rounded-lg bg-muted/30 p-3">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Por kit</p>
            <p className="font-display text-lg font-bold">{formatCurrency(perKitPrice)}</p>
          </div>
          <div className="rounded-lg border border-primary/20 bg-primary/10 p-3">
            <p className="text-[10px] uppercase tracking-wider text-primary">Investimento</p>
            <p className="font-display text-lg font-bold text-primary">
              {formatCurrency(grandTotal)}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
