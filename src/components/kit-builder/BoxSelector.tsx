/**
 * Box Selector
 * Seletor de caixa/embalagem para o kit com filtros avançados
 */

import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Package,
  Check,
  Ruler,
  Box,
  SlidersHorizontal,
  X,
  GitCompareArrows,
  Eye,
  LayoutGrid,
  List,
  HelpCircle,
  Sparkles,
  Pencil,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BoxCardSkeleton } from './KitCardSkeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { FavoriteToggleButton } from './FavoriteToggleButton';
import {
  formatVolume,
  formatDimensions,
  formatCurrency,
  rankBoxesForItems,
  calculateTotalItemsVolume,
  getKitItemLineId,
  type KitBox,
  type KitItem,
  type BoxFilters,
} from '@/lib/kit-builder';
import { BoxComparisonDialog } from './BoxComparisonDialog';

type BoxSortMode = 'occupancy' | 'price' | 'score';
type BoxViewMode = 'grid' | 'list';

interface BoxSelectorProps {
  boxes: KitBox[];
  /**
   * Catálogo completo (sem nenhum filtro aplicado) — usado só para listar
   * todos os materiais possíveis no checkbox de filtro, mesmo quando um
   * filtro ativo zera a contagem de algum deles. Sem isso o checkbox some
   * em vez de aparecer desabilitado. Se omitido, cai para `boxes`.
   */
  allBoxes?: KitBox[];
  selectedBox: KitBox | null;
  kitItems?: KitItem[];
  isLoading: boolean;
  filters: BoxFilters;
  onFiltersChange: (filters: BoxFilters) => void;
  onSelect: (box: KitBox) => void;
  onClear: () => void;
  errorMessage?: string | null;
  onRetry?: () => void;
  /** Navigates back to the items step, preserving state. */
  onEditItems?: () => void;
  /** Reopens the shared Kit Maker onboarding tour. */
  onOpenGuide?: () => void;
}

