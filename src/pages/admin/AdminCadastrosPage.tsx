import { Suspense } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PageSEO } from '@/components/seo/PageSEO';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Boxes,
  Building2,
  Package,
  Palette,
  FolderOpen,
  FolderTree,
  Truck,
  Tags,
  Sparkles,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { lazyWithRetry } from '@/lib/lazyWithRetry';

const ProductsManager = lazyWithRetry(() =>
  import('@/components/admin/ProductsManager').then((m) => ({ default: m.ProductsManager })),
);
const SuppliersManager = lazyWithRetry(() =>
  import('@/components/admin/suppliers-manager').then((m) => ({ default: m.SuppliersManager })),
);
const ShippingBoxesManager = lazyWithRetry(() =>
  import('@/components/admin/shipping-boxes').then((m) => ({ default: m.ShippingBoxesManager })),
);
const FreightReadinessReport = lazyWithRetry(() =>
  import('@/components/admin/freight').then((m) => ({ default: m.FreightReadinessReport })),
);
const EngravingRegistrationContent = lazyWithRetry(() =>
  import('@/pages/tools/EngravingRegistrationPage').then((m) => ({
    default: m.EngravingRegistrationContent,
  })),
);

const BadgesManager = lazyWithRetry(() =>
  import('@/components/admin/badges-manager').then((m) => ({ default: m.BadgesManager })),
);

const CategoriesManager = lazyWithRetry(() =>
  import('@/components/admin/categories-manager').then((m) => ({ default: m.CategoriesManager })),
);

const RamosAtividadeManager = lazyWithRetry(() =>
  import('@/components/admin/ramos-atividade').then((m) => ({
    default: m.RamosAtividadeManager,
  })),
);

const ClassificationAuditManager = lazyWithRetry(() =>
  import('@/components/admin/classification-audit').then((m) => ({
    default: m.ClassificationAuditManager,
  })),
);

function TabFallback() {
  return (
    <div className="space-y-4 p-4">
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

const VALID_TABS = [
  'products',
  'suppliers',
  'caixas',
  'categorias',
  'ramos',
  'classificacao',
  'personalizacao',
  'badges',
] as const;

export default function AdminCadastrosPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const activeTab = (VALID_TABS as readonly string[]).includes(tabParam ?? '')
    ? tabParam
    : 'products';

  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value }, { replace: true });
  };

  return (
    <>
      <PageSEO
        title="Cadastros"
        description="Gerencie produtos, fornecedores e técnicas de personalização."
        path="/admin/cadastros"
        noIndex
      />
      <div className="mx-auto w-full max-w-[1920px] animate-fade-in space-y-3 px-3 py-3 pb-24 sm:space-y-4 sm:px-4 sm:py-4 md:pb-6 lg:px-6 xl:px-8">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-primary/10 p-3">
            <FolderOpen className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1
              data-testid="page-title-cadastros"
              className="font-display text-3xl font-bold tracking-tight"
            >
              Cadastros
            </h1>
            <p className="text-muted-foreground">
              Gerencie produtos, fornecedores e técnicas de personalização
            </p>
          </div>
        </div>

        <Tabs value={activeTab ?? undefined} onValueChange={handleTabChange} className="space-y-4">
          <TabsList>
            <TabsTrigger value="products" className="gap-2">
              <Package className="h-4 w-4" />
              Produtos
            </TabsTrigger>
            <TabsTrigger value="suppliers" className="gap-2">
              <Truck className="h-4 w-4" />
              Fornecedores
            </TabsTrigger>
            <TabsTrigger value="caixas" className="gap-2">
              <Boxes className="h-4 w-4" />
              Caixas de transporte
            </TabsTrigger>
            <TabsTrigger value="categorias" className="gap-2">
              <FolderTree className="h-4 w-4" />
              Categorias
            </TabsTrigger>
            <TabsTrigger value="ramos" className="gap-2">
              <Building2 className="h-4 w-4" />
              Ramos de atividade
            </TabsTrigger>
            <TabsTrigger value="classificacao" className="gap-2">
              <Sparkles className="h-4 w-4" />
              Classificação
            </TabsTrigger>
            <TabsTrigger value="personalizacao" className="gap-2">
              <Palette className="h-4 w-4" />
              Personalização
            </TabsTrigger>
            <TabsTrigger value="badges" className="gap-2">
              <Tags className="h-4 w-4" />
              Badges
            </TabsTrigger>
          </TabsList>

          <TabsContent value="products">
            <Suspense fallback={<TabFallback />}>
              <ProductsManager />
            </Suspense>
          </TabsContent>

          <TabsContent value="suppliers">
            <Suspense fallback={<TabFallback />}>
              <SuppliersManager />
            </Suspense>
          </TabsContent>

          <TabsContent value="caixas">
            <Tabs defaultValue="caixas-lista" className="space-y-4">
              <TabsList>
                <TabsTrigger value="caixas-lista">Caixas</TabsTrigger>
                <TabsTrigger value="sem-dados-frete">Produtos sem dados de frete</TabsTrigger>
              </TabsList>
              <TabsContent value="caixas-lista">
                <Suspense fallback={<TabFallback />}>
                  <ShippingBoxesManager />
                </Suspense>
              </TabsContent>
              <TabsContent value="sem-dados-frete">
                <Suspense fallback={<TabFallback />}>
                  <FreightReadinessReport />
                </Suspense>
              </TabsContent>
            </Tabs>
          </TabsContent>

          <TabsContent value="categorias">
            <Suspense fallback={<TabFallback />}>
              <CategoriesManager />
            </Suspense>
          </TabsContent>

          <TabsContent value="ramos">
            <Suspense fallback={<TabFallback />}>
              <RamosAtividadeManager />
            </Suspense>
          </TabsContent>

          <TabsContent value="classificacao">
            <Suspense fallback={<TabFallback />}>
              <ClassificationAuditManager />
            </Suspense>
          </TabsContent>

          <TabsContent value="personalizacao">
            <Suspense fallback={<TabFallback />}>
              <EngravingRegistrationContent />
            </Suspense>
          </TabsContent>

          <TabsContent value="badges">
            <Suspense fallback={<TabFallback />}>
              <BadgesManager />
            </Suspense>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
