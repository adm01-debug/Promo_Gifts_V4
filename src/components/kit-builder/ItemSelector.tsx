/**
 * Item Selector
 * Seletor de itens para compor o kit (refatorado)
 */

import { useState, useMemo, useEffect } from 'react';
import {
  Search,
  AlertTriangle,
  X,
  Package,
  LayoutGrid,
  List,
  ArrowRight,
  Trash2,
} from 'lucide-react';
import { SelectedItemsBadges } from './SelectedItemsBadges';
import { ItemCard } from './ItemCard';
import { KitSmartSuggestions } from './KitSmartSuggestions';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ItemCardSkeleton } from './KitCardSkeleton';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  getKitItemLineId,
  formatCurrency,
  sortItemsByRelevance,
  type KitItem,
  type ItemFilters,
  type CompatibilityResult,
  type KitBuilderFlow,
} from '@/lib/kit-builder';
import { useKitStockValidation } from '@/hooks/kit-builder';
import type { VariantSelectionData } from './VariantSelector';

interface ItemWithCompatibility extends KitItem {
  compatibility: CompatibilityResult | null;
}

interface ItemSelectorProps {
  items: ItemWithCompatibility[];
  selectedItems: KitItem[];
  isLoading: boolean;
  /** Estoque agregado ainda em voo (etapa 13) — mostra skeleton no badge, não "desconhecido". */
  isLoadingStock?: boolean;
  filters: ItemFilters;
  onFiltersChange: (filters: ItemFilters) => void;
  onAddItem: (item: KitItem) => CompatibilityResult;
  onRemoveItem: (itemId: string) => void;
  onUpdateQuantity: (itemId: string, quantity: number) => void;
  onUpdateVariant: (itemId: string, data: VariantSelectionData) => void;
  onReorder?: (fromIndex: number, toIndex: number) => void;
  onClearAll?: () => void;
  boxSelected: boolean;
  errorMessage?: string | null;
  onRetry?: () => void;
  /** Total catalog size before filtering — powers the "X de Y produtos" counter. */
  totalCount?: number;
  /** Journey badge shown in the step header. */
  flow?: KitBuilderFlow;
  kitQuantity?: number;
  /** Real occupancy once a box exists; undefined/no box shows the "pending" copy. */
  volumeUsagePercent?: number;
  onNext?: () => void;
  canProceed?: boolean;
}