export function BoxSelector({
  boxes,
  allBoxes,
  selectedBox,
  kitItems = [],
  isLoading,
  filters,
  onFiltersChange,
  onSelect,
  onClear,
  errorMessage,
  onRetry,
  onEditItems,
  onOpenGuide,
}: BoxSelectorProps) {
  const navigate = useNavigate();
  const [searchValue, setSearchValue] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [focusedBoxId, setFocusedBoxId] = useState<string | null>(null);
  const [comparisonIds, setComparisonIds] = useState<string[]>([]);
  const [comparisonOpen, setComparisonOpen] = useState(false);
  const [viewMode, setViewMode] = useState<BoxViewMode>('grid');
  const [sortMode, setSortMode] = useState<BoxSortMode>('score');

  // Filters can be applied by the AI assist or restored from a saved journey.
  // Keep the visible field aligned with that external state instead of showing
  // an empty search while a hidden query is active.
  useEffect(() => {
    setSearchValue(filters.search || '');
  }, [filters.search]);

  const handleSearchChange = (value: string) => {
    setSearchValue(value);
    onFiltersChange({ ...filters, search: value || undefined });
  };

  // Contagem por material calculada sobre `boxes` — o conjunto já respeita
  // busca/dimensões/preço/tipo/acabamento, mas NUNCA o próprio filtro de
  // material, para que o checkbox de um material não selecionado mostre
  // quantas caixas ele realmente libera.
  const materialCounts = useMemo(() => {
    const counts = new Map<string, number>();
    boxes.forEach((b) => {
      if (!b.material) return;
      counts.set(b.material, (counts.get(b.material) ?? 0) + 1);
    });
    return counts;
  }, [boxes]);

  // Lista estável de materiais — vem do catálogo completo (não do `boxes` já
  // filtrado) para que um material sem nenhuma caixa nos filtros atuais
  // continue aparecendo (desabilitado), em vez de sumir do checkbox.
  const materials = useMemo(() => {
    const source = allBoxes ?? boxes;
    return Array.from(new Set(source.map((b) => b.material).filter(Boolean) as string[])).sort(
      (a, b) => a.localeCompare(b, 'pt-BR'),
    );
  }, [allBoxes, boxes]);

  const selectedMaterials = filters.material;

  // Único ponto onde o filtro de material (multi-seleção) é de fato aplicado.
  const materialFilteredBoxes = useMemo(() => {
    if (!selectedMaterials || selectedMaterials.length === 0) return boxes;
    const set = new Set(selectedMaterials);
    return boxes.filter((b) => b.material && set.has(b.material));
  }, [boxes, selectedMaterials]);

  const toggleMaterialFilter = (material: string) => {
    const current = filters.material ?? [];
    const next = current.includes(material)
      ? current.filter((m) => m !== material)
      : [...current, material];
    onFiltersChange({ ...filters, material: next.length > 0 ? next : undefined });
  };

  const boxTypes = useMemo(
    () =>
      Array.from(new Set(materialFilteredBoxes.map((box) => box.boxType).filter(Boolean))).sort(
        (a, b) => a!.localeCompare(b!),
      ) as string[],
    [materialFilteredBoxes],
  );

  const finishes = useMemo(
    () =>
      Array.from(new Set(materialFilteredBoxes.map((box) => box.finish).filter(Boolean))).sort(
        (a, b) => a!.localeCompare(b!),
      ) as string[],
    [materialFilteredBoxes],
  );

  // Dimension ranges for sliders
  const maxDims = useMemo(() => {
    let w = 0,
      h = 0,
      d = 0;
    materialFilteredBoxes.forEach((b) => {
      if (b.internalWidth > w) w = b.internalWidth;
      if (b.internalHeight > h) h = b.internalHeight;
      if (b.internalDepth > d) d = b.internalDepth;
    });
    return { width: Math.ceil(w) || 50, height: Math.ceil(h) || 50, depth: Math.ceil(d) || 50 };
  }, [materialFilteredBoxes]);

  const maxPrice = useMemo(
    () => Math.max(10, ...materialFilteredBoxes.map((box) => Math.ceil(box.price))),
    [materialFilteredBoxes],
  );

  const recommendations = useMemo(
    () => rankBoxesForItems(materialFilteredBoxes, kitItems),
    [materialFilteredBoxes, kitItems],
  );

  const sortedRecommendations = useMemo(() => {
    if (sortMode === 'price') {
      return [...recommendations].sort((a, b) => a.box.price - b.box.price);
    }
    if (sortMode === 'occupancy') {
      return [...recommendations].sort((a, b) => b.usagePercent - a.usagePercent);
    }
    return recommendations;
  }, [recommendations, sortMode]);

  const boxTypeChips = useMemo(
    () =>
      Array.from(new Set(recommendations.map((r) => r.box.boxType).filter(Boolean))).sort((a, b) =>
        a!.localeCompare(b!, 'pt-BR'),
      ) as string[],
    [recommendations],
  );

  const kitItemsVolume = useMemo(() => calculateTotalItemsVolume(kitItems), [kitItems]);
  const kitItemsQuantity = kitItems.reduce((sum, item) => sum + item.quantity, 0);

  const compatibleRecommendations = recommendations.filter((r) => r.status !== 'incompatible');
  const bestRecommendation = compatibleRecommendations[0] ?? null;
  const bestReasons = useMemo(() => {
    if (!bestRecommendation) return [];
    const reasons: string[] = [];
    if (bestRecommendation.status === 'compatible') reasons.push('Comporta todos os itens');
    const freeSpace = Math.max(0, 100 - bestRecommendation.usagePercent);
    reasons.push(`Espaço livre de ${Math.round(freeSpace)}%`);
    const isCheapest = compatibleRecommendations.every(
      (r) => r.box.id === bestRecommendation.box.id || r.box.price >= bestRecommendation.box.price,
    );
    if (isCheapest && compatibleRecommendations.length > 1) {
      reasons.push('Menor preço entre as compatíveis');
    }
    return reasons.slice(0, 3);
  }, [bestRecommendation, compatibleRecommendations]);
  const hasNoCompatibleBox =
    kitItems.length > 0 && recommendations.length > 0 && compatibleRecommendations.length === 0;

  const focusedRecommendation =
    sortedRecommendations.find((recommendation) => recommendation.box.id === focusedBoxId) ??
    sortedRecommendations[0] ??
    null;
  const comparedRecommendations = comparisonIds
    .map((id) => recommendations.find((recommendation) => recommendation.box.id === id))
    .filter((recommendation): recommendation is (typeof recommendations)[number] =>
      Boolean(recommendation),
    );

  useEffect(() => {
    const validIds = new Set(recommendations.map((recommendation) => recommendation.box.id));
    setComparisonIds((current) => {
      const next = current.filter((id) => validIds.has(id));
      return next.length === current.length ? current : next;
    });
  }, [recommendations]);

  const toggleComparison = (boxId: string) => {
    setComparisonIds((current) => {
      if (current.includes(boxId)) return current.filter((id) => id !== boxId);
      if (current.length >= 3) return [...current.slice(1), boxId];
      return [...current, boxId];
    });
  };

  const hasActiveFilters = !!(
    filters.minWidth ||
    filters.maxWidth ||
    filters.minHeight ||
    filters.maxHeight ||
    filters.minDepth ||
    filters.maxDepth ||
    filters.minPrice ||
    filters.maxPrice ||
    filters.material ||
    filters.boxType ||
    filters.finish
  );

  const activeFilterCount = [
    filters.minWidth,
    filters.maxWidth,
    filters.minHeight,
    filters.maxHeight,
    filters.minDepth,
    filters.maxDepth,
    filters.minPrice,
    filters.maxPrice,
    filters.material,
    filters.boxType,
    filters.finish,
  ].filter(Boolean).length;

  const clearAdvancedFilters = () => {
    onFiltersChange({
      ...filters,
      minWidth: undefined,
      maxWidth: undefined,
      minHeight: undefined,
      maxHeight: undefined,
      minDepth: undefined,
      maxDepth: undefined,
      minPrice: undefined,
      maxPrice: undefined,
      material: undefined,
      boxType: undefined,
      finish: undefined,
    });
  };

  // Se já tem uma caixa selecionada, mostra resumo
  if (selectedBox) {
    return (
      <Card className="border-primary bg-primary/5">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="h-24 w-24 flex-shrink-0 overflow-hidden rounded-lg bg-secondary">
              {selectedBox.imageUrl ? (
                <img
                  src={selectedBox.imageUrl}
                  alt={selectedBox.name}
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <Package className="h-10 w-10 text-muted-foreground" />
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="mb-1 flex items-center gap-2">
                <Badge variant="default" className="bg-primary">
                  <Check className="mr-1 h-3 w-3" />
                  Selecionada
                </Badge>
              </div>
              <h3 className="truncate font-display text-lg font-semibold">{selectedBox.name}</h3>
              <p className="font-mono text-sm text-muted-foreground">{selectedBox.sku}</p>
              <div className="mt-3 flex flex-wrap gap-3">
                <div className="flex items-center gap-1.5 text-sm">
                  <Ruler className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {formatDimensions(
                      selectedBox.internalWidth,
                      selectedBox.internalHeight,
                      selectedBox.internalDepth,
                    )}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-sm">
                  <Box className="h-4 w-4 text-muted-foreground" />
                  <span>{formatVolume(selectedBox.internalVolume)}</span>
                </div>
                <div className="font-semibold text-primary">
                  {formatCurrency(selectedBox.price)}
                </div>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={onClear}>
              Trocar
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {onOpenGuide && (
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-display text-base font-semibold">Escolha a embalagem</h2>
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-muted-foreground"
            onClick={onOpenGuide}
          >
            <HelpCircle className="h-3.5 w-3.5" />
            Guia do Kit Maker
          </Button>
        </div>
      )}

      {/* Search + filter toggle */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar caixa ou embalagem..."
            value={searchValue}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button
          variant={hasActiveFilters ? 'default' : 'outline'}
          size="icon"
          aria-label="SlidersHorizontal"
          onClick={() => setFiltersOpen(!filtersOpen)}
          className="relative flex-shrink-0"
          title="Filtros avançados"
        >
          <SlidersHorizontal className="h-4 w-4" />
          {activeFilterCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
              {activeFilterCount}
            </span>
          )}
        </Button>
      </div>

      {boxTypeChips.length > 0 && (
        <div
          className="flex flex-wrap gap-2 overflow-x-auto pb-1"
          role="group"
          aria-label="Tipos de embalagem"
        >
          <Badge
            variant={!filters.boxType ? 'default' : 'outline'}
            className="cursor-pointer whitespace-nowrap px-3 py-1.5 text-xs font-medium"
            onClick={() => onFiltersChange({ ...filters, boxType: undefined })}
          >
            Todas
          </Badge>
          {boxTypeChips.map((type) => (
            <Badge
              key={type}
              variant={filters.boxType === type ? 'default' : 'outline'}
              className="cursor-pointer whitespace-nowrap px-3 py-1.5 text-xs font-medium"
              onClick={() => onFiltersChange({ ...filters, boxType: type })}
            >
              {type}
            </Badge>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Select value={sortMode} onValueChange={(v) => setSortMode(v as BoxSortMode)}>
          <SelectTrigger className="w-[180px]" aria-label="Ordenar">
            <SelectValue placeholder="Ordenar" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="score">Mais relevantes</SelectItem>
            <SelectItem value="price">Menor preço</SelectItem>
            <SelectItem value="occupancy">Maior ocupação</SelectItem>
          </SelectContent>
        </Select>
        <div className="ml-auto flex items-center gap-1 rounded-lg border p-0.5">
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

      {hasNoCompatibleBox && (
        <div className="flex flex-col items-start gap-2 rounded-lg border border-warning/30 bg-warning/10 p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm">
            Nenhuma caixa atende? Ajuste as quantidades do kit ou fale com o time comercial.
          </p>
          <Button
            variant="outline"
            size="sm"
            className="flex-shrink-0"
            onClick={() => navigate('/orcamentos')}
          >
            Falar com o comercial
          </Button>
        </div>
      )}

      {/* Advanced filters */}
      <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
        <CollapsibleContent>
          <Card className="border-dashed">
            <CardContent className="space-y-4 p-4">
              <div className="flex items-center justify-between">
                <h4 className="flex items-center gap-2 text-sm font-semibold">
                  <SlidersHorizontal className="h-4 w-4" />
                  Filtros Avançados
                </h4>
                {hasActiveFilters && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 gap-1 text-xs"
                    onClick={clearAdvancedFilters}
                  >
                    <X className="h-3 w-3" />
                    Limpar
                  </Button>
                )}
              </div>

              {/* Dimension ranges. The minimum is sufficient for most kit
                  calculations; the upper bound keeps large packaging out of
                  a constrained commercial search. */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">
                    Largura mín:{' '}
                    <span className="font-semibold text-foreground">{filters.minWidth || 0}cm</span>
                  </Label>
                  <Slider
                    min={0}
                    max={maxDims.width}
                    step={1}
                    value={[filters.minWidth || 0]}
                    onValueChange={([v]) =>
                      onFiltersChange({ ...filters, minWidth: v || undefined })
                    }
                  />
                  <Input
                    aria-label="Largura máxima em centímetros"
                    type="number"
                    min={0}
                    max={maxDims.width}
                    value={filters.maxWidth ?? ''}
                    onChange={(event) => {
                      const value = Number(event.target.value);
                      onFiltersChange({
                        ...filters,
                        maxWidth: Number.isFinite(value) && value > 0 ? value : undefined,
                      });
                    }}
                    placeholder="Máx."
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">
                    Altura mín:{' '}
                    <span className="font-semibold text-foreground">
                      {filters.minHeight || 0}cm
                    </span>
                  </Label>
                  <Slider
                    min={0}
                    max={maxDims.height}
                    step={1}
                    value={[filters.minHeight || 0]}
                    onValueChange={([v]) =>
                      onFiltersChange({ ...filters, minHeight: v || undefined })
                    }
                  />
                  <Input
                    aria-label="Altura máxima em centímetros"
                    type="number"
                    min={0}
                    max={maxDims.height}
                    value={filters.maxHeight ?? ''}
                    onChange={(event) => {
                      const value = Number(event.target.value);
                      onFiltersChange({
                        ...filters,
                        maxHeight: Number.isFinite(value) && value > 0 ? value : undefined,
                      });
                    }}
                    placeholder="Máx."
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">
                    Profundidade mín:{' '}
                    <span className="font-semibold text-foreground">{filters.minDepth || 0}cm</span>
                  </Label>
                  <Slider
                    min={0}
                    max={maxDims.depth}
                    step={1}
                    value={[filters.minDepth || 0]}
                    onValueChange={([v]) =>
                      onFiltersChange({ ...filters, minDepth: v || undefined })
                    }
                  />
                  <Input
                    aria-label="Profundidade máxima em centímetros"
                    type="number"
                    min={0}
                    max={maxDims.depth}
                    value={filters.maxDepth ?? ''}
                    onChange={(event) => {
                      const value = Number(event.target.value);
                      onFiltersChange({
                        ...filters,
                        maxDepth: Number.isFinite(value) && value > 0 ? value : undefined,
                      });
                    }}
                    placeholder="Máx."
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Faixa de preço (R$)</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      aria-label="Preço mínimo"
                      type="number"
                      min={0}
                      max={maxPrice}
                      value={filters.minPrice ?? ''}
                      onChange={(event) => {
                        const value = Number(event.target.value);
                        onFiltersChange({
                          ...filters,
                          minPrice: Number.isFinite(value) && value > 0 ? value : undefined,
                        });
                      }}
                      placeholder="Mín."
                    />
                    <Input
                      aria-label="Preço máximo"
                      type="number"
                      min={0}
                      max={maxPrice}
                      value={filters.maxPrice ?? ''}
                      onChange={(event) => {
                        const value = Number(event.target.value);
                        onFiltersChange({
                          ...filters,
                          maxPrice: Number.isFinite(value) && value > 0 ? value : undefined,
                        });
                      }}
                      placeholder="Máx."
                    />
                  </div>
                </div>

                {boxTypes.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Tipo de embalagem</Label>
                    <Select
                      value={filters.boxType || '_all'}
                      onValueChange={(value) =>
                        onFiltersChange({
                          ...filters,
                          boxType: value === '_all' ? undefined : value,
                        })
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Todos os tipos" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_all">Todos os tipos</SelectItem>
                        {boxTypes.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {finishes.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Acabamento</Label>
                    <Select
                      value={filters.finish || '_all'}
                      onValueChange={(value) =>
                        onFiltersChange({
                          ...filters,
                          finish: value === '_all' ? undefined : value,
                        })
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Todos os acabamentos" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_all">Todos os acabamentos</SelectItem>
                        {finishes.map((finish) => (
                          <SelectItem key={finish} value={finish}>
                            {finish}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              {/* Material filter — multi-seleção com contagem por material */}
              {materials.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Material</Label>
                  <div className="flex flex-wrap gap-x-4 gap-y-2">
                    {materials.map((m) => {
                      const count = materialCounts.get(m) ?? 0;
                      const checked = (filters.material ?? []).includes(m);
                      const checkboxId = `box-material-${m}`;
                      return (
                        <div key={m} className="flex items-center gap-2">
                          <Checkbox
                            id={checkboxId}
                            checked={checked}
                            disabled={count === 0 && !checked}
                            onCheckedChange={() => toggleMaterialFilter(m)}
                          />
                          <Label
                            htmlFor={checkboxId}
                            className={cn(
                              'cursor-pointer text-sm font-normal',
                              count === 0 && !checked && 'cursor-not-allowed text-muted-foreground',
                            )}
                          >
                            {m} <span className="text-xs text-muted-foreground">({count})</span>
                          </Label>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </CollapsibleContent>
      </Collapsible>

      {comparedRecommendations.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-primary/30 bg-primary/5 p-3">
          <p className="text-sm">
            <strong>{comparedRecommendations.length}</strong> caixa(s) selecionada(s) para
            comparação
          </p>
          <Button
            type="button"
            size="sm"
            className="gap-2"
            disabled={comparedRecommendations.length < 2}
            onClick={() => setComparisonOpen(true)}
          >
            <GitCompareArrows className="h-4 w-4" /> Comparar caixas
          </Button>
        </div>
      )}

      {/* Box list + focused preview */}
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_18rem]">
        <ScrollArea className="h-[50vh] pr-4">
          {isLoading ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {[1, 2, 3, 4].map((i) => (
                <BoxCardSkeleton key={i} />
              ))}
            </div>
          ) : errorMessage ? (
            <div className="py-12 text-center">
              <Package className="mx-auto mb-3 h-12 w-12 text-destructive" />
              <p className="font-medium">Não foi possível carregar as caixas</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Tente novamente antes de selecionar uma embalagem.
              </p>
              {onRetry && (
                <Button variant="outline" size="sm" className="mt-3" onClick={onRetry}>
                  Tentar novamente
                </Button>
              )}
            </div>
          ) : sortedRecommendations.length === 0 ? (
            <div className="py-12 text-center">
              <Package className="mx-auto mb-3 h-12 w-12 text-muted-foreground" />
              <p className="text-muted-foreground">Nenhuma caixa encontrada</p>
              <p className="text-sm text-muted-foreground">Tente ajustar os filtros</p>
              {hasActiveFilters && (
                <Button variant="link" size="sm" className="mt-2" onClick={clearAdvancedFilters}>
                  Limpar filtros
                </Button>
              )}
            </div>
          ) : (
            <div
              className={cn(
                viewMode === 'grid'
                  ? 'grid grid-cols-1 gap-4 md:grid-cols-2'
                  : 'flex flex-col gap-2',
              )}
            >
              {sortedRecommendations.map((recommendation, index) => {
                const box = recommendation.box;
                const shouldExplain = kitItems.length > 0;
                const statusLabel =
                  recommendation.status === 'compatible'
                    ? index === 0
                      ? 'Melhor ajuste estimado'
                      : 'Compatível por dados'
                    : recommendation.status === 'inconclusive'
                      ? 'Validação pendente'
                      : 'Não compatível';

                const isSelectable = recommendation.status !== 'incompatible';
                const checklist: string[] = [];
                if (shouldExplain) {
                  if (recommendation.status === 'compatible') {
                    checklist.push('Compatível com todos os itens');
                  }
                  const freeSpace = Math.max(0, 100 - recommendation.usagePercent);
                  checklist.push(`Espaço livre de ${Math.round(freeSpace)}%`);
                  if (recommendation.compatibility.confidence === 'verified') {
                    checklist.push('Material e dimensões verificados');
                  }
                }

                if (viewMode === 'list') {
                  return (
                    <Card
                      key={box.id}
                      onMouseEnter={() => setFocusedBoxId(box.id)}
                      className={cn(
                        'rounded-lg border-border/50 transition-all duration-200',
                        !isSelectable && 'opacity-75',
                      )}
                    >
                      <CardContent className="flex items-center gap-3 p-2.5">
                        <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-md bg-secondary">
                          {box.imageUrl ? (
                            <img
                              src={box.imageUrl}
                              alt={box.name}
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
                          <h4 className="truncate text-sm font-medium">{box.name}</h4>
                          <p className="truncate text-xs text-muted-foreground">
                            {formatDimensions(
                              box.internalWidth,
                              box.internalHeight,
                              box.internalDepth,
                            )}
                          </p>
                        </div>
                        {shouldExplain && (
                          <Badge
                            variant={
                              recommendation.status === 'incompatible' ? 'destructive' : 'secondary'
                            }
                            className={cn(
                              'hidden text-[10px] sm:inline-flex',
                              recommendation.status === 'compatible' &&
                                'bg-success/10 text-success',
                              recommendation.status === 'inconclusive' &&
                                'bg-warning/10 text-warning',
                            )}
                          >
                            {statusLabel}
                          </Badge>
                        )}
                        <span className="flex-shrink-0 text-sm font-semibold text-primary">
                          {formatCurrency(box.price)}
                        </span>
                        <FavoriteToggleButton productId={box.id} productName={box.name} />
                        <Button
                          type="button"
                          size="sm"
                          variant={recommendation.status === 'inconclusive' ? 'outline' : 'default'}
                          disabled={!isSelectable}
                          aria-label={`Selecionar caixa ${box.name}`}
                          onFocus={() => setFocusedBoxId(box.id)}
                          onClick={() => onSelect(box)}
                        >
                          {isSelectable ? 'Selecionar' : 'Incompatível'}
                        </Button>
                      </CardContent>
                    </Card>
                  );
                }

                return (
                  <Card
                    key={box.id}
                    onMouseEnter={() => setFocusedBoxId(box.id)}
                    className={cn(
                      'group rounded-xl border-border/50 transition-all duration-200 will-change-transform',
                      isSelectable &&
                        'focus-within:ring-2 focus-within:ring-primary/60 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg',
                      !isSelectable && 'opacity-75',
                    )}
                  >
                    <CardContent className="p-4">
                      <div className="flex gap-3">
                        <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg bg-secondary">
                          {box.imageUrl ? (
                            <img
                              src={box.imageUrl}
                              alt={box.name}
                              className="h-full w-full object-cover transition-transform group-hover:scale-105"
                              loading="lazy"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center">
                              <Package className="h-8 w-8 text-muted-foreground" />
                            </div>
                          )}
                          <FavoriteToggleButton
                            productId={box.id}
                            productName={box.name}
                            className="absolute right-0.5 top-0.5 h-6 w-6 bg-background/80 backdrop-blur-sm hover:bg-background"
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="truncate font-medium transition-colors group-hover:text-primary">
                            {box.name}
                          </h4>
                          <p className="mb-2 font-mono text-xs text-muted-foreground">{box.sku}</p>
                          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                            <span>
                              {formatDimensions(
                                box.internalWidth,
                                box.internalHeight,
                                box.internalDepth,
                              )}
                            </span>
                            <span>•</span>
                            <span>{formatVolume(box.internalVolume)}</span>
                            {box.material && (
                              <>
                                <span>•</span>
                                <span>{box.material}</span>
                              </>
                            )}
                          </div>
                          <p className="mt-1 font-semibold text-primary">
                            {formatCurrency(box.price)}
                          </p>
                          {shouldExplain && (
                            <div className="mt-3 space-y-2">
                              <div
                                className="h-1.5 overflow-hidden rounded-full bg-muted"
                                aria-label={`Ocupação estimada: ${Math.round(recommendation.usagePercent)}%`}
                              >
                                <div
                                  className={cn(
                                    'h-full rounded-full transition-[width]',
                                    recommendation.status === 'compatible' && 'bg-success',
                                    recommendation.status === 'inconclusive' && 'bg-warning',
                                    recommendation.status === 'incompatible' && 'bg-destructive',
                                  )}
                                  style={{
                                    width: `${Math.min(100, Math.max(0, recommendation.usagePercent))}%`,
                                  }}
                                />
                              </div>
                              <div className="flex flex-wrap items-center gap-1.5">
                                <Badge
                                  variant={
                                    recommendation.status === 'incompatible'
                                      ? 'destructive'
                                      : 'secondary'
                                  }
                                  className={cn(
                                    'text-[10px]',
                                    recommendation.status === 'compatible' &&
                                      'bg-success/10 text-success',
                                    recommendation.status === 'inconclusive' &&
                                      'bg-warning/10 text-warning',
                                  )}
                                  title={recommendation.compatibility.reason}
                                >
                                  {statusLabel}
                                </Badge>
                                <span className="text-[10px] text-muted-foreground">
                                  Ocupação estimada: {Math.round(recommendation.usagePercent)}%
                                </span>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {recommendation.compatibility.reason ||
                                  'Dimensões e ocupação verificadas.'}
                              </p>
                              {checklist.length > 0 && (
                                <ul className="space-y-0.5">
                                  {checklist.map((line) => (
                                    <li
                                      key={line}
                                      className="flex items-center gap-1.5 text-[11px] text-muted-foreground"
                                    >
                                      <Check className="h-3 w-3 flex-shrink-0 text-success" />
                                      {line}
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="mt-4 grid grid-cols-[auto_minmax(0,1fr)] gap-2">
                        <Button
                          type="button"
                          variant={comparisonIds.includes(box.id) ? 'secondary' : 'outline'}
                          size="icon"
                          aria-label={`${comparisonIds.includes(box.id) ? 'Remover' : 'Adicionar'} ${box.name} da comparação`}
                          onClick={() => toggleComparison(box.id)}
                        >
                          <GitCompareArrows className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant={recommendation.status === 'inconclusive' ? 'outline' : 'default'}
                          disabled={!isSelectable}
                          aria-label={`Selecionar caixa ${box.name}`}
                          onFocus={() => setFocusedBoxId(box.id)}
                          onClick={() => onSelect(box)}
                        >
                          {isSelectable ? 'Selecionar caixa' : 'Incompatível com a composição'}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </ScrollArea>
        <aside className="space-y-4 xl:sticky xl:top-24" aria-label="Composição e recomendação">
          {kitItems.length > 0 && (
            <div className="space-y-3 rounded-xl border bg-card p-4">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-display text-sm font-semibold">Composição atual</h3>
                {onEditItems && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 gap-1 px-2 text-xs"
                    onClick={onEditItems}
                  >
                    <Pencil className="h-3 w-3" />
                    Editar itens
                  </Button>
                )}
              </div>
              <div className="flex -space-x-2">
                {kitItems.slice(0, 4).map((item) => (
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
              <div className="space-y-1 text-xs text-muted-foreground">
                <div className="flex justify-between">
                  <span>Itens no kit</span>
                  <strong className="text-foreground">{kitItems.length}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Quantidade por kit</span>
                  <strong className="text-foreground">{kitItemsQuantity}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Volume estimado (itens)</span>
                  <strong className="text-foreground">{Math.round(kitItemsVolume)} cm³</strong>
                </div>
              </div>
            </div>
          )}

          {kitItems.length > 0 && bestRecommendation && (
            <div className="space-y-2 rounded-xl border border-primary/30 bg-primary/5 p-4">
              <div className="flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-primary" />
                <h3 className="font-display text-sm font-semibold">Nossa recomendação</h3>
              </div>
              <p className="text-sm font-medium">{bestRecommendation.box.name}</p>
              <ul className="space-y-0.5">
                {bestReasons.map((reason) => (
                  <li
                    key={reason}
                    className="flex items-center gap-1.5 text-xs text-muted-foreground"
                  >
                    <Check className="h-3 w-3 flex-shrink-0 text-success" />
                    {reason}
                  </li>
                ))}
              </ul>
              {comparedRecommendations.length >= 2 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full gap-1.5"
                  onClick={() => setComparisonOpen(true)}
                >
                  <GitCompareArrows className="h-3.5 w-3.5" />
                  Comparar caixas
                </Button>
              )}
            </div>
          )}

          {focusedRecommendation && (
            <div
              className="hidden h-fit overflow-hidden rounded-xl border bg-card xl:block"
              aria-label="Prévia da caixa"
            >
              <div className="aspect-[4/3] bg-muted">
                {focusedRecommendation.box.imageUrl ? (
                  <img
                    src={focusedRecommendation.box.imageUrl}
                    alt={focusedRecommendation.box.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <Eye className="h-10 w-10 text-muted-foreground" />
                  </div>
                )}
              </div>
              <div className="space-y-3 p-4">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-primary">
                    Prévia da caixa
                  </p>
                  <h3 className="mt-1 font-semibold">{focusedRecommendation.box.name}</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  {formatDimensions(
                    focusedRecommendation.box.internalWidth,
                    focusedRecommendation.box.internalHeight,
                    focusedRecommendation.box.internalDepth,
                  )}
                </p>
                {(focusedRecommendation.box.material || focusedRecommendation.box.finish) && (
                  <p className="text-xs text-muted-foreground">
                    {[focusedRecommendation.box.material, focusedRecommendation.box.finish]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                )}
                <p className="font-semibold text-primary">
                  {formatCurrency(focusedRecommendation.box.price)} / un
                </p>
                {kitItems.length === 0 && (
                  <p className="rounded-md bg-muted/50 p-2 text-[11px] text-muted-foreground">
                    Validação inteligente — ao selecionar a caixa, mostraremos apenas itens
                    compatíveis com suas dimensões.
                  </p>
                )}
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${Math.min(100, focusedRecommendation.usagePercent)}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Ocupação estimada: {Math.round(focusedRecommendation.usagePercent)}%
                </p>
                <Button
                  className="w-full"
                  disabled={focusedRecommendation.status === 'incompatible'}
                  onClick={() => onSelect(focusedRecommendation.box)}
                >
                  Usar esta caixa
                </Button>
              </div>
            </div>
          )}
        </aside>
      </div>
      <BoxComparisonDialog
        open={comparisonOpen}
        onOpenChange={setComparisonOpen}
        recommendations={comparedRecommendations}
        onSelect={onSelect}
      />
    </div>
  );
}
