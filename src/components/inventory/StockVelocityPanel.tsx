/**
 * StockVelocityPanel — tela do giro por variante.
 *
 * Fecha o buraco entre o backend e a UI: `public.v_stock_velocity_safe` existe
 * desde 2026-06-23 (winsorização p99 do giro diário) e não tinha nenhum
 * consumidor no `src/`. Montado em `/estoque` (StockDashboardPage).
 *
 * Nome de produto/variante e estoque atual vêm do cache `variant-stock-data`
 * (`useVariantStock`), que a própria página já carrega — nenhuma consulta
 * extra e nenhuma linha duplicada de fetch.
 */
import { useMemo, useState } from 'react';
import { AlertTriangle, Gauge, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useVariantStock } from '@/hooks/products/useVariantStock';
import { useStockVelocity } from '@/hooks/stock/useStockVelocity';
import {
  VELOCITY_BAND_LABELS,
  buildVelocityIdentityMap,
  buildVelocityViews,
  filterVelocityViews,
  sortVelocityViews,
  summarizeVelocity,
  type VelocityBand,
} from '@/lib/stock/velocity';

const BAND_ORDER: VelocityBand[] = ['alta', 'media', 'baixa', 'parada'];

const BAND_CLASS: Record<VelocityBand, string> = {
  alta: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  media: 'border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-300',
  baixa: 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300',
  parada: 'border-muted-foreground/30 bg-muted text-muted-foreground',
};

function formatRate(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return '—';
  if (value >= 100) return value.toFixed(0);
  if (value >= 1) return value.toFixed(1).replace(/\.0$/, '');
  return value.toFixed(2);
}

export function StockVelocityPanel() {
  const [search, setSearch] = useState('');
  const [bands, setBands] = useState<VelocityBand[]>([]);
  const { rows, isLoading, error, refetch } = useStockVelocity();
  const { productStocks } = useVariantStock();

  const views = useMemo(
    () => buildVelocityViews(rows, buildVelocityIdentityMap(productStocks)),
    [rows, productStocks],
  );
  const visible = useMemo(
    () => sortVelocityViews(filterVelocityViews(views, { search, bands })),
    [views, search, bands],
  );
  const summary = useMemo(() => summarizeVelocity(views), [views]);

  function toggleBand(band: VelocityBand) {
    setBands((current) =>
      current.includes(band) ? current.filter((item) => item !== band) : [...current, band],
    );
  }

  return (
    <Card data-testid="stock-velocity-panel">
      <CardHeader className="pb-2">
        <CardTitle className="flex flex-wrap items-center gap-2 text-sm">
          <Gauge className="h-4 w-4 text-muted-foreground" />
          Giro por variante
          <span className="text-[11px] font-normal text-muted-foreground">
            velocidade de saída (un/dia) — giro suavizado no p99 de 30 dias
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {error ? (
          <div className="flex items-center justify-between gap-3 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
            <span className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              Não foi possível carregar o giro: {error.message}
            </span>
            <Button size="sm" variant="outline" onClick={refetch} data-testid="velocity-retry">
              <RefreshCw className="mr-1 h-3 w-3" /> Tentar de novo
            </Button>
          </div>
        ) : isLoading ? (
          <div className="space-y-2" data-testid="velocity-loading">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        ) : views.length === 0 ? (
          <p className="text-xs text-muted-foreground" data-testid="velocity-empty">
            Nenhuma variante com saída registrada nos últimos 90 dias. O materialized view de
            velocidade é atualizado por rotina agendada.
          </p>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
              <span>{summary.total} variantes com histórico</span>
              {BAND_ORDER.map((band) => (
                <button
                  key={band}
                  type="button"
                  onClick={() => toggleBand(band)}
                  aria-pressed={bands.includes(band)}
                  className={`rounded-full border px-2 py-0.5 transition-opacity hover:opacity-80 ${
                    bands.includes(band) ? BAND_CLASS[band] : 'border-border/60'
                  }`}
                >
                  {VELOCITY_BAND_LABELS[band]}: {summary.bandCounts[band]}
                </button>
              ))}
              {summary.capped > 0 && (
                <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                  <AlertTriangle className="h-3 w-3" />
                  {summary.capped} com pico suavizado
                </span>
              )}
            </div>

            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Filtrar por produto, variação ou variante…"
              className="h-8 text-xs"
              aria-label="Filtrar giro por variante"
            />

            <div className="overflow-x-auto">
              <table className="w-full text-xs" aria-label="Giro por variante">
                <thead className="text-left text-muted-foreground">
                  <tr className="border-b">
                    <th scope="col" className="py-1 pr-3 font-medium">
                      Produto
                    </th>
                    <th scope="col" className="py-1 pr-3 font-medium">
                      Variação
                    </th>
                    <th scope="col" className="py-1 pr-3 text-right font-medium">
                      Giro 30d
                    </th>
                    <th scope="col" className="py-1 pr-3 text-right font-medium">
                      Giro 7d
                    </th>
                    <th scope="col" className="py-1 pr-3 text-right font-medium">
                      Giro 90d
                    </th>
                    <th scope="col" className="py-1 pr-3 text-right font-medium">
                      Saídas 30d
                    </th>
                    <th scope="col" className="py-1 pr-3 text-right font-medium">
                      Cobertura
                    </th>
                    <th scope="col" className="py-1 font-medium">
                      Faixa
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((view) => (
                    <tr key={view.variantId} className="border-b border-border/40 last:border-0">
                      <td className="max-w-[220px] truncate py-1 pr-3">{view.productName}</td>
                      <td className="max-w-[140px] truncate py-1 pr-3 text-muted-foreground">
                        {view.variantLabel}
                      </td>
                      <td className="py-1 pr-3 text-right font-mono">
                        {formatRate(view.avg30d)}
                        {view.wasCapped && (
                          <span
                            title={`Pico suavizado: bruto ${formatRate(view.rawAvg30d)} un/dia`}
                            className="ml-1 text-amber-500"
                          >
                            *
                          </span>
                        )}
                      </td>
                      <td className="py-1 pr-3 text-right font-mono text-muted-foreground">
                        {formatRate(view.avg7d)}
                      </td>
                      <td className="py-1 pr-3 text-right font-mono text-muted-foreground">
                        {formatRate(view.avg90d)}
                      </td>
                      <td className="py-1 pr-3 text-right font-mono">
                        {view.totalDepleted30d.toLocaleString('pt-BR')}
                      </td>
                      <td className="py-1 pr-3 text-right font-mono text-muted-foreground">
                        {view.coverageDays === null || view.coverageDays === undefined
                          ? '—'
                          : `${view.coverageDays} d`}
                      </td>
                      <td className="py-1">
                        <Badge variant="outline" className={`text-[10px] ${BAND_CLASS[view.band]}`}>
                          {VELOCITY_BAND_LABELS[view.band]}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {visible.length === 0 && (
                <p className="py-2 text-xs text-muted-foreground" data-testid="velocity-no-match">
                  Nenhuma variante para os filtros atuais.
                </p>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