export function ItemSelector({
  items,
  selectedItems,
  isLoading,
  isLoadingStock,
  filters,
  onFiltersChange,
  onAddItem,
  onRemoveItem,
  onUpdateQuantity,
  onUpdateVariant,
  onReorder,
  onClearAll,
  boxSelected,
  errorMessage,
  onRetry,
  totalCount,
  flow,
  kitQuantity,
  volumeUsagePercent,
  onNext,
  canProceed,
}: ItemSelectorProps) {
  const [searchValue, setSearchValue] = useState('');
  const [lastError, setLastError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  useEffect(() => {
    setSearchValue(filters.search || '');
  }, [filters.search]);

  const handleSearchChange = (value: string) => {
    setSearchValue(value);
    onFiltersChange({ ...filters, search: value || undefined });
  };

  const handleAddItem = (item: KitItem) => {
    const result = onAddItem(item);
    if (!result.fits) {
      setLastError(result.reason || 'Item não cabe na caixa');
      setTimeout(() => setLastError(null), 3000);
    }
  };

  // Extract unique categories for filter
  const categories = useMemo(() => {
    const cats = new Set<string>();
    items.forEach((i) => {
      if (i.category) cats.add(i.category);
    });
    return Array.from(cats).sort();
  }, [items]);
  const materials = useMemo(
    () =>
      Array.from(new Set(items.map((item) => item.material).filter(Boolean) as string[])).sort(),
    [items],
  );

  const sortedItems = useMemo(
    () => ((filters.sort ?? 'relevance') === 'relevance' ? sortItemsByRelevance(items) : items),
    [items, filters.sort],
  );

  const selectedItemsByProductId = new Map<string, KitItem>();
  selectedItems.forEach((item) => {
    if (!selectedItemsByProductId.has(item.id)) selectedItemsByProductId.set(item.id, item);
  });

  // Stock is only ever resolved for the small, bounded set of already-selected
  // items — batching it across the whole visible catalog would reintroduce
  // the N+1 this hook was built to avoid.
  const { stockByProduct, stockByVariant } = useKitStockValidation(
    selectedItems,
    null,
    kitQuantity || 1,
  );

  const subtotal = selectedItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const previewThumbs = selectedItems.slice(0, 4);

  return (
    <div className="space-y-4">
      {flow && (
        <Badge variant="outline" className="gap-1.5 text-xs font-normal text-muted-foreground">
          {flow === 'items-first'
            ? 'Fluxo 1 · Começar pelos itens'
            : 'Fluxo 2 · Começar pela caixa'}
        </Badge>
      )}

      {!boxSelected && (
        <div className="flex items-center gap-3 rounded-lg border border-warning/30 bg-warning/10 p-4">
          <AlertTriangle className="h-5 w-5 flex-shrink-0 text-warning" />
          <p className="text-sm">
            Você pode começar pelos itens. Escolha uma caixa depois para validar compatibilidade,
            ocupação e peso.
          </p>
        </div>
      )}

      {lastError && (
        <div className="flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-4 animate-in fade-in slide-in-from-top-2">
          <X className="h-5 w-5 flex-shrink-0 text-destructive" />
          <p className="text-sm text-destructive">{lastError}</p>
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <section className="min-w-0 space-y-4" aria-label="Catálogo de produtos">
          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar item..."
                value={searchValue}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-10"
              />
            </div>

            {boxSelected && (
              <div className="flex items-center gap-2">
                <Switch
                  id="only-fitting"
                  checked={filters.onlyFitting || false}
                  onCheckedChange={(checked) =>
                    onFiltersChange({ ...filters, onlyFitting: checked })
                  }
                />
                <Label htmlFor="only-fitting" className="cursor-pointer text-sm">
                  Apenas itens que cabem
                </Label>
              </div>
            )}

            <div className="flex items-center gap-1 rounded-lg border p-0.5">
              <Button
                type="button"
                variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                size="icon"
                className="h-8 w-8"
                aria-label="Ver em grade"
                aria-pressed={viewMode === 'grid'}
                onClick={() => setViewMode('grid')}
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                size="icon"
                className="h-8 w-8"
                aria-label="Ver em lista"
                aria-pressed={viewMode === 'list'}
                onClick={() => setViewMode('list')}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div
            className="flex flex-wrap gap-2 overflow-x-auto pb-1"
            role="group"
            aria-label="Categorias"
          >
            <Badge
              variant={!filters.category ? 'default' : 'outline'}
              className="cursor-pointer whitespace-nowrap px-3 py-1.5 text-xs font-medium"
              onClick={() => onFiltersChange({ ...filters, category: undefined })}
            >
              Todos
            </Badge>
            {categories.map((cat) => (
              <Badge
                key={cat}
                variant={filters.category === cat ? 'default' : 'outline'}
                className="cursor-pointer whitespace-nowrap px-3 py-1.5 text-xs font-medium"
                onClick={() => onFiltersChange({ ...filters, category: cat })}
              >
                {cat}
              </Badge>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {materials.length > 0 && (
              <Select
                value={filters.material || 'all'}
                onValueChange={(v) =>
                  onFiltersChange({ ...filters, material: v === 'all' ? undefined : v })
                }
              >
                <SelectTrigger className="w-[180px]" aria-label="Material">
                  <SelectValue placeholder="Material" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os materiais</SelectItem>
                  {materials.map((material) => (
                    <SelectItem key={material} value={material}>
                      {material}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Select
              value={filters.sort || 'relevance'}
              onValueChange={(value) =>
                onFiltersChange({ ...filters, sort: value as NonNullable<typeof filters.sort> })
              }
            >
              <SelectTrigger className="w-[180px]" aria-label="Ordenar">
                <SelectValue placeholder="Ordenar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="relevance">Mais relevantes</SelectItem>
                <SelectItem value="name">Nome</SelectItem>
                <SelectItem value="price-asc">Menor preço</SelectItem>
                <SelectItem value="price-desc">Maior preço</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2">
              <Input
                aria-label="Preço mínimo"
                type="number"
                min="0"
                placeholder="Preço mín."
                className="w-28"
                value={filters.minPrice ?? ''}
                onChange={(event) =>
                  onFiltersChange({
                    ...filters,
                    minPrice: event.target.value ? Number(event.target.value) : undefined,
                  })
                }
              />
              <Input
                aria-label="Preço máximo"
                type="number"
                min="0"
                placeholder="Preço máx."
                className="w-28"
                value={filters.maxPrice ?? ''}
                onChange={(event) =>
                  onFiltersChange({
                    ...filters,
                    maxPrice: event.target.value ? Number(event.target.value) : undefined,
                  })
                }
              />
            </div>
            <span className="ml-auto text-xs text-muted-foreground">
              {items.length} de {totalCount ?? items.length} produtos
            </span>
          </div>

          <KitSmartSuggestions
            selectedItems={selectedItems}
            onAddItem={(suggestion) => {
              const catalogItem = items.find((item) => item.id === suggestion.id);
              if (catalogItem) handleAddItem(catalogItem);
            }}
          />

          <div>
            {isLoading ? (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <ItemCardSkeleton key={i} />
                ))}
              </div>
            ) : errorMessage ? (
              <div className="py-12 text-center">
                <AlertTriangle className="mx-auto mb-3 h-12 w-12 text-destructive" />
                <p className="font-medium">Não foi possível carregar os itens</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Tente novamente antes de montar a composição.
                </p>
                {onRetry && (
                  <Button variant="outline" size="sm" className="mt-3" onClick={onRetry}>
                    Tentar novamente
                  </Button>
                )}
              </div>
            ) : items.length === 0 ? (
              <div className="py-12 text-center">
                <Package className="mx-auto mb-3 h-12 w-12 text-muted-foreground" />
                <p className="text-muted-foreground">Nenhum item encontrado</p>
              </div>
            ) : viewMode === 'grid' ? (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                {sortedItems.map((item) => (
                  <ItemCard
                    key={item.id}
                    item={item}
                    isSelected={selectedItemsByProductId.has(item.id)}
                    selectedItem={selectedItemsByProductId.get(item.id)}
                    boxSelected={boxSelected}
                    onAdd={handleAddItem}
                    onRemove={(selected) => onRemoveItem(getKitItemLineId(selected))}
                    isLoadingStock={isLoadingStock}
                  />
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {sortedItems.map((item) => (
                  <ItemCard
                    key={item.id}
                    item={item}
                    view="list"
                    isSelected={selectedItemsByProductId.has(item.id)}
                    selectedItem={selectedItemsByProductId.get(item.id)}
                    boxSelected={boxSelected}
                    onAdd={handleAddItem}
                    onRemove={(selected) => onRemoveItem(getKitItemLineId(selected))}
                    isLoadingStock={isLoadingStock}
                  />
                ))}
              </div>
            )}
          </div>
        </section>

        <aside
          className="h-fit space-y-4 rounded-xl border bg-card p-4 xl:sticky xl:top-24"
          aria-label="Composição atual do kit"
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-display text-lg font-semibold">Seu kit</h3>
              <p className="text-xs text-muted-foreground">
                {selectedItems.length}{' '}
                {selectedItems.length === 1 ? 'item selecionado' : 'itens selecionados'}
              </p>
            </div>
            {previewThumbs.length > 0 && (
              <div className="flex -space-x-2">
                {previewThumbs.map((item) => (
                  <div
                    key={getKitItemLineId(item)}
                    className="h-8 w-8 overflow-hidden rounded-full border-2 border-card bg-secondary"
                  >
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <Package className="h-3.5 w-3.5 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {selectedItems.length > 0 ? (
            <SelectedItemsBadges
              items={selectedItems}
              onRemoveItem={onRemoveItem}
              onUpdateQuantity={onUpdateQuantity}
              onUpdateVariant={onUpdateVariant}
              onReorder={onReorder}
              stockByProduct={stockByProduct}
              stockByVariant={stockByVariant}
              kitQuantity={kitQuantity}
            />
          ) : (
            <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
              <Package className="mx-auto mb-2 h-8 w-8" />
              Adicione produtos para começar a composição.
            </div>
          )}

          <div className="border-t pt-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Itens por kit</span>
              <strong>{selectedItems.reduce((sum, item) => sum + item.quantity, 0)}</strong>
            </div>
            <div className="mt-1 flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <strong>{formatCurrency(subtotal)}</strong>
            </div>
          </div>

          {!boxSelected && (
            <p className="rounded-md bg-muted/50 p-2 text-xs text-muted-foreground">
              A caixa ideal será recomendada após a definição da composição.
            </p>
          )}

          <div className="rounded-md border border-dashed p-2 text-xs">
            <span className="text-muted-foreground">
              {boxSelected
                ? `Estimativa de ocupação: ${Math.round(volumeUsagePercent ?? 0)}%`
                : 'Estimativa de ocupação — calculada após a escolha da caixa.'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {onClearAll && selectedItems.length > 0 && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1.5 text-destructive">
                    <Trash2 className="h-3.5 w-3.5" /> Limpar tudo
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Remover todos os itens?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Isso remove todos os {selectedItems.length} itens selecionados e suas
                      personalizações. A caixa escolhida é mantida.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={onClearAll}>Limpar tudo</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
            {onNext && (
              <Button className="ml-auto gap-1.5" size="sm" disabled={!canProceed} onClick={onNext}>
                {flow === 'items-first' ? 'Ver caixas compatíveis' : 'Continuar'}
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
