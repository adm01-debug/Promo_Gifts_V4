import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { PageSEO } from '@/components/seo/PageSEO';
import { StockDashboard } from '@/components/inventory/StockDashboard';
import { RupturePanelEma } from '@/components/inventory/risk/RupturePanelEma';

/**
 * StockDashboardPage — entrada de `/estoque`.
 *
 * O painel preditivo de ruptura (EMA α=0.3) é montado AQUI, e não dentro do
 * StockDashboard, porque aquele arquivo está em 780 linhas com teto 780 no
 * `.file-size-baseline.json`. O `invalidateQueries(['rupture-alerts'])` abaixo
 * já existia nesta página desde antes: o painel era para estar montado e o
 * ponto de montagem se perdeu, deixando `useEmaRupture: { enabled: true }`
 * (src/lib/feature-flags.ts:120-124) prometendo uma tela que ninguém via.
 *
 * Cache-busting: ao montar a rota, invalida a query `variant-stock-data`
 * para que o usuário sempre veja números frescos (evita o efeito "preciso
 * dar hard reload pra ver mudança"). React Query continua deduplicando,
 * então o custo é 1 refetch por visita à rota.
 */
export default function StockDashboardPage() {
  const queryClient = useQueryClient();

  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: ['variant-stock-data'] });
    queryClient.invalidateQueries({ queryKey: ['rupture-alerts'] });
  }, [queryClient]);

  return (
    <>
      <PageSEO
        title="Estoque"
        description="Acompanhe níveis de estoque e disponibilidade dos produtos."
        path="/estoque"
        noIndex
      />
      <div className="mx-auto w-full max-w-[1920px] animate-fade-in space-y-3 px-3 py-3 pb-24 sm:space-y-4 sm:px-4 sm:py-4 md:pb-6 lg:px-6 xl:px-8">
        <StockDashboard />
        <RupturePanelEma />
      </div>
    </>
  );
}
