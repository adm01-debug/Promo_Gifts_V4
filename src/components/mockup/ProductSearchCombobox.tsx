import * as React from 'react';
import { Check, ChevronsUpDown, Package, Search, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Clickable } from '@/components/shared/Clickable';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';

interface Product {
  id: string;
  name: string;
  sku: string;
  images?: unknown;
  primary_image_url?: string | null;
  og_image_url?: string | null;
}

interface ProductSearchComboboxProps {
  /** Resultados já vindos do servidor para o `search` atual — este componente não filtra localmente. */
  products: Product[];
  /** Termo de busca atual, controlado pelo caller (ex.: `m.productSearch`). */
  search: string;
  /** Chamado a cada digitação — o caller é responsável por debounce + fetch server-side. */
  onSearchChange: (search: string) => void;
  /** `true` enquanto o caller está buscando/carregando `products` para o `search` atual. */
  isSearching?: boolean;
  selectedProduct: Product | null;
  onSelect: (product: Product | null) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

export function ProductSearchCombobox({
  products,
  search,
  onSearchChange,
  isSearching = false,
  selectedProduct,
  onSelect,
  disabled = false,
  placeholder = 'Buscar produto...',
  className,
}: ProductSearchComboboxProps) {
  const [open, setOpen] = React.useState(false);

  // BUG-MAGICUP-PRODSEARCH-1 FIX (2026-08-17): filtragem local com Fuse.js sobre
  // `products` foi removida — `products` agora já vem filtrado pelo servidor
  // (ver useMagicUpState), então este componente só renderiza o que recebe.
  const filteredProducts = products;

  const getProductImage = (product: Product): string | null => {
    // Prioridade: primary_image_url (CF) > og_image_url > images[0]
    // @fix_version cors-bounds-xbz-2026-07
    // ANTI-REGRESSÃO: primary_image_url deve vir ANTES de og_image_url.
    // og_image_url pode ser URL XBZ (cdn.xbzbrindes.com.br) para 48 produtos ativos,
    // causando CORS error + CSP violation no bounds detector do mockup generator.
    if (product.primary_image_url) return product.primary_image_url;
    if (product.og_image_url) return product.og_image_url;
    if (!product.images) return null;
    const images = Array.isArray(product.images) ? product.images : [];
    return images.length > 0 ? String(images[0]) : null;
  };

  const handleSelect = (product: Product) => {
    onSelect(product);
    setOpen(false);
    onSearchChange('');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect(null);
    onSearchChange('');
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          data-testid="mockup-product-combobox-trigger"
          className={cn(
            'h-auto min-h-[42px] w-full justify-between px-3 py-2 font-normal',
            !selectedProduct && 'text-muted-foreground',
            className,
          )}
        >
          {selectedProduct ? (
            <div className="flex min-w-0 flex-1 items-center gap-3">
              {/* Product thumbnail */}
              <div className="h-8 w-8 flex-shrink-0 overflow-hidden rounded-md bg-muted">
                {(() => {
                  const img = getProductImage(selectedProduct);
                  if (img) {
                    return (
                      <img
                        src={img}
                        alt={selectedProduct.name}
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    );
                  }
                  return (
                    <div className="flex h-full w-full items-center justify-center">
                      <Package aria-hidden="true" className="h-4 w-4 text-muted-foreground" />
                    </div>
                  );
                })()}
              </div>

              {/* Product info */}
              <div className="min-w-0 flex-1 text-left">
                <p className="truncate text-sm font-medium text-foreground">
                  {selectedProduct.name}
                </p>
                <p className="text-xs text-muted-foreground">SKU: {selectedProduct.sku}</p>
              </div>

              {/* Clear button — asChild renders a <span>, not a nested <button>: the
                  trigger above is itself a <button> (PopoverTrigger asChild), and
                  <button> inside <button> is invalid HTML (hydration warning + browsers
                  reparent/auto-close nested buttons unpredictably). */}
              <Button
                asChild
                size="icon"
                variant="ghost"
                className="h-6 w-6 flex-shrink-0 hover:bg-destructive/10 hover:text-destructive"
              >
                <Clickable
                  as="span"
                  showFocusRing={false}
                  onClick={handleClear}
                  aria-label="Remover produto selecionado"
                  className="inline-flex h-full w-full items-center justify-center rounded-sm focus-visible:ring-1 focus-visible:ring-destructive/40"
                >
                  <X aria-hidden="true" className="h-3.5 w-3.5" />
                </Clickable>
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Search aria-hidden="true" className="h-4 w-4" />
              <span>{placeholder}</span>
            </div>
          )}
          <ChevronsUpDown aria-hidden="true" className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>

      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] p-0"
        align="start"
        sideOffset={-42}
      >
        <Command shouldFilter={false}>
          <CommandInput
            data-testid="mockup-product-search-input"
            placeholder="Buscar por nome ou SKU..."
            value={search}
            onValueChange={onSearchChange}
            autoFocus
          />
          <CommandList className="max-h-[400px]">
            {isSearching ? (
              <div className="py-6 text-center">
                <Loader2
                  aria-hidden="true"
                  className="mx-auto mb-2 h-6 w-6 animate-spin text-primary"
                />
                <p className="text-sm text-muted-foreground">Buscando...</p>
              </div>
            ) : (
              <>
                <CommandEmpty>
                  <div className="py-6 text-center">
                    <Package
                      aria-hidden="true"
                      className="mx-auto mb-2 h-8 w-8 text-muted-foreground opacity-50"
                    />
                    <p className="text-sm text-muted-foreground">Nenhum produto encontrado</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Tente buscar por nome ou SKU
                    </p>
                  </div>
                </CommandEmpty>

                <CommandGroup
                  heading={
                    search
                      ? `${filteredProducts.length} produto(s) encontrado(s)`
                      : 'Produtos recentes'
                  }
                >
                  {filteredProducts.map((product) => (
                    <CommandItem
                      key={product.id}
                      value={product.id}
                      data-testid={`mockup-product-option-${product.id}`}
                      onSelect={() => handleSelect(product)}
                      className="flex items-center gap-3 py-2"
                    >
                      {/* Checkbox indicator */}
                      <div
                        className={cn(
                          'flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border',
                          selectedProduct?.id === product.id
                            ? 'border-primary bg-primary'
                            : 'border-muted-foreground/30',
                        )}
                      >
                        {selectedProduct?.id === product.id && (
                          <Check aria-hidden="true" className="h-3 w-3 text-primary-foreground" />
                        )}
                      </div>

                      {/* Product thumbnail */}
                      <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-md bg-muted">
                        {(() => {
                          const img = getProductImage(product);
                          if (img) {
                            return (
                              <img
                                src={img}
                                alt={product.name}
                                className="h-full w-full object-cover"
                                loading="lazy"
                              />
                            );
                          }
                          return (
                            <div className="flex h-full w-full items-center justify-center">
                              <Package
                                aria-hidden="true"
                                className="h-5 w-5 text-muted-foreground"
                              />
                            </div>
                          );
                        })()}
                      </div>

                      {/* Product info */}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{product.name}</p>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="px-1.5 py-0 text-[10px]">
                            {product.sku}
                          </Badge>
                        </div>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
