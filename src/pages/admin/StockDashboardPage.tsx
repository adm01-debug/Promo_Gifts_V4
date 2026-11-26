import { useEffect, useRef, useState, Suspense } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { PageSEO } from '@/components/seo/PageSEO';
import { StockDashboard } from '@/components/inventory/StockDashboard';
import { StockHeroRiskBanner } from '@/components/inventory/StockHeroRiskBanner';
import { StockSavedViewsMenu } from '@/components/inventory/StockSavedViewsMenu';
import { lazyWithRetry } from '@/lib/lazyWithRetry';
import { Skeleton } from '@/components/ui/skeleton';
import { Activity } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useKeyboardShortcut } from '@/components/a11y';
import { useToast } from '@/hooks/ui/use-toast';

const RupturePanelEma = lazyWithRetry(() =>
  import('@/components/inventory/risk/RupturePanelEma').then((m) => ({
    default: m.RupturePanelEma,
  })),
);
const WhatIfPanel = lazyWithRetry(() =>
  import('@/components/inventory/risk/WhatIfPanel').then((m) => ({ default: m.WhatIfPanel })),
);

/**
 * StockDashboardPage — entrada de `/estoque`.
 *
 * O painel preditivo de ruptura (EMA α=0.3) é montado AQUI, e não dentro do
 * StockDashboard, porque aquele arquivo está em 780 linhas com teto 780 no
 * `.file-size-baseline.json`. Os componentes Onda 3 (StockHeroRiskBanner e
 * WhatIfPanel) foram montados aqui na pré-regressão da21bbf1c, tiveram o ponto
 * de montagem perdido na regressão e agora são remontados na forma original
 * (atalhos Ctrl+E / Ctrl+W, scrollIntoView, activeLevel).
 *
 * Cache-busting: ao montar a rota, invalida `variant-stock-data` e
 * `rupture-alerts` para o usuário sempre ver números frescos. React Query
 * deduplica, então o custo é 1 refetch por visita à rota.
 */
export default function StockDashboardPage() {
  const queryClient = useQueryClient();
  const [emaActiveLevel, setEmaActiveLevel] = useState<string | null>(null);
  const [showWhatIf, setShowWhatIf] = useState(false);
  const emaPanelRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: ['variant-stock-data'] });
    queryClient.invalidateQueries({ queryKey: ['rupture-alerts'] });
  }, [queryClient]);

  function handleLevelClick(level: string | null) {
    setEmaActiveLevel(level);
    if (level) {
      setTimeout(
        () => emaPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
        120,
      );
    }
  }

  // Atalhos de teclado (Ctrl+E = painel EMA, Ctrl+W = What-if)
  useKeyboardShortcut('ctrl+e', () => {
    emaPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    toast({ title: '⤵ Painel EMA', description: 'Ctrl+W = What-if · Ctrl+E = ir para o painel' });
  });
  useKeyboardShortcut('ctrl+w', () => setShowWhatIf((v) => !v), { preventDefault: true });

  return (
    <>
      <PageSEO
        title="Estoque"
        description="Acompanhe níveis de estoque e disponibilidade dos produtos."
        path="/estoque"
        noIndex
      />
      <div className="mx-auto w-full max-w-[1920px] animate-fade-in space-y-3 px-3 py-3 pb-24 sm:space-y-4 sm:px-4 sm:py-4 md:pb-6 lg:px-6 xl:px-8">
        {/* Onda 1+3: Hero + forecast strip */}
        <StockHeroRiskBanner activeLevel={emaActiveLevel} onLevelClick={handleLevelClick} />

        {/* Dashboard existente */}
        <StockDashboard />

        {/* Onda 3: What-if panel (toggle via Ctrl+W) */}
        {showWhatIf && (
          <Suspense fallback={<Skeleton className="h-48 w-full rounded-xl" />}>
            <WhatIfPanel />
          </Suspense>
        )}

        {/* Onda 1-3: Painel EMA completo */}
        <div ref={emaPanelRef} className="scroll-mt-4">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <Activity className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-semibold">Painel de Risco EMA</span>
            {emaActiveLevel && (
              <Badge
                variant="secondary"
                className="cursor-pointer gap-1 text-xs"
                onClick={() => setEmaActiveLevel(null)}
              >
                filtro: {emaActiveLevel} ×
              </Badge>
            )}
            <StockSavedViewsMenu
              filters={{ activeLevel: emaActiveLevel }}
              onApply={(next) => setEmaActiveLevel(next.activeLevel)}
            />
            <span className="ml-auto hidden text-[10px] text-muted-foreground/60 lg:inline">
              <kbd className="rounded border px-1">Ctrl+E</kbd> navegar ·{' '}
              <kbd className="rounded border px-1">Ctrl+W</kbd> what-if
            </span>
          </div>
          <Suspense fallback={<Skeleton className="h-64 w-full rounded-xl" />}>
            <RupturePanelEma focusedLevel={emaActiveLevel} />
          </Suspense>
        </div>
      </div>
    </>
  );
}
