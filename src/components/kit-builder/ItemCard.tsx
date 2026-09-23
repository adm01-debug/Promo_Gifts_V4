/**
 * Item Card
 * Card individual para exibir um item disponível no kit
 */

import { Plus, Check, X, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { FavoriteToggleButton } from './FavoriteToggleButton';
import {
  formatVolume,
  formatCurrency,
  formatDimensions,
  type KitItem,
  type CompatibilityResult,
} from '@/lib/kit-builder';

interface ItemCardProps {
  item: KitItem & { compatibility: CompatibilityResult | null };
  isSelected: boolean;
  selectedItem?: KitItem;
  boxSelected: boolean;
  onAdd: (item: KitItem) => void;
  onRemove: (item: KitItem) => void;
  /** Grid = rich card with top image. List = compact single-line row. */
  view?: 'grid' | 'list';
  /** Consulta agregada de estoque da página ainda em voo (etapa 13). */
  isLoadingStock?: boolean;
}

/**
 * 4 estados: carregando (skeleton), desconhecido (`stock` null/undefined,
 * consulta já resolvida), sem estoque (`0`) e em estoque (`N`). Nunca mostra
 * "0" quando o dado é apenas desconhecido.
 */
function StockBadge({
  stock,
  isLoadingStock,
}: {
  stock?: number | null;
  isLoadingStock?: boolean;
}) {
  if (isLoadingStock) return <Skeleton className="h-[18px] w-20 rounded-full" />;
  if (stock === null || stock === undefined) {
    return (
      <Badge variant="outline" className="text-[10px] font-normal text-muted-foreground">
        Estoque desconhecido
      </Badge>
    );
  }
  if (stock === 0) {
    return (
      <Badge variant="destructive" className="text-[10px] font-normal">
        Sem estoque
      </Badge>
    );
  }
  return (
    <Badge variant="secondary" className="text-[10px] font-normal">
      Em estoque ({stock})
    </Badge>
  );
}

/** Up to 3 short, catalog-derived attributes — never invented. */
function getItemAttributes(item: KitItem): string[] {
  const attributes: string[] = [];
  if (item.material) attributes.push(item.material);
  if (item.width > 0 && item.height > 0 && item.depth > 0 && item.dimensionsKnown !== false) {
    attributes.push(formatDimensions(item.width, item.height, item.depth));
  }
  if (item.category) attributes.push(item.category);
  return attributes.slice(0, 3);
}

function CompatibilityBadge({
  item,
}: {
  item: KitItem & { compatibility: CompatibilityResult | null };
}) {
  const fits = item.compatibility?.fits !== false;
  const compatibilityPending = item.compatibility?.confidence !== 'verified';

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge
          variant={fits && !compatibilityPending ? 'secondary' : 'destructive'}
          className={cn(
            'text-xs',
            fits &&
              !compatibilityPending &&
              'bg-primary/10 text-primary hover:bg-primary/20 dark:text-primary',
            compatibilityPending &&
              'border-warning/30 bg-warning/10 text-warning hover:bg-warning/15',
          )}
        >
          {compatibilityPending ? (
            <>
              <Package className="mr-1 h-3 w-3" />
              PENDENTE
            </>
          ) : fits ? (
            <>
              <Check className="mr-1 h-3 w-3" />
              COMPATÍVEL
            </>
          ) : (
            <>
              <X className="mr-1 h-3 w-3" />
              NÃO CABE
            </>
          )}
        </Badge>
      </TooltipTrigger>
      {item.compatibility?.reason && (compatibilityPending || !fits) && (
        <TooltipContent>
          <p className="max-w-[200px]">{item.compatibility.reason}</p>
        </TooltipContent>
      )}
    </Tooltip>
  );
}

function AddButton({
  isSelected,
  cantFit,
  selectedItem,
  item,
  onAdd,
  onRemove,
}: {
  isSelected: boolean;
  cantFit: boolean;
  selectedItem?: KitItem;
  item: KitItem;
  onAdd: (item: KitItem) => void;
  onRemove: (item: KitItem) => void;
}) {
  if (isSelected) {
    return (
      <Button
        variant="outline"
        size="sm"
        className="ml-auto shrink-0 focus-visible:ring-2 focus-visible:ring-primary/60"
        onClick={() => selectedItem && onRemove(selectedItem)}
      >
        <Check className="mr-1 h-3 w-3 text-success" />
        <span className="group-hover:hidden">Adicionado</span>
        <span className="hidden group-hover:inline">Remover</span>
      </Button>
    );
  }
  return (
    <Button
      variant="default"
      size="sm"
      className="ml-auto shrink-0 opacity-90 transition-opacity focus-visible:ring-2 focus-visible:ring-primary/60 group-hover:opacity-100"
      disabled={cantFit}
      onClick={() => onAdd(item)}
    >
      <Plus className="mr-1 h-3 w-3" />
      Adicionar
    </Button>
  );
}

