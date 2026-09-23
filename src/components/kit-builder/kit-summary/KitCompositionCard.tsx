import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Package, Gift, Palette, Image } from 'lucide-react';
import {
  formatCurrency,
  formatDimensions,
  formatVolume,
  getKitItemLineId,
  calculateTotalKitPrice,
  type KitState,
} from '@/lib/kit-builder';

interface KitCompositionCardProps {
  kitState: KitState;
  kitQuantity: number;
  stockByProduct: Map<string, number>;
  /** Navigates back to the box step, preserving state. */
  onEditBox?: () => void;
}

export function KitCompositionCard({
  kitState,
  kitQuantity,
  stockByProduct,
  onEditBox,
}: KitCompositionCardProps) {
  const navigate = useNavigate();
  const { box, items, personalization } = kitState;
  const personalizedCount =
    (personalization.box.enabled ? 1 : 0) +
    Object.values(personalization.items).filter((p) => p.enabled).length;
  const pricing = calculateTotalKitPrice(box, items, personalization, kitQuantity);
  const personalizationPerKit = kitQuantity > 0 ? pricing.personalizationPrice / kitQuantity : 0;

  const handleOpenMockup = (productId: string, techniqueName?: string) => {
    const params = new URLSearchParams();
    params.set('product_id', productId);
    if (techniqueName) params.set('technique', techniqueName);
    navigate(`/mockup-generator?${params.toString()}`);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Composição do Kit</CardTitle>
      </CardHeader>
      <CardContent>
        {box && (
          <div className="mb-3 space-y-2 rounded-lg bg-secondary/50 p-3">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-md bg-background">
                {box.imageUrl ? (
                  <img
                    src={box.imageUrl}
                    alt={box.name}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <Package className="h-6 w-6 text-muted-foreground" />
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium">{box.name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatDimensions(box.internalWidth, box.internalHeight, box.internalDepth)} •{' '}
                  {formatVolume(box.internalVolume)}
                </p>
              </div>
              <div className="flex-shrink-0 text-right">
                <p className="font-semibold">{formatCurrency(box.price)}</p>
                <p className="text-xs text-muted-foreground">por kit</p>
              </div>
              {onEditBox && (
                <Button variant="outline" size="sm" className="flex-shrink-0" onClick={onEditBox}>
                  Alterar caixa
                </Button>
              )}
            </div>
            <div className="space-y-1">
              <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-[width]"
                  style={{ width: `${Math.min(100, Math.max(0, kitState.volumeUsagePercent))}%` }}
                />
              </div>
              <div className="flex flex-wrap justify-between gap-x-3 text-[11px] text-muted-foreground">
                <span>Espaço ocupado: {Math.round(kitState.volumeUsagePercent)}%</span>
                <span>
                  Espaço livre: {Math.round(Math.max(0, 100 - kitState.volumeUsagePercent))}%
                </span>
                <span>Volume total: {Math.round(box.internalVolume)} cm³</span>
              </div>
            </div>
          </div>
        )}
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-xs text-muted-foreground">
              <th className="py-2 font-medium">Produto</th>
              <th className="py-2 text-center font-medium">Qtd. por kit</th>
              <th className="py-2 text-right font-medium">Preço unitário</th>
              <th className="py-2 text-right font-medium">Total no kit</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const itemP =
                personalization.items[getKitItemLineId(item)] ?? personalization.items[item.id];
              return (
                <tr
                  key={getKitItemLineId(item)}
                  className="border-b border-border/40 hover:bg-secondary/30"
                >
                  <td className="py-2">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-md bg-secondary">
                        {item.imageUrl ? (
                          <img
                            src={item.imageUrl}
                            alt={item.name}
                            className="h-full w-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            <Gift className="h-5 w-5 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="truncate">{item.name}</span>
                          {itemP?.enabled && (
                            <Badge variant="outline" className="flex-shrink-0 text-xs">
                              <Palette className="mr-1 h-3 w-3" />
                              {itemP.techniqueName}
                            </Badge>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-1">
                          <p className="text-xs text-muted-foreground">
                            <span className="font-mono">{item.sku}</span>
                            {item.weight
                              ? ` • ${item.weight >= 1000 ? `${(item.weight / 1000).toFixed(1)}kg` : `${item.weight}g`}`
                              : ''}
                            {item.material ? ` • ${item.material}` : ''}
                            {item.isOptional && (
                              <Badge variant="secondary" className="ml-1 px-1 py-0 text-[10px]">
                                Opcional
                              </Badge>
                            )}
                          </p>
                          {(() => {
                            const stockQty = stockByProduct.get(item.id);
                            if (stockQty === undefined) return null;
                            const enough = stockQty >= item.quantity * kitQuantity;
                            return (
                              <Badge
                                variant={enough ? 'secondary' : 'destructive'}
                                className="px-1.5 py-0 text-[10px]"
                              >
                                {enough ? `${stockQty} em estoque` : `⚠ ${stockQty} disponível`}
                              </Badge>
                            );
                          })()}
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  aria-label="Imagem"
                                  className="h-6 w-6 text-muted-foreground hover:text-primary"
                                  onClick={() =>
                                    handleOpenMockup(
                                      item.id,
                                      itemP?.enabled ? itemP.techniqueName : undefined,
                                    )
                                  }
                                >
                                  <Image className="h-3.5 w-3.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Gerar Mockup</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="py-2 text-center">{item.quantity}x</td>
                  <td className="py-2 text-right">{formatCurrency(item.price)}</td>
                  <td className="py-2 text-right font-medium">
                    {formatCurrency(item.price * item.quantity)}
                  </td>
                </tr>
              );
            })}
            {personalizedCount > 0 && (
              <tr className="border-b border-border/40 text-primary">
                <td className="py-2">
                  Personalização ({personalizedCount} {personalizedCount === 1 ? 'item' : 'itens'})
                </td>
                <td className="py-2 text-center">{personalizedCount}x</td>
                <td className="py-2 text-right">—</td>
                <td className="py-2 text-right font-medium">
                  {formatCurrency(personalizationPerKit)}
                </td>
              </tr>
            )}
            {box && (
              <tr>
                <td className="py-2">Caixa — {box.name}</td>
                <td className="py-2 text-center">1x</td>
                <td className="py-2 text-right">{formatCurrency(box.price)}</td>
                <td className="py-2 text-right font-medium">{formatCurrency(box.price)}</td>
              </tr>
            )}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
