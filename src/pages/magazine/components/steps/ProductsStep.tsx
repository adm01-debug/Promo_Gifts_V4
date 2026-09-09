/**
 * Step 2 — Produtos (Blue Premium §27): catálogo amplo (busca + ordenação +
 * categorias + filtros em popover + multi-select) e trilho "Na revista"
 * (template ativo, contadores, lista dos itens com troca de variação).
 * O preview A4 não é coluna permanente nesta etapa — abre pelo drawer.
 */

import { useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { paginateMagazine } from '../../pagination';
import { productToSnapshot } from '@/services/magazineService';
import {
  Box,
  Check,
  ChevronDown,
  FileText,
  Filter,
  Plus,
  Search,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useProducts } from '@/hooks/products/useProducts';
import { cn } from '@/lib/utils';
import type { Product } from '@/types/product-catalog';
import type { Magazine, MagazineItem } from '@/types/magazine';
import { getTemplate } from '../templates/TemplateRegistry';
import { formatPrice, resolveItemImage } from '../templates/shared';
import { VariantColorSelect } from '../VariantColorSelect';
import { MagazinePageRenderer } from '../MagazinePageRenderer';
import {
  PG_BTN,
  PG_BTN_OUTLINE,
  PG_INPUT,
  PG_PANEL,
  PG_SECTION_TITLE,
  PG_SELECT,
  PG_SUBTITLE,
  pgPill,
} from '../../pg';

interface Props {
  magazine: Magazine;
  onAdd: (products: Product[]) => Promise<void> | void;
  onRemove: (itemId: string) => Promise<void> | void;
  onUpdateItem: (itemId: string, patch: Partial<MagazineItem>) => Promise<void> | void;
  /** Leva à etapa Design (botão "Trocar template" do trilho). */
  onGoToDesign?: () => void;
}

type SortMode = 'name' | 'price-asc' | 'price-desc' | 'relevance';

const FAMILY_LABEL: Record<'catalog' | 'corporate' | 'editorial', string> = {
  editorial: 'Editorial',
  catalog: 'Catálogo',
  corporate: 'Corporativo',
};

const MAX_VISIBLE_CATEGORIES = 7;

function productPrice(p: Product): number | undefined {
  return p.sale_price ?? p.price;
}

const COVER_PAGE = { index: 0, kind: 'cover' as const, items: [] as never[] };

export function ProductsStep({ magazine, onAdd, onRemove, onUpdateItem, onGoToDesign }: Props) {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Map<string, Product>>(new Map());
  const adding = useRef(false);
  const [isAdding, setIsAdding] = useState(false);
  const [category, setCategory] = useState<string | null>(null);
  const [onlyPersonalizable, setOnlyPersonalizable] = useState(false);
  const [hideAdded, setHideAdded] = useState(true);
  const [sort, setSort] = useState<SortMode>('relevance');
  const [confirmClear, setConfirmClear] = useState(false);

  const { data: products = [], isLoading } = useProducts({ search: query, limit: 80 });

  const items = useMemo(() => magazine.items ?? [], [magazine.items]);

  const alreadyAdded = useMemo(() => new Set(items.map((i) => i.productId)), [items]);

  const categoryOptions = useMemo(() => {
    const set = new Map<string, number>();
    for (const p of products) {
      const c = p.category_name ?? null;
      if (!c) continue;
      set.set(c, (set.get(c) ?? 0) + 1);
    }
    return [...set.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [products]);

  const filtered = useMemo(() => {
    const out = products.filter((p) => {
      if (hideAdded && alreadyAdded.has(p.id)) return false;
      if (category && p.category_name !== category) return false;
      if (onlyPersonalizable && !p.hasPersonalization) return false;
      return true;
    });
    if (sort === 'relevance') return out;
    return [...out].sort((a, b) => {
      if (sort === 'name') return a.name.localeCompare(b.name, 'pt-BR');
      const pa = productPrice(a) ?? 0;
      const pb = productPrice(b) ?? 0;
      return sort === 'price-asc' ? pa - pb : pb - pa;
    });
  }, [products, hideAdded, alreadyAdded, category, onlyPersonalizable, sort]);

  const toggle = (product: Product) => {
    const id = product.id;
    setSelected((prev) => {
      const next = new Map(prev);
      if (next.has(id)) next.delete(id);
      else next.set(id, product);
      return next;
    });
  };

  const addSelection = async (toAdd: Product[]) => {
    if (adding.current || toAdd.length === 0) return;
    adding.current = true;
    setIsAdding(true);
    try {
      await onAdd(toAdd);
      setSelected((prev) => {
        const next = new Map(prev);
        for (const product of toAdd) next.delete(product.id);
        return next;
      });
      toast.success('Produtos adicionados à revista.');
    } catch {
      toast.error('Não foi possível adicionar. Sua seleção foi preservada.');
    } finally {
      adding.current = false;
      setIsAdding(false);
    }
  };
  const handleAdd = () =>
    addSelection([...selected.values()].filter((p) => !alreadyAdded.has(p.id)));
  const handleQuickAdd = (p: Product) => addSelection([p]);

  const clearFilters = () => {
    setCategory(null);
    setOnlyPersonalizable(false);
    setQuery('');
    setHideAdded(true);
  };

  const clearAll = async () => {
    try {
      for (const it of items) await onRemove(it.id);
      setConfirmClear(false);
    } catch {
      toast.error(
        'A limpeza foi interrompida. Confira os produtos restantes antes de tentar novamente.',
      );
    }
  };

  const template = getTemplate(magazine.templateId);
  const perPage = template.productsPerPage;
  const totalItems = items.length;
  const estimatedPages = paginateMagazine(magazine).length;
  const pendingItems: MagazineItem[] = [...selected.values()]
    .filter((p) => !alreadyAdded.has(p.id))
    .map((p, index) => ({
      id: `pending-${p.id}`,
      productId: p.id,
      productSnapshot: productToSnapshot(p),
      variantColorName: null,
      position: totalItems + index,
      pageNumber: null,
      overrides: {},
    }));
  const previewPages = paginateMagazine({ ...magazine, items: [...items, ...pendingItems] }).length;
  const activeFilterCount = (onlyPersonalizable ? 1 : 0) + (hideAdded ? 0 : 1);

  const visibleCategories = categoryOptions.slice(0, MAX_VISIBLE_CATEGORIES);
  const overflowCategories = categoryOptions.slice(MAX_VISIBLE_CATEGORIES);
  const categoryInOverflow = category !== null && overflowCategories.some(([c]) => c === category);

  const coverPage = COVER_PAGE;

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(320px,380px)]">
      {/* Catálogo */}
      <section
        className={cn(PG_PANEL, 'flex min-w-0 flex-col')}
        aria-labelledby="products-catalog-title"
      >
        <header className="flex flex-wrap items-start justify-between gap-3 px-5 pt-5">
          <div>
            <h2 id="products-catalog-title" className={PG_SECTION_TITLE}>
              Catálogo de produtos
            </h2>
            <p className={cn(PG_SUBTITLE, 'mt-1')}>
              Selecione os produtos que farão parte da sua revista.
            </p>
          </div>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  PG_BTN_OUTLINE,
                  'h-11 min-h-0 rounded-md border-primary/40 px-4 text-[14px] text-primary hover:border-primary hover:bg-primary/10',
                )}
                aria-label="Filtros do catálogo"
              >
                <Filter className="mr-2 h-4 w-4" aria-hidden />
                Filtros
                {activeFilterCount > 0 && (
                  <span className="ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-md bg-primary px-1.5 text-[11px] font-semibold text-primary-foreground">
                    {activeFilterCount}
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent
              align="end"
              className="pg-module w-72 space-y-3 rounded-lg border-border bg-popover p-3 shadow-lg"
            >
              <label className="flex items-center justify-between gap-3 text-[13px] text-foreground">
                <span className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-muted-foreground" aria-hidden />
                  Somente personalizáveis
                </span>
                <Switch
                  checked={onlyPersonalizable}
                  onCheckedChange={setOnlyPersonalizable}
                  aria-label="Somente personalizáveis"
                />
              </label>
              <label className="flex items-center justify-between gap-3 text-[13px] text-foreground">
                <span>Ocultar já adicionados</span>
                <Switch
                  checked={hideAdded}
                  onCheckedChange={setHideAdded}
                  aria-label="Ocultar produtos já adicionados"
                />
              </label>
              {(category || onlyPersonalizable || query || !hideAdded) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="h-8 w-full rounded-md text-xs"
                >
                  Limpar filtros
                </Button>
              )}
            </PopoverContent>
          </Popover>
        </header>

        <div className="flex flex-wrap items-center gap-3 px-5 pt-4">
          <div className="relative min-w-[240px] flex-1">
            <Search
              className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar produtos por nome, SKU ou categoria…"
              className={cn(PG_INPUT, 'h-11 pl-10')}
              data-testid="magazine-product-search"
              aria-label="Buscar produtos"
            />
          </div>
          <Select value={sort} onValueChange={(v) => setSort(v as SortMode)}>
            <SelectTrigger
              className={cn(PG_SELECT, 'h-11 w-[200px]')}
              aria-label="Ordenar produtos"
            >
              <span className="flex min-w-0 flex-col items-start gap-0.5 text-left">
                <span className="text-[10px] leading-none text-muted-foreground">Ordenar por</span>
                <span className="text-[13px] font-medium leading-none text-foreground">
                  <SelectValue />
                </span>
              </span>
            </SelectTrigger>
            <SelectContent className="pg-module rounded-lg border-border">
              <SelectItem value="relevance">Mais relevantes</SelectItem>
              <SelectItem value="price-asc">Menor preço</SelectItem>
              <SelectItem value="price-desc">Maior preço</SelectItem>
              <SelectItem value="name">Nome A–Z</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Categorias */}
        <div
          className="flex flex-wrap items-center gap-2 px-5 pt-3"
          role="group"
          aria-label="Filtrar por categoria"
        >
          <button
            type="button"
            onClick={() => setCategory(null)}
            aria-pressed={category === null}
            className={pgPill(category === null, 'h-10')}
          >
            Todos ({products.length})
          </button>
          {visibleCategories.map(([cat, count]) => {
            const active = category === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(active ? null : cat)}
                className={pgPill(active, 'h-10')}
                aria-pressed={active}
              >
                {cat}{' '}
                <span className={cn(active ? 'opacity-80' : 'text-muted-foreground')}>
                  ({count})
                </span>
              </button>
            );
          })}
          {overflowCategories.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className={pgPill(categoryInOverflow, 'h-10')}
                  aria-label="Mais categorias"
                >
                  {categoryInOverflow ? category : 'Mais'}
                  <ChevronDown className="h-3.5 w-3.5" aria-hidden />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="start"
                className="pg-module max-h-72 w-56 overflow-y-auto rounded-lg border-border bg-popover p-1.5"
              >
                {overflowCategories.map(([cat, count]) => (
                  <DropdownMenuItem
                    key={cat}
                    onSelect={() => setCategory(category === cat ? null : cat)}
                    className="h-9 justify-between rounded-md text-[13px]"
                  >
                    <span className="truncate">{cat}</span>
                    <span className="text-muted-foreground">{count}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Grid de produtos */}
        <div className="max-h-[calc(100vh-420px)] min-h-[420px] overflow-y-auto px-5 py-4">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 2xl:grid-cols-4">
            {filtered.map((p) => {
              const isIn = alreadyAdded.has(p.id);
              const isSel = selected.has(p.id);
              const image = p.primary_image_url || p.image_url;
              const swatches = (p.colors ?? []).slice(0, 3);
              const extraSwatches = Math.max(0, (p.colors ?? []).length - swatches.length);
              return (
                <div
                  key={p.id}
                  className={cn(
                    'group relative flex flex-col overflow-hidden rounded-lg border bg-card-elevated transition-[border-color,box-shadow] duration-150',
                    isSel
                      ? 'border-primary ring-2 ring-primary/40'
                      : isIn
                        ? 'border-border opacity-40'
                        : 'border-border hover:border-border-strong',
                  )}
                >
                  <button
                    type="button"
                    onClick={() => !isIn && toggle(p)}
                    disabled={isIn}
                    aria-pressed={isSel}
                    aria-label={`${isSel ? 'Desmarcar' : 'Selecionar'} ${p.name}`}
                    className="flex flex-col text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary disabled:cursor-not-allowed"
                  >
                    <div className="relative aspect-square w-full overflow-hidden bg-neutral-100">
                      {image ? (
                        <img
                          src={image}
                          alt={p.name}
                          className="h-full w-full object-contain p-4"
                          loading="lazy"
                        />
                      ) : null}
                      <span
                        className={cn(
                          'absolute right-2.5 top-2.5 flex h-7 w-7 items-center justify-center rounded-full border-2 transition-colors duration-150',
                          isSel
                            ? 'border-primary bg-primary text-primary-foreground'
                            : 'border-border-strong bg-background/85 text-transparent',
                        )}
                        aria-hidden
                      >
                        <Check className="h-4 w-4" />
                      </span>
                      {p.hasPersonalization && (
                        <span className="absolute bottom-2 left-2 inline-flex h-5 items-center gap-1 rounded-sm bg-background/85 px-1.5 text-[10px] font-medium text-foreground">
                          <Sparkles className="h-2.5 w-2.5" aria-hidden /> Personalizável
                        </span>
                      )}
                    </div>
                    <div className="px-3 pt-2.5">
                      <div className="line-clamp-1 text-[14px] font-semibold text-foreground">
                        {p.name}
                      </div>
                      <div className="text-[12px] text-muted-foreground">SKU {p.sku}</div>
                    </div>
                  </button>
                  <div className="flex items-center justify-between gap-2 px-3 pb-3 pt-2">
                    <span className="text-[14px] font-semibold text-primary">
                      {formatPrice(productPrice(p))}
                    </span>
                    <span className="flex items-center gap-1" aria-hidden>
                      {swatches.map((c) => (
                        <span
                          key={c.name}
                          className="h-3.5 w-3.5 rounded-full ring-1 ring-border-strong"
                          style={{ background: c.hex }}
                          title={c.name}
                        />
                      ))}
                      {extraSwatches > 0 && (
                        <span className="text-[10px] text-muted-foreground">+{extraSwatches}</span>
                      )}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleQuickAdd(p)}
                      disabled={isIn}
                      aria-label={`Adicionar ${p.name} à revista`}
                      className="flex h-8 w-8 items-center justify-center rounded-md border border-border bg-background text-foreground transition-colors duration-150 hover:border-primary hover:bg-primary/10 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Plus className="h-4 w-4" aria-hidden />
                    </button>
                  </div>
                </div>
              );
            })}
            {!isLoading && filtered.length === 0 && (
              <div className="col-span-full rounded-md border border-dashed border-border-strong p-8 text-center text-[13px] text-muted-foreground">
                Nenhum produto corresponde aos filtros.
              </div>
            )}
            {isLoading &&
              filtered.length === 0 &&
              Array.from({ length: 8 }, (_, i) => (
                <div
                  key={i}
                  className="animate-pulse overflow-hidden rounded-lg border border-border bg-card-elevated"
                  aria-hidden
                >
                  <div className="aspect-square bg-muted" />
                  <div className="space-y-2 p-3">
                    <div className="h-3.5 w-3/4 rounded-sm bg-muted" />
                    <div className="h-3 w-1/3 rounded-sm bg-muted" />
                  </div>
                </div>
              ))}
          </div>
        </div>

        <footer className="flex items-center justify-between gap-3 border-t border-border px-5 py-3">
          <span className="text-[12px] text-muted-foreground" aria-live="polite">
            {isLoading
              ? 'Carregando…'
              : `${filtered.length} produto${filtered.length === 1 ? '' : 's'} · ${selected.size} selecionado${selected.size === 1 ? '' : 's'}`}
          </span>
          <Button
            size="sm"
            onClick={handleAdd}
            disabled={selected.size === 0 || isAdding}
            className={cn(PG_BTN, 'h-10 min-h-0 rounded-md px-4 text-[13px]')}
            data-testid="magazine-product-add-btn"
          >
            <Plus className="mr-1.5 h-4 w-4" aria-hidden />
            Adicionar {selected.size > 0 ? `(${selected.size})` : ''}
          </Button>
        </footer>
      </section>

      {/* Na revista */}
      <aside
        className={cn(PG_PANEL, 'flex min-w-0 flex-col p-4 xl:sticky xl:top-2 xl:self-start')}
        aria-labelledby="products-selected-title"
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2 id="products-selected-title" className={PG_SECTION_TITLE}>
              Na revista
            </h2>
            <p className={cn(PG_SUBTITLE, 'mt-1')}>Produtos selecionados para esta edição.</p>
          </div>
          {items.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setConfirmClear(true)}
              className="h-8 min-h-0 rounded-md px-2 text-[12px] text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="mr-1.5 h-3.5 w-3.5" aria-hidden /> Limpar tudo
            </Button>
          )}
        </div>

        <div className="mt-4 flex items-center gap-3 rounded-lg border border-border bg-card-elevated p-3">
          <div
            className="aspect-[3/4] w-14 shrink-0 overflow-hidden rounded-sm bg-neutral-100"
            aria-hidden
          >
            <MagazinePageRenderer
              magazine={magazine}
              page={coverPage}
              totalPages={1}
              fitContainer
            />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[14px] font-semibold text-foreground">{template.name}</div>
            <div className="text-[12px] text-muted-foreground">
              {FAMILY_LABEL[template.family]} · {perPage} produto{perPage === 1 ? '' : 's'} por
              página
            </div>
          </div>
          {onGoToDesign && (
            <Button
              variant="outline"
              size="sm"
              onClick={onGoToDesign}
              className={cn(
                PG_BTN_OUTLINE,
                'h-9 min-h-0 shrink-0 rounded-md border-primary/40 px-3 text-[12px] text-primary hover:border-primary hover:bg-primary/10',
              )}
            >
              Trocar template
            </Button>
          )}
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3" aria-live="polite">
          <div className="flex items-center gap-3 rounded-lg border border-border bg-card-elevated p-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
              <Box className="h-5 w-5" aria-hidden />
            </div>
            <div className="min-w-0">
              <div className="font-display text-[20px] font-bold tabular-nums leading-none text-foreground">
                {totalItems}
              </div>
              <div className="mt-1 text-[11px] text-muted-foreground">produtos selecionados</div>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-lg border border-border bg-card-elevated p-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
              <FileText className="h-5 w-5" aria-hidden />
            </div>
            <div className="min-w-0">
              <div className="font-display text-[20px] font-bold tabular-nums leading-none text-foreground">
                ~ {estimatedPages}
              </div>
              <div className="mt-1 text-[11px] text-muted-foreground">
                {selected.size > 0
                  ? `→ ${previewPages} com +${selected.size}`
                  : 'páginas no layout'}
              </div>
            </div>
          </div>
        </div>

        <ul className="m-0 mt-3 flex max-h-[calc(100vh-560px)] min-h-[160px] list-none flex-col gap-2 overflow-y-auto p-0 pr-1">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex items-center gap-3 rounded-lg border border-border bg-card-elevated p-2"
            >
              <div className="h-12 w-12 shrink-0 overflow-hidden rounded-sm bg-neutral-100">
                <img
                  src={resolveItemImage(item)}
                  alt={item.productSnapshot.name}
                  className="h-full w-full object-contain p-1"
                />
              </div>
              <div className="min-w-0 flex-1">
                <div className="line-clamp-1 text-[13px] font-semibold text-foreground">
                  {item.productSnapshot.name}
                </div>
                <div className="text-[11px] text-muted-foreground">
                  SKU {item.productSnapshot.sku}
                </div>
                <VariantColorSelect
                  item={item}
                  onChange={(colorName) => {
                    void Promise.resolve(
                      onUpdateItem(item.id, { variantColorName: colorName }),
                    ).catch(() => toast.error('Não foi possível alterar a variante.'));
                  }}
                />
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  void Promise.resolve(onRemove(item.id)).catch(() =>
                    toast.error('Não foi possível remover o produto.'),
                  );
                }}
                aria-label={`Remover ${item.productSnapshot.name}`}
                className="h-8 min-h-0 w-8 min-w-0 shrink-0 rounded-md text-muted-foreground hover:bg-background hover:text-foreground"
              >
                <X className="h-4 w-4" aria-hidden />
              </Button>
            </li>
          ))}
          {items.length === 0 && (
            <li className="rounded-md border border-dashed border-border-strong px-4 py-8 text-center text-[12px] text-muted-foreground">
              Selecione produtos ao lado e clique em Adicionar.
            </li>
          )}
        </ul>

        {items.length > 0 && (
          <div
            role="status"
            className="mt-3 flex items-center gap-3 rounded-lg border border-success/25 bg-success/10 px-3 py-2.5"
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-success text-success-foreground">
              <Check className="h-4 w-4" aria-hidden />
            </span>
            <div>
              <div className="text-[13px] font-semibold text-success">Produtos na revista</div>
              <div className="text-[11px] text-muted-foreground">
                Confira os itens desta edição na lista acima.
              </div>
            </div>
          </div>
        )}
      </aside>

      <AlertDialog open={confirmClear} onOpenChange={setConfirmClear}>
        <AlertDialogContent className="pg-module rounded-2xl border-border bg-popover">
          <AlertDialogHeader>
            <AlertDialogTitle>Remover todos os produtos?</AlertDialogTitle>
            <AlertDialogDescription>
              Os {items.length} produtos serão removidos desta revista. Você pode adicioná-los
              novamente pelo catálogo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className={cn(PG_BTN, 'rounded-md')}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={clearAll}
              className={cn(
                PG_BTN,
                'rounded-md bg-destructive text-destructive-foreground hover:bg-destructive/90',
              )}
            >
              Limpar tudo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