export function ItemCard({
  item,
  isSelected,
  selectedItem,
  boxSelected,
  onAdd,
  onRemove,
  view = 'grid',
  isLoadingStock,
}: ItemCardProps) {
  const fits = item.compatibility?.fits !== false;
  const cantFit = boxSelected && !fits;
  const attributes = getItemAttributes(item);

  if (view === 'list') {
    return (
      <Card
        className={cn(
          'group rounded-xl transition-all duration-200',
          'border-border/50 focus-within:ring-2 focus-within:ring-primary/60',
          isSelected && 'bg-primary/5 ring-2 ring-primary',
          cantFit && 'opacity-60',
          !cantFit && !isSelected && 'hover:border-primary/40 hover:bg-card',
        )}
      >
        <CardContent className="flex items-center gap-3 p-2.5">
          <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-md bg-secondary">
            {item.imageUrl ? (
              <img
                src={item.imageUrl}
                alt={item.name}
                className="h-full w-full object-cover"
                loading="lazy"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <Package className="h-5 w-5 text-muted-foreground" />
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="truncate text-sm font-medium">{item.name}</h4>
            {attributes.length > 0 && (
              <p className="truncate text-xs text-muted-foreground">{attributes.join(' · ')}</p>
            )}
          </div>
          <span className="shrink-0 text-sm font-semibold text-primary">
            {formatCurrency(item.price)}
          </span>
          <StockBadge stock={item.stock} isLoadingStock={isLoadingStock} />
          {boxSelected && <CompatibilityBadge item={item} />}
          <FavoriteToggleButton productId={item.id} productName={item.name} />
          <AddButton
            isSelected={isSelected}
            cantFit={cantFit}
            selectedItem={selectedItem}
            item={item}
            onAdd={onAdd}
            onRemove={onRemove}
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      className={cn(
        'group flex flex-col overflow-hidden rounded-xl transition-all duration-200 will-change-transform',
        'border-border/50 focus-within:ring-2 focus-within:ring-primary/60',
        isSelected &&
          'bg-primary/5 shadow-[0_4px_20px_-6px_hsl(var(--primary)/0.35)] ring-2 ring-primary',
        cantFit && 'opacity-60',
        !cantFit &&
          !isSelected &&
          'cursor-pointer hover:-translate-y-0.5 hover:border-primary/40 hover:bg-card hover:shadow-lg',
      )}
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-secondary">
        {item.imageUrl ? (
          <img
            src={item.imageUrl}
            alt={item.name}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Package className="h-10 w-10 text-muted-foreground" />
          </div>
        )}
        <FavoriteToggleButton
          productId={item.id}
          productName={item.name}
          className="absolute right-1.5 top-1.5 bg-background/80 backdrop-blur-sm hover:bg-background"
        />
      </div>
      <CardContent className="flex flex-1 flex-col p-3">
        <h4 className="truncate text-sm font-medium">{item.name}</h4>
        {attributes.length > 0 && (
          <p className="truncate text-xs text-muted-foreground">{attributes.join(' · ')}</p>
        )}
        <div className="mt-1 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">{formatVolume(item.volume)}</span>
          <span className="text-sm font-semibold text-primary">{formatCurrency(item.price)}</span>
        </div>
        <div className="mt-1">
          <StockBadge stock={item.stock} isLoadingStock={isLoadingStock} />
        </div>

        <div className="mt-2 flex items-center justify-between border-t pt-2">
          {boxSelected && <CompatibilityBadge item={item} />}
          <AddButton
            isSelected={isSelected}
            cantFit={cantFit}
            selectedItem={selectedItem}
            item={item}
            onAdd={onAdd}
            onRemove={onRemove}
          />
        </div>
      </CardContent>
    </Card>
  );
}
