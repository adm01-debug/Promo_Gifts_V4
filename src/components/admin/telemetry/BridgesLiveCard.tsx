/**
 * Card "Bridges (ao vivo)" — agrega métricas das chamadas client-side
 * para external-db-bridge e crm-db-bridge durante a sessão atual.
 *
 * Sem persistência (memória apenas). Atualiza em tempo real via subscribe.
 */
import { useSyncExternalStore, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Activity, Trash2, Network, Search } from 'lucide-react';
import {
  aggregateByEndpoint,
  clearBridgeSamples,
  getBridgeSamples,
  subscribeBridgeCalls,
  type BridgeAggregateRow,
  type BridgeCallSample,
} from '@/lib/telemetry/bridgeCallMetrics';
import { shortRequestId } from '@/lib/telemetry/requestId';
import { BridgeCallDetailDrawer } from './BridgeCallDetailDrawer';

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function formatMs(ms: number): string {
  if (ms < 1000) return `${ms} ms`;
  return `${(ms / 1000).toFixed(2)} s`;
}

function formatRelative(ts: number): string {
  const diff = Math.max(0, Date.now() - ts);
  if (diff < 1000) return 'agora';
  if (diff < 60_000) return `${Math.floor(diff / 1000)}s atrás`;
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m atrás`;
  return `${Math.floor(diff / 3_600_000)}h atrás`;
}

function bridgeBadge(bridge: BridgeAggregateRow['bridge']) {
  const isCrm = bridge === 'crm-db-bridge';
  return (
    <Badge
      variant="outline"
      className={
        isCrm
          ? 'border-primary/30 bg-primary/5 text-[10px] text-primary'
          : 'border-warning/30 bg-warning/5 text-[10px] text-warning'
      }
    >
      {isCrm ? 'CRM' : 'External'}
    </Badge>
  );
}

export function BridgesLiveCard() {
  // useSyncExternalStore garante re-render reativo conforme novas amostras chegam
  const samples = useSyncExternalStore(
    subscribeBridgeCalls,
    () => getBridgeSamples(),
    () => getBridgeSamples(),
  );

  const rows = useMemo(() => aggregateByEndpoint(samples), [samples]);

  // Últimas N chamadas (mais recentes primeiro) para visualização individual
  // por request_id — permite drill-down em uma chamada específica.
  const RECENT_LIMIT = 20;
  const recent = useMemo(() => samples.slice(-RECENT_LIMIT).reverse(), [samples]);

  const [selected, setSelected] = useState<BridgeCallSample | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const openDetail = (s: BridgeCallSample) => {
    setSelected(s);
    setDrawerOpen(true);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Network className="h-4 w-4" />
          Bridges (ao vivo)
          <Badge variant="secondary" className="ml-1 text-[10px]">
            sessão atual · sem persistência
          </Badge>
        </CardTitle>
        <Button
          variant="outline"
          size="sm"
          onClick={clearBridgeSamples}
          disabled={samples.length === 0}
        >
          <Trash2 className="mr-1.5 h-3.5 w-3.5" />
          Limpar
        </Button>
      </CardHeader>
      <CardContent>
        {/* Tabela por endpoint+op */}
        {rows.length === 0 ? (
          <div className="py-10 text-center text-muted-foreground">
            <Activity className="mx-auto mb-2 h-10 w-10 opacity-30" />
            <p className="text-sm font-medium">Nenhuma chamada registrada ainda</p>
            <p className="mt-1 text-xs">
              Navegue pela aplicação para começar a coletar telemetria.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="p-2 text-left text-xs font-medium text-muted-foreground">
                    Bridge
                  </th>
                  <th className="p-2 text-left text-xs font-medium text-muted-foreground">
                    Operação
                  </th>
                  <th className="p-2 text-right text-xs font-medium text-muted-foreground">
                    Chamadas
                  </th>
                  <th className="p-2 text-right text-xs font-medium text-muted-foreground">
                    Erros
                  </th>
                  <th className="p-2 text-right text-xs font-medium text-muted-foreground">avg</th>
                  <th className="p-2 text-right text-xs font-medium text-muted-foreground">p50</th>
                  <th className="p-2 text-right text-xs font-medium text-muted-foreground">p95</th>
                  <th className="p-2 text-right text-xs font-medium text-muted-foreground">max</th>
                  <th
                    className="p-2 text-right text-xs font-medium text-muted-foreground"
                    title="Tamanho médio de resposta"
                  >
                    resp. méd.
                  </th>
                  <th
                    className="p-2 text-right text-xs font-medium text-muted-foreground"
                    title="Total recebido nesta sessão"
                  >
                    resp. total
                  </th>
                  <th className="p-2 text-left text-xs font-medium text-muted-foreground">
                    Última
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row.key}
                    className="border-b border-border/30 transition-colors hover:bg-muted/20"
                  >
                    <td className="p-2">{bridgeBadge(row.bridge)}</td>
                    <td className="p-2 font-mono text-xs font-medium">{row.op}</td>
                    <td className="p-2 text-right font-mono tabular-nums">{row.count}</td>
                    <td
                      className={`p-2 text-right font-mono tabular-nums ${
                        row.errors > 0 ? 'text-destructive' : 'text-muted-foreground'
                      }`}
                    >
                      {row.errors}
                    </td>
                    <td className="p-2 text-right font-mono text-xs tabular-nums">
                      {formatMs(row.avgMs)}
                    </td>
                    <td className="p-2 text-right font-mono text-xs tabular-nums">
                      {formatMs(row.p50Ms)}
                    </td>
                    <td
                      className={`p-2 text-right font-mono text-xs tabular-nums ${
                        row.p95Ms >= 3000 ? 'text-warning' : ''
                      } ${row.p95Ms >= 8000 ? 'text-destructive' : ''}`}
                    >
                      {formatMs(row.p95Ms)}
                    </td>
                    <td className="p-2 text-right font-mono text-xs tabular-nums">
                      {formatMs(row.maxMs)}
                    </td>
                    <td className="p-2 text-right font-mono text-xs tabular-nums">
                      {formatBytes(row.avgRespBytes)}
                    </td>
                    <td className="p-2 text-right font-mono text-xs tabular-nums text-muted-foreground">
                      {formatBytes(row.totalRespBytes)}
                    </td>
                    <td className="whitespace-nowrap p-2 text-xs text-muted-foreground">
                      {formatRelative(row.lastTs)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Últimas chamadas — drill-down individual por request_id */}
        {recent.length > 0 && (
          <div className="mt-6">
            <div className="mb-2 flex items-center justify-between">
              <h4 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Últimas chamadas (request-id)
              </h4>
              <span className="text-[10px] text-muted-foreground">
                {recent.length} de {samples.length}
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="p-2 text-left text-xs font-medium text-muted-foreground">
                      Bridge
                    </th>
                    <th className="p-2 text-left text-xs font-medium text-muted-foreground">
                      Operação
                    </th>
                    <th className="p-2 text-left text-xs font-medium text-muted-foreground">
                      request_id
                    </th>
                    <th className="p-2 text-right text-xs font-medium text-muted-foreground">
                      Latência
                    </th>
                    <th className="p-2 text-right text-xs font-medium text-muted-foreground">
                      Resp.
                    </th>
                    <th className="p-2 text-left text-xs font-medium text-muted-foreground">
                      Quando
                    </th>
                    <th className="p-2 text-right text-xs font-medium text-muted-foreground">
                      Status
                    </th>
                    <th className="p-2" />
                  </tr>
                </thead>
                <tbody>
                  {recent.map((s) => (
                    <tr
                      key={s.id}
                      className="cursor-pointer border-b border-border/30 transition-colors hover:bg-muted/20"
                      onClick={() => openDetail(s)}
                    >
                      <td className="p-2">{bridgeBadge(s.bridge)}</td>
                      <td className="p-2 font-mono text-xs">{s.op}</td>
                      <td className="p-2">
                        <code className="font-mono text-[11px] text-primary hover:underline">
                          {shortRequestId(s.requestId)}
                        </code>
                      </td>
                      <td className="p-2 text-right font-mono text-xs tabular-nums">
                        {formatMs(s.durationMs)}
                      </td>
                      <td className="p-2 text-right font-mono text-xs tabular-nums text-muted-foreground">
                        {formatBytes(s.respBytes)}
                      </td>
                      <td className="whitespace-nowrap p-2 text-xs text-muted-foreground">
                        {formatRelative(s.ts)}
                      </td>
                      <td className="p-2 text-right">
                        {s.ok ? (
                          <Badge variant="secondary" className="text-[10px]">
                            OK
                          </Badge>
                        ) : (
                          <Badge variant="destructive" className="text-[10px]">
                            ERRO
                          </Badge>
                        )}
                      </td>
                      <td className="p-2 text-right">
                        <Search className="h-3.5 w-3.5 text-muted-foreground" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </CardContent>
      <BridgeCallDetailDrawer sample={selected} open={drawerOpen} onOpenChange={setDrawerOpen} />
    </Card>
  );
}

export default BridgesLiveCard;
