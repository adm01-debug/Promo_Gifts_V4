/**
 * Simulador de volumes de frete — Bloco F (etapas 54-57).
 *
 * Busca produtos do catálogo (mesma busca do orçamento), monta uma lista local
 * de itens com quantidade editável e calcula o plano de volumes com o motor de
 * frete (`useFreightPlan`). CEP de destino fica guardado no estado para o
 * bloco I (cotação); nesta fase só exibe "Cotação: disponível em breve".
 *
 * "Levar para orçamento" grava um rascunho local (`quote_builder_autosave`)
 * com os itens e o `freightMixMode` escolhido e navega para o builder — o
 * rascunho é restaurado pelo fluxo normal de autosave do orçamento.
 */
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Package, Plus, Trash2, X, ArrowRight } from 'lucide-react';
import { PageSEO } from '@/components/seo/PageSEO';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { QuoteBuilderProductSearch } from '@/components/quotes/QuoteBuilderProductSearch';
import { FreightPlanPanel } from '@/components/freight-plan/FreightPlanPanel';
import { MixModeSelector, type MixModeProduct } from '@/components/freight-plan/MixModeSelector';
import { useFreightPlan, type FreightPlanLine } from '@/hooks/freight/useFreightPlan';
import { useDebounce } from '@/hooks/common';
import { loadQuoteSearchProducts, type Product } from '@/hooks/quotes/useQuoteBuilderState.helpers';
import { DEFAULT_FREIGHT_MIX_MODE } from '@/hooks/quotes/useFreightPlanOptions';
import { getCdnUrl } from '@/utils/image-utils';
import { formatCurrency } from '@/lib/kit-builder';
import type { MixMode } from '@/lib/freight';

const QUOTE_BUILDER_AUTOSAVE_KEY = 'quote_builder_autosave';
const AUTOSAVE_SCHEMA_VERSION = 2;
const CEP_RE = /^\d{5}-\d{3}$/;

interface SimulatorItem {
  product_id: string;
  product_name: string;
  product_sku: string;
  product_image: string | null;
  product_price: number;
  quantity: number;
}

