import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  DndContext,
  closestCenter,
  DragOverlay,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import type { useSensors } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import {
  ChevronDown,
  ChevronUp,
  Edit,
  GripVertical,
  Package,
  Trash2,
  CheckCircle2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { QuoteItem } from '@/hooks/quotes';
import { ProductThumb } from '@/components/quotes/ProductThumb';
import { PriceFreshnessBadge } from '@/components/products/PriceFreshnessBadge';
import { formatColors, formatArea } from '@/lib/quotes/personalizationSummary';
import { toast } from 'sonner';
import { showUndoToast } from '@/utils/undoToast';
import { formatEngravingTitle } from '@/lib/customization/format-engraving-title';
import { EngravingBadge } from './EngravingBadge';
import { SortableSummaryCard } from './SortableSummaryCard';

interface QuoteBuilderSummaryItemsProps {
  items: QuoteItem[];
  activeItemIndex: number | null;
  setActiveItemIndex: (i: number | null) => void;
  removeItem: (i: number) => void;
  formatCurrency: (v: number) => string;
  calculateItemPersonalizationTotal: (item: QuoteItem) => number;
  onReorder?: (items: QuoteItem[]) => void;
  confirmItemPrice?: (index: number) => void;
  onRestore?: (item: QuoteItem, index: number) => void;
  showOnlyStale: boolean;
  setShowOnlyStale: (v: boolean) => void;
  visibleItems: { it: QuoteItem; idx: number }[];
  staleIndexes: Set<number>;
  collapsedItemKeys: Set<string>;
  toggleItemCollapsed: (key: string) => void;
  dndSensors: ReturnType<typeof useSensors>;
  handleDragStart: (e: DragStartEvent) => void;
  handleDragEnd: (e: DragEndEvent) => void;
  setActiveDragId: (id: string | null) => void;
  activeItemForOverlay: QuoteItem | null;
}

export function QuoteBuilderSummaryItems({
  items,
  activeItemIndex,
  setActiveItemIndex,
  removeItem,
  formatCurrency,
  calculateItemPersonalizationTotal,
  onReorder,
  confirmItemPrice,
  onRestore,
  showOnlyStale,
  setShowOnlyStale,
  visibleItems,
  staleIndexes,
  collapsedItemKeys,
  toggleItemCollapsed,
  dndSensors,
  handleDragStart,
  handleDragEnd,
  setActiveDragId,
  activeItemForOverlay,
}: QuoteBuilderSummaryItemsProps) {
  return (
    <div
      data-testid="quote-summary-items-scroll"
      className="lg:min-h-[140px] lg:flex-1 [@media(min-height:700px)]:lg:min-h-0 [@media(min-height:700px)]:lg:overflow-y-auto"
    >
      <div className="px-4">
        <div className="space-y-3 pr-1">
          {items.length === 0 ? (
            <div className="group flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-muted-foreground/20 bg-muted/5 p-8 transition-all duration-300 hover:border-primary/30">
              <div className="mb-3 rounded-full bg-muted/30 p-3 transition-colors group-hover:bg-primary/10">
                <Package className="h-6 w-6 text-muted-foreground/40 group-hover:text-primary/50" />
              </div>
              <p className="text-sm font-medium text-muted-foreground group-hover:text-primary/70">
                Nenhum item adicionado
              </p>
              <p className="mt-1 max-w-[150px] text-center text-[11px] text-muted-foreground/60">
                Busque produtos na coluna ao lado para começar
              </p>
            </div>
          ) : visibleItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-warning/30 bg-warning/[0.03] p-6">
              <CheckCircle2 className="mb-2 h-6 w-6 text-warning" />
              <p className="text-sm font-medium text-warning">Preços Confirmados</p>
              <button
                type="button"
                onClick={() => setShowOnlyStale(false)}
                className="mt-2 text-xs text-muted-foreground underline transition-colors hover:text-foreground"
              >
                Ver todos os itens
              </button>
            </div>
          ) : (
            <DndContext
              sensors={dndSensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              onDragCancel={() => setActiveDragId(null)}
            >
              <SortableContext
                items={visibleItems.map(({ it, idx }) => it.id ?? `__idx_${idx}`)}
                strategy={verticalListSortingStrategy}
              >
                {visibleItems.map(({ it: item, idx }) => {
                  const persTotal = calculateItemPersonalizationTotal(item);
                  const isActive = activeItemIndex === idx;
                  const isStale = staleIndexes.has(idx);
                  const sortableId = item.id ?? `__idx_${idx}`;
                  const collapseKey = item.id ?? `__idx_${idx}`;
                  const isCollapsed = collapsedItemKeys.has(collapseKey);
                  // Drag desabilitado quando há filtro ativo (índices visíveis ≠ índices reais
                  // do array `items`, o que tornaria a reordenação inconsistente).
                  const dragDisabled = !onReorder || showOnlyStale;
                  return (
                    <SortableSummaryCard
                      key={sortableId}
                      id={sortableId}
                      dragDisabled={dragDisabled}
                    >
                      {({ dragAttributes, dragListeners }) => (
                        <div
                          data-testid={`quote-summary-item-${idx}`}
                          data-quote-item-id={item.id ?? ''}
                          className={cn(
                            'cursor-pointer rounded-xl border transition-all',
                            isActive
                              ? 'border-primary/50 bg-primary/5 ring-1 ring-primary/20'
                              : 'border-border/60 bg-muted/30 hover:border-border',
                            isStale && !isActive && 'border-warning/40 bg-warning/[0.04]',
                            isStale && isActive && 'ring-warning/30',
                          )}
                          onClick={() => setActiveItemIndex(idx)}
                        >
                          <div className="space-y-2 p-3">
                            <div className="flex items-start gap-2">
                              {/* Handle de arrastar — antes da imagem do produto */}
                              <button
                                type="button"
                                aria-label="Arrastar para reordenar"
                                title="Arrastar para reordenar"
                                data-testid={`quote-summary-drag-handle-${idx}`}
                                className={cn(
                                  'mt-1 shrink-0 touch-none rounded p-1 text-muted-foreground/50 transition-colors',
                                  dragDisabled
                                    ? 'cursor-not-allowed opacity-30'
                                    : 'cursor-grab hover:bg-muted hover:text-foreground active:cursor-grabbing',
                                )}
                                onClick={(e) => e.stopPropagation()}
                                {...(dragDisabled ? {} : dragAttributes)}
                                {...(dragDisabled ? {} : dragListeners)}
                              >
                                <GripVertical className="h-4 w-4" />
                              </button>
                              <ProductThumb
                                src={item.product_image_url}
                                alt={item.product_name}
                                size="summary"
                                roundedClassName="rounded-lg"
                                data-testid="quote-summary-thumb"
                              />
                              <div className="min-w-0 flex-1 pr-4">
                                <p
                                  className="overflow-hidden whitespace-normal break-words pr-2 text-sm font-medium leading-[1.125rem]"
                                  style={{
                                    display: '-webkit-box',
                                    WebkitLineClamp: 2,
                                    WebkitBoxOrient: 'vertical',
                                  }}
                                >
                                  {item.product_name}
                                </p>
                                <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                                  <Badge
                                    variant="secondary"
                                    className="h-4 px-1.5 py-0 font-mono text-[10px]"
                                  >
                                    {item.product_sku}
                                  </Badge>
                                  {item.color_name && (
                                    <div className="flex items-center gap-1">
                                      <div
                                        className="h-2.5 w-2.5 rounded-full border border-border/50"
                                        style={{
                                          backgroundColor: item.color_hex || '#CCC',
                                        }}
                                      />
                                      <span className="text-[10px] text-muted-foreground">
                                        {item.color_name}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </div>
                              {isCollapsed && (
                                <div
                                  data-testid={`quote-summary-collapsed-price-${idx}`}
                                  className="flex shrink-0 items-start gap-8 tabular-nums"
                                >
                                  <div className="flex flex-col items-center gap-2">
                                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                                      Qtd
                                    </span>
                                    <span className="text-xs font-medium leading-none">
                                      {item.quantity}
                                    </span>
                                  </div>
                                  <div className="flex flex-col items-end gap-2">
                                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                                      Vl Unitário
                                    </span>
                                    <span className="text-xs font-medium leading-none">
                                      {formatCurrency(item.unit_price)}
                                    </span>
                                  </div>
                                  <div className="flex flex-col items-end gap-2">
                                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                                      Subtotal
                                    </span>
                                    <span className="text-xs font-semibold leading-none text-foreground">
                                      {formatCurrency(item.quantity * item.unit_price)}
                                    </span>
                                  </div>
                                </div>
                              )}
                              <div className="flex h-[1.125rem] shrink-0 items-center gap-0.5">
                                <TooltipProvider delayDuration={200}>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        aria-label="Editar"
                                        className={cn(
                                          'relative h-3 w-3 rounded-sm before:absolute before:inset-[-10px] before:content-[""]',
                                          isActive
                                            ? 'text-primary'
                                            : 'text-muted-foreground/70 hover:text-foreground',
                                        )}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setActiveItemIndex(idx);
                                        }}
                                      >
                                        <Edit className="h-2 w-2" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent side="top" className="text-xs">
                                      Ajustar este item
                                    </TooltipContent>
                                  </Tooltip>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        aria-label="Excluir"
                                        data-testid={`quote-summary-delete-${idx}`}
                                        className="relative h-3 w-3 rounded-sm text-destructive/70 before:absolute before:inset-[-10px] before:content-[''] hover:bg-destructive/10 hover:text-destructive"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          const snapshot = items[idx];
                                          const removedIndex = idx;
                                          removeItem(idx);
                                          if (activeItemIndex === idx)
                                            setActiveItemIndex(null);
                                          else if (
                                            activeItemIndex !== null &&
                                            activeItemIndex > idx
                                          )
                                            setActiveItemIndex(activeItemIndex - 1);
                                          if (snapshot && onRestore) {
                                            showUndoToast({
                                              title: 'Item removido',
                                              description: snapshot.product_name,
                                              duration: 5000,
                                              onUndo: () => onRestore(snapshot, removedIndex),
                                            });
                                          }
                                        }}
                                      >
                                        <Trash2 className="h-2 w-2" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent side="top" className="text-xs">
                                      Remover do orçamento
                                    </TooltipContent>
                                  </Tooltip>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        aria-label={isCollapsed ? 'Expandir' : 'Recolher'}
                                        aria-expanded={!isCollapsed}
                                        aria-pressed={isCollapsed}
                                        data-collapsed={isCollapsed}
                                        data-testid={`quote-summary-toggle-${idx}`}
                                        className="relative h-3 w-3 rounded-sm text-muted-foreground/70 before:absolute before:inset-[-10px] before:content-[''] hover:text-foreground"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          toggleItemCollapsed(collapseKey);
                                        }}
                                      >
                                        {isCollapsed ? (
                                          <ChevronDown className="h-2 w-2" />
                                        ) : (
                                          <ChevronUp className="h-2 w-2" />
                                        )}
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent side="top" className="text-xs">
                                      {isCollapsed ? 'Ver detalhes' : 'Ocultar detalhes'}
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </div>
                            </div>
                            {!isCollapsed && (
                              <div className="animate-fade-in motion-reduce:animate-none">
                                <div className="flex items-center gap-2 text-xs">
                                  <span className="text-muted-foreground">Qtd:</span>
                                  <span className="font-medium">{item.quantity}</span>
                                  <span className="text-muted-foreground">×</span>
                                  <span className="font-medium">
                                    {formatCurrency(item.unit_price)}
                                  </span>
                                  <span className="ml-auto font-semibold tabular-nums text-foreground">
                                    {formatCurrency(item.quantity * item.unit_price)}
                                  </span>
                                </div>
                                {(item.price_updated_at || item.price_confirmed_at) && (
                                  <div
                                    onClick={(e) => e.stopPropagation()}
                                    className="pt-0.5"
                                  >
                                    <PriceFreshnessBadge
                                      priceUpdatedAt={item.price_updated_at}
                                      thresholdDays={item.price_freshness_threshold_days}
                                      confirmedAt={item.price_confirmed_at}
                                      variant="inline"
                                      onConfirm={
                                        confirmItemPrice
                                          ? () => {
                                              confirmItemPrice(idx);
                                              toast.success(
                                                'Preço confirmado com fornecedor',
                                                {
                                                  description: item.product_name,
                                                },
                                              );
                                            }
                                          : undefined
                                      }
                                    />
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                          {!isCollapsed &&
                            item.personalizations &&
                            item.personalizations.length > 0 && (
                              <div className="animate-fade-in px-3 pb-3 pt-0 motion-reduce:animate-none">
                                <div className="mb-1.5 flex items-center justify-between">
                                  <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                                    Gravações ({item.personalizations.length})
                                  </span>
                                  <span className="text-xs font-semibold tabular-nums text-primary">
                                    {formatCurrency(persTotal)}
                                  </span>
                                </div>
                                <div className="space-y-1">
                                  {item.personalizations.map((p, pIdx) => {
                                    const metaParts = [
                                      formatArea(p.width_cm, p.height_cm)
                                        ? `Área ${formatArea(p.width_cm, p.height_cm)}`
                                        : null,
                                      formatColors(p.colors_count),
                                      p.personalized_quantity
                                        ? `${p.personalized_quantity} pç(s)`
                                        : null,
                                    ].filter(Boolean) as string[];
                                    const meta = metaParts.join(' · ');
                                    return (
                                      <div
                                        key={`${p.technique_id || p.technique_name}-${pIdx}`}
                                        className="flex items-center justify-between gap-1 rounded-lg border border-border/40 bg-card px-2 py-1 text-xs"
                                      >
                                        <div className="flex min-w-0 flex-1 items-center gap-1.5">
                                          <Badge
                                            variant="secondary"
                                            className="h-4 shrink-0 px-1 py-0 text-[9px] font-bold"
                                          >
                                            {pIdx + 1}
                                          </Badge>
                                          <EngravingBadge
                                            variant="plain"
                                            title={formatEngravingTitle({
                                              nomeTabela: p.technique_name,
                                              fallback: 'Gravação',
                                            })}
                                            location={p.location_name || null}
                                            meta={meta || null}
                                            className="min-w-0 flex-1"
                                            data-testid="summary-engraving-badge"
                                          />
                                        </div>
                                        <span className="shrink-0 font-bold tabular-nums text-foreground">
                                          {formatCurrency(p.total_cost || 0)}
                                        </span>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                        </div>
                      )}
                    </SortableSummaryCard>
                  );
                })}
              </SortableContext>
              <DragOverlay
                dropAnimation={{ duration: 180, easing: 'cubic-bezier(0.18,0.67,0.6,1.22)' }}
              >
                {activeItemForOverlay ? (
                  <div
                    data-testid="quote-summary-drag-overlay"
                    className={cn(
                      'pointer-events-none rounded-xl border-[1.5px] border-primary/60 bg-card p-3',
                      'rotate-[0.5deg] scale-[1.02] shadow-2xl ring-2 ring-primary/40',
                      'animate-fade-in',
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <GripVertical className="h-4 w-4 text-primary" />
                      <ProductThumb
                        src={activeItemForOverlay.product_image_url}
                        alt={activeItemForOverlay.product_name}
                        size="compact"
                        roundedClassName="rounded-lg"
                        iconClassName="h-4 w-4"
                        data-testid="quote-summary-drag-thumb"
                      />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {activeItemForOverlay.product_name}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {activeItemForOverlay.quantity} ×{' '}
                          {formatCurrency(activeItemForOverlay.unit_price)}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : null}
              </DragOverlay>
            </DndContext>
          )}
        </div>
      </div>
    </div>
  );
}
