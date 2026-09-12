import {
  ArrowRight,
  BookOpen,
  Boxes,
  CheckCircle2,
  ClipboardList,
  Library,
  PackageCheck,
  Palette,
  Wand2,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { KitAIPromptDialog } from '@/components/kit-builder/KitAIPromptDialog';
import { KitOccasionSelector, type Occasion } from '@/components/kit-builder/KitOccasionSelector';
import { dbInvoke } from '@/lib/db/postgrest';

interface KitMakerLandingProps {
  onStart: (flow: 'box-first' | 'items-first') => void;
  occasion: Occasion | null;
  onOccasionChange: (occasion: Occasion | null) => void;
  onApplyAISuggestion: (suggestion: {
    kit_type: 'montado' | 'original' | 'simples';
    box_keywords: string[];
    item_keywords: string[];
  }) => void;
}

interface FeaturedProduct {
  id: string;
  name: string;
  sku: string | null;
  sale_price: number | null;
  primary_image_url: string | null;
  images: string[] | null;
  product_type: string | null;
}

const BENEFITS = [
  {
    title: 'Validação inteligente',
    description: 'Compatibilidade, ocupação e peso são verificados durante a montagem.',
    Icon: PackageCheck,
  },
  {
    title: 'Caixas recomendadas',
    description: 'Encontre embalagens compatíveis para a sua composição.',
    Icon: Boxes,
  },
  {
    title: 'Personalização completa',
    description: 'Defina técnicas, áreas, cores e dimensões por item.',
    Icon: Palette,
  },
  {
    title: 'Orçamento em tempo real',
    description: 'Acompanhe os custos antes de criar a proposta.',
    Icon: ClipboardList,
  },
] as const;

function featuredImage(product: FeaturedProduct | undefined): string | null {
  return product?.primary_image_url || product?.images?.[0] || null;
}

function useLandingCatalog() {
  return useQuery({
    queryKey: ['kit-maker', 'landing-catalog'],
    queryFn: async () => {
      const [itemsResult, boxesResult] = await Promise.all([
        dbInvoke<FeaturedProduct>({
          table: 'products',
          operation: 'select',
          filters: { active: true, is_featured: true },
          select: 'id, name, sku, sale_price, primary_image_url, images, product_type',
          limit: 8,
          orderBy: { column: 'name', ascending: true },
        }),
        dbInvoke<FeaturedProduct>({
          table: 'products',
          operation: 'select',
          filters: { active: true, product_type: 'packaging' },
          select: 'id, name, sku, sale_price, primary_image_url, images, product_type',
          limit: 4,
          orderBy: { column: 'name', ascending: true },
        }),
      ]);

      return {
        items: itemsResult.records.filter((product) => product.product_type !== 'packaging'),
        boxes: boxesResult.records,
      };
    },
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}

function HeroProductImage({ products, alt }: { products: FeaturedProduct[]; alt: string }) {
  const [failedImages, setFailedImages] = useState<Set<string>>(() => new Set());
  const visibleProducts = products
    .filter((product) => {
      const image = featuredImage(product);
      return image && !failedImages.has(image);
    })
    .slice(0, 3);

  if (visibleProducts.length === 0) {
    return (
      <div className="absolute inset-y-0 right-0 hidden w-[48%] items-center justify-center bg-gradient-to-l from-primary/15 to-transparent md:flex">
        <Boxes className="h-32 w-32 text-primary/45" aria-hidden />
      </div>
    );
  }

  return (
    <div
      className="absolute inset-y-0 right-0 hidden w-[52%] overflow-hidden md:block"
      aria-label={alt}
    >
      <div className="absolute inset-0 z-20 bg-gradient-to-r from-card via-card/55 to-transparent" />
      <div className="absolute inset-y-6 right-5 z-10 flex w-[78%] items-end justify-end gap-2">
        {visibleProducts.map((product, index) => {
          const image = featuredImage(product)!;
          return (
            <div
              key={product.id}
              className="relative overflow-hidden rounded-xl border border-border/50 bg-muted/40 shadow-2xl"
              style={{
                height: `${72 + index * 12}%`,
                width: `${index === 1 ? 42 : 31}%`,
                zIndex: index + 1,
                transform: `translateY(${index === 1 ? '-4%' : `${index * 4}%`})`,
              }}
            >
              <img
                src={image}
                alt={index === 0 ? alt : product.name}
                className="h-full w-full object-cover"
                loading="eager"
                onError={() =>
                  setFailedImages((current) => {
                    const next = new Set(current);
                    next.add(image);
                    return next;
                  })
                }
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function useFeaturedProducts() {
  return useQuery({
    queryKey: ['kit-maker', 'landing-featured-products'],
    queryFn: async () => {
      const result = await dbInvoke<FeaturedProduct>({
        table: 'products',
        operation: 'select',
        filters: { active: true, is_featured: true },
        select: 'id, name, sku, sale_price, primary_image_url, images, product_type',
        limit: 8,
        orderBy: { column: 'name', ascending: true },
      });
      return result.records.filter((product) => product.product_type !== 'packaging');
    },
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}

export function KitMakerLanding({
  onStart,
  occasion,
  onOccasionChange,
  onApplyAISuggestion,
}: KitMakerLandingProps) {
  const {
    data: landingCatalog,
    isLoading: isLoadingLandingCatalog,
    isError: hasLandingCatalogError,
    refetch: refetchLandingCatalog,
  } = useLandingCatalog();
  const {
    data: featuredProducts = [],
    isLoading: isLoadingFeatured,
    isError: hasFeaturedError,
    refetch: refetchFeatured,
  } = useFeaturedProducts();
  const itemsHeroProducts = landingCatalog?.items.slice(0, 3) ?? [];
  const boxHeroProducts = landingCatalog?.boxes.slice(0, 3) ?? [];
  const handleRetryFeatured = () => {
    refetchFeatured().catch(() => undefined);
    refetchLandingCatalog().catch(() => undefined);
  };

  return (
    <main className="mx-auto w-full max-w-[1600px] space-y-7 px-3 py-6 sm:px-5 lg:px-8">
      <section className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
        <div className="min-w-0">
          <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
            <Boxes className="h-4 w-4 text-primary" /> Ferramentas / Kit Maker
          </div>
          <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">Kit Maker</h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Monte kits personalizados de forma simples e inteligente.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" asChild>
            <Link to="/meus-kits">
              <Library className="mr-2 h-4 w-4" />
              Meus kits
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <a href="#como-funciona">
              <BookOpen className="mr-2 h-4 w-4" />
              Ver tutoriais
            </a>
          </Button>
          <Button variant="outline" asChild>
            <a href="#como-funciona">Como funciona?</a>
          </Button>
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <Card className="relative min-h-[348px] overflow-hidden border-primary/60 bg-gradient-to-br from-primary/15 via-card to-card shadow-[0_18px_50px_-30px_hsl(var(--primary)/0.7)]">
          <HeroProductImage
            products={itemsHeroProducts}
            alt="Produtos em destaque para montar um kit"
          />
          <CardContent className="relative z-20 flex h-full max-w-none flex-col items-start p-6 sm:p-8 md:max-w-[62%]">
            <div className="flex w-full items-center justify-between gap-2">
              <span className="inline-flex rounded-full bg-primary px-3 py-1 text-[11px] font-bold tracking-wide text-primary-foreground">
                MODO RECOMENDADO
              </span>
              <span className="hidden rounded-full border border-primary/30 bg-background/60 px-3 py-1 text-xs text-muted-foreground lg:inline-flex">
                Ideal para quem já sabe os produtos
              </span>
            </div>
            <div className="mt-5">
              <h2 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
                Começar pelos itens
              </h2>
              <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground sm:text-base">
                Monte a composição e encontre uma caixa padrão compatível.
              </p>
            </div>
            <ul className="mt-5 space-y-2 text-sm">
              {[
                'Escolha os produtos do seu kit',
                'Defina quantidades e variações',
                'O sistema sugere as melhores caixas',
                'Veja a compatibilidade em tempo real',
              ].map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
                  {item}
                </li>
              ))}
            </ul>
            <Button
              onClick={() => onStart('items-first')}
              size="lg"
              className="mt-auto min-w-[212px]"
            >
              Começar pelos itens <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>

        <Card className="relative min-h-[348px] overflow-hidden border-border/70 bg-gradient-to-br from-card via-card to-muted/30 shadow-sm">
          <HeroProductImage products={boxHeroProducts} alt="Embalagens para montar um kit" />
          <CardContent className="relative z-20 flex h-full max-w-none flex-col items-start p-6 sm:p-8 md:max-w-[62%]">
            <div className="flex w-full items-center justify-between gap-2">
              <span className="inline-flex rounded-full bg-secondary px-3 py-1 text-[11px] font-bold tracking-wide text-secondary-foreground">
                OUTRA FORMA DE MONTAR
              </span>
              <span className="hidden rounded-full border bg-background/60 px-3 py-1 text-xs text-muted-foreground lg:inline-flex">
                Ideal para quem já tem a embalagem
              </span>
            </div>
            <div className="mt-5">
              <h2 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
                Começar pela caixa
              </h2>
              <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground sm:text-base">
                Escolha a embalagem e monte o kit com validação dos itens.
              </p>
            </div>
            <ul className="mt-5 space-y-2 text-sm">
              {[
                'Selecione uma caixa do catálogo',
                'Adicione os produtos ao seu kit',
                'O sistema valida se cabe na caixa',
                'Acompanhe a ocupação em tempo real',
              ].map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
                  {item}
                </li>
              ))}
            </ul>
            <Button
              variant="outline"
              onClick={() => onStart('box-first')}
              size="lg"
              className="mt-auto min-w-[212px]"
            >
              Começar pela caixa <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </section>

      {(isLoadingLandingCatalog || hasLandingCatalogError) && (
        <p className="sr-only" role="status">
          {isLoadingLandingCatalog
            ? 'Carregando imagens de produtos e embalagens.'
            : 'Não foi possível carregar algumas imagens do catálogo.'}
        </p>
      )}

      <section id="como-funciona" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {BENEFITS.map(({ title, description, Icon }) => (
          <Card key={title} className="border-border/60 bg-card/80">
            <CardContent className="flex min-h-[104px] gap-3 p-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                <Icon className="h-5 w-5 text-primary" aria-hidden />
              </span>
              <div>
                <h2 className="text-base font-semibold leading-tight">{title}</h2>
                <p className="mt-1 text-sm leading-snug text-muted-foreground">{description}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </section>

      <section aria-labelledby="kits-em-destaque">
        <div className="mb-3 flex items-end justify-between gap-4">
          <div>
            <h2 id="kits-em-destaque" className="font-display text-xl font-bold">
              Kits em destaque
            </h2>
            <p className="text-sm text-muted-foreground">
              Inspire-se com combinações do catálogo atual.
            </p>
          </div>
          <Button variant="link" className="px-0" asChild>
            <Link to="/meus-kits">
              Ver todos <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </div>
        {isLoadingFeatured ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }, (_, index) => (
              <Skeleton key={index} className="h-48 rounded-xl" />
            ))}
          </div>
        ) : hasFeaturedError ? (
          <Card role="alert" className="border-destructive/30 bg-destructive/5">
            <CardContent className="flex flex-col items-start gap-2 p-5 text-sm">
              <span className="font-medium">
                Não foi possível carregar os destaques do catálogo.
              </span>
              <span className="text-muted-foreground">
                Verifique seu acesso e tente novamente. Você ainda pode iniciar a montagem pelos
                dois fluxos acima.
              </span>
              <Button variant="outline" size="sm" onClick={handleRetryFeatured}>
                Tentar novamente
              </Button>
            </CardContent>
          </Card>
        ) : featuredProducts.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {featuredProducts.slice(0, 4).map((product) => {
              const image = featuredImage(product);
              return (
                <Card key={product.id} className="group overflow-hidden border-border/60 bg-card">
                  <div className="aspect-[16/9] overflow-hidden bg-muted/50">
                    {image ? (
                      <img
                        src={image}
                        alt={product.name}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <Boxes className="h-10 w-10 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <CardContent className="p-4">
                    <p className="line-clamp-1 font-semibold">{product.name}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Produto em destaque do catálogo
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-start gap-2 p-5 text-sm text-muted-foreground">
              <span>Os destaques ainda não foram definidos no catálogo.</span>
              <Button variant="outline" size="sm" asChild>
                <Link to="/meus-kits">Abrir biblioteca</Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </section>

      <KitOccasionSelector value={occasion} onChange={onOccasionChange} />

      <Card className="overflow-hidden border-primary/30 bg-gradient-to-r from-primary/10 via-card to-primary/[0.04]">
        <CardContent className="flex flex-col justify-between gap-4 p-5 sm:flex-row sm:items-center sm:p-6">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Wand2 className="h-5 w-5" />
            </span>
            <div>
              <h2 className="font-display text-lg font-semibold">
                Precisa de uma ideia para montar seu kit?
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Descreva seu objetivo e receba uma sugestão para começar.
              </p>
            </div>
          </div>
          <KitAIPromptDialog onApply={onApplyAISuggestion} />
        </CardContent>
      </Card>
    </main>
  );
}