function maskCep(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

export default function FreightSimulatorPage() {
  const navigate = useNavigate();

  // Busca de produtos (etapa 55)
  const [searchOpen, setSearchOpen] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [selectedProductForColor, setSelectedProductForColor] = useState<Product | null>(null);
  const debouncedProductSearch = useDebounce(productSearch, 400);

  const { data: products = [] } = useQuery({
    queryKey: ['quote-products-promobrind-search', debouncedProductSearch],
    queryFn: () => loadQuoteSearchProducts(debouncedProductSearch),
    enabled: searchOpen,
    staleTime: 5 * 60 * 1000,
    placeholderData: (previousData) => previousData,
  });

  const filteredProducts = useMemo(() => products.filter((p) => p.price > 0), [products]);

  // Lista local de itens
  const [items, setItems] = useState<SimulatorItem[]>([]);

  const addProduct = (p: Product) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.product_id === p.id);
      if (existing) {
        return prev.map((i) => (i.product_id === p.id ? { ...i, quantity: i.quantity + 1 } : i));
      }
      return [
        ...prev,
        {
          product_id: p.id,
          product_name: p.name,
          product_sku: p.sku,
          product_image: p.images?.[0] ?? null,
          product_price: p.price,
          quantity: 1,
        },
      ];
    });
    setSearchOpen(false);
    setProductSearch('');
    setSelectedProductForColor(null);
    toast.success(`"${p.name}" adicionado ao simulador`);
  };

  const updateQuantity = (productId: string, quantity: number) => {
    setItems((prev) =>
      prev.map((i) => (i.product_id === productId ? { ...i, quantity: Math.max(1, quantity) } : i)),
    );
  };

  const removeItem = (productId: string) => {
    setItems((prev) => prev.filter((i) => i.product_id !== productId));
  };

  const clearItems = () => setItems([]);

  // Frete (etapa 56)
  const [mixMode, setMixMode] = useState<MixMode>(DEFAULT_FREIGHT_MIX_MODE);
  const [kitQuantity, setKitQuantity] = useState(1);
  const [cep, setCep] = useState('');
  const cepInvalid = cep.length > 0 && !CEP_RE.test(cep);

  const lines = useMemo<FreightPlanLine[]>(
    () =>
      items.map((i) => ({
        productId: i.product_id,
        name: i.product_name,
        quantity: i.quantity,
      })),
    [items],
  );
  const {
    plan,
    products: productRows,
    unavailable,
    isLoading,
    error,
  } = useFreightPlan({
    items: lines,
    mixMode,
    kitQuantity,
    origin: 'simulator',
  });

  const mixProducts = useMemo<MixModeProduct[]>(
    () =>
      lines.flatMap((line) =>
        line.productId
          ? [
              {
                id: line.productId,
                name: productRows.get(line.productId)?.name ?? line.name ?? 'Produto',
                shipsSeparately: productRows.get(line.productId)?.ships_separately === true,
              },
            ]
          : [],
      ),
    [lines, productRows],
  );

  // Levar para orçamento (etapa 57)
  const carryToQuote = () => {
    if (items.length === 0) {
      toast.warning('Adicione ao menos um produto antes de levar para o orçamento.');
      return;
    }
    const draft = {
      clientId: null,
      contactId: null,
      contactInfo: null,
      companyInfo: null,
      items: items.map((i) => ({
        product_id: i.product_id,
        product_name: i.product_name,
        product_sku: i.product_sku,
        product_image_url: i.product_image || undefined,
        quantity: i.quantity,
        unit_price: i.product_price,
        personalizations: [],
      })),
      discountType: null,
      discountValue: null,
      negotiationMarkup: null,
      paymentMethod: null,
      paymentTerms: null,
      deliveryTime: null,
      shippingType: null,
      shippingCost: null,
      freightMixMode: mixMode,
      showFreightPlanToClient: false,
      notes: null,
      validUntil: '',
    };
    try {
      localStorage.setItem(
        QUOTE_BUILDER_AUTOSAVE_KEY,
        JSON.stringify({
          version: AUTOSAVE_SCHEMA_VERSION,
          data: draft,
          savedAt: new Date().toISOString(),
        }),
      );
    } catch {
      toast.error('Não foi possível salvar o rascunho. Tente novamente.');
      return;
    }
    toast.success(`${items.length} item(ns) levados para o orçamento com o plano de volumes.`, {
      description: 'O plano de volumes aparece no orçamento; confira o cliente e finalize.',
    });
    navigate('/orcamentos/novo');
  };

  return (
    <>
      <PageSEO
        title="Simulador de Volumes de Frete"
        description="Simule caixas, pesos e volumes do frete antes de fechar o orçamento."
        path="/simulador-frete"
      />
      <div className="mx-auto w-full max-w-[1920px] animate-fade-in space-y-3 px-3 py-3 pb-24 sm:space-y-4 sm:px-4 sm:py-4 md:pb-6 lg:px-6 xl:px-8">
        <div className="flex flex-col gap-1">
          <h1
            data-testid="page-title-simulador-frete"
            className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl"
          >
            Simulador de Volumes de Frete
          </h1>
          <p className="max-w-lg text-sm text-muted-foreground">
            Monte a lista de produtos e veja quantas caixas, peso e volume o pedido vai ocupar antes
            de enviar a proposta.
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
          <div className="space-y-4">
            <Card>
              <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Package className="h-4 w-4 text-primary" />
                  Itens
                </CardTitle>
                <div className="flex items-center gap-2">
                  {items.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearItems}
                      data-testid="simulator-clear-items"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Limpar tudo
                    </Button>
                  )}
                  <Button
                    size="sm"
                    onClick={() => setSearchOpen(true)}
                    data-testid="simulator-open-search"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Adicionar produto
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {items.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 py-10 text-center text-muted-foreground">
                    <Package className="h-10 w-10 opacity-30" />
                    <p className="text-sm">
                      Nenhum produto ainda. Adicione para calcular o plano de volumes.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {items.map((item) => (
                      <div
                        key={item.product_id}
                        data-testid={`simulator-item-${item.product_id}`}
                        className="flex items-center gap-3 rounded-lg border bg-muted/30 p-2.5"
                      >
                        {item.product_image ? (
                          <img
                            src={getCdnUrl(item.product_image, 'thumbnail')}
                            alt={item.product_name}
                            className="h-11 w-11 shrink-0 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-muted">
                            <Package className="h-5 w-5 text-muted-foreground" />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{item.product_name}</p>
                          <p className="font-mono text-[11px] text-muted-foreground">
                            {item.product_sku} · {formatCurrency(item.product_price)}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <Label htmlFor={`qty-${item.product_id}`} className="sr-only">
                            Quantidade
                          </Label>
                          <Input
                            id={`qty-${item.product_id}`}
                            type="number"
                            min={1}
                            value={item.quantity}
                            onChange={(e) =>
                              updateQuantity(item.product_id, Number(e.target.value))
                            }
                            className="h-9 w-16 text-center"
                            data-testid={`simulator-qty-${item.product_id}`}
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9"
                            onClick={() => removeItem(item.product_id)}
                            aria-label={`Remover ${item.product_name}`}
                            data-testid={`simulator-remove-${item.product_id}`}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Plano de volumes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="simulator-kit-quantity">Quantidade de kits</Label>
                    <Input
                      id="simulator-kit-quantity"
                      type="number"
                      min={1}
                      value={kitQuantity}
                      onChange={(e) => setKitQuantity(Math.max(1, Number(e.target.value)))}
                      data-testid="simulator-kit-quantity"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="simulator-cep">CEP de destino</Label>
                    <Input
                      id="simulator-cep"
                      inputMode="numeric"
                      placeholder="00000-000"
                      value={cep}
                      onChange={(e) => setCep(maskCep(e.target.value))}
                      aria-invalid={cepInvalid}
                      data-testid="simulator-cep"
                    />
                    {cepInvalid && (
                      <p
                        className="text-xs font-medium text-destructive"
                        data-testid="simulator-cep-error"
                      >
                        CEP inválido. Use o formato 00000-000.
                      </p>
                    )}
                    {!cepInvalid && cep.length > 0 && (
                      <p className="text-xs text-muted-foreground" data-testid="simulator-cep-hint">
                        Cotação: disponível em breve.
                      </p>
                    )}
                  </div>
                </div>

                <MixModeSelector value={mixMode} onChange={setMixMode} products={mixProducts} />

                <FreightPlanPanel
                  plan={plan}
                  isLoading={isLoading}
                  error={error?.message ?? null}
                  products={productRows}
                  unavailable={unavailable}
                />

                <Button
                  className="w-full"
                  size="lg"
                  onClick={carryToQuote}
                  disabled={items.length === 0}
                  data-testid="simulator-carry-to-quote"
                >
                  <ArrowRight className="h-4 w-4" />
                  Levar para orçamento
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <QuoteBuilderProductSearch
        open={searchOpen}
        onOpenChange={setSearchOpen}
        productSearch={productSearch}
        setProductSearch={setProductSearch}
        filteredProducts={filteredProducts}
        selectedProductForColor={selectedProductForColor}
        setSelectedProductForColor={setSelectedProductForColor}
        onProductClick={addProduct}
        onAddWithColor={(p) => addProduct(p)}
        formatCurrency={formatCurrency}
      />
    </>
  );
}
