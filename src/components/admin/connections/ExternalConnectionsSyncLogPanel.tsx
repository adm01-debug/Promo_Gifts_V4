import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { History, RefreshCw, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

// NOTE: colunas alinhadas ao schema real de `external_connections_sync_log`
// (started_at/connection_name/sync_type/records_processed/records_failed) —
// o shape anterior (ran_at/trigger_op/triggered_by_*/processed/
// created_count/updated_count) não existe na tabela e fazia o `.select()`
// explícito retornar 400 em produção.
interface SyncLogRow {
  id: string;
  started_at: string;
  connection_id: string | null;
  connection_name: string | null;
  sync_type: string | null;
  records_processed: number | null;
  records_failed: number | null;
  status: string;
  error_message: string | null;
  duration_ms: number | null;
}

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60_000) return `há ${Math.round(diff / 1000)}s`;
  if (diff < 3_600_000) return `há ${Math.round(diff / 60_000)}min`;
  if (diff < 86_400_000) return `há ${Math.round(diff / 3_600_000)}h`;
  return `há ${Math.round(diff / 86_400_000)}d`;
}

function statusBadge(status: string) {
  if (status === 'ok') {
    return (
      <Badge
        variant="outline"
        className="gap-1 border-green-500/40 text-green-600 dark:text-green-400"
      >
        <CheckCircle2 className="h-3 w-3" /> ok
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="gap-1 border-destructive/40 text-destructive">
      <AlertTriangle className="h-3 w-3" /> {status}
    </Badge>
  );
}

function opBadge(op: string | null) {
  if (!op) return null;
  const variant = op === 'manual' ? 'secondary' : 'outline';
  return (
    <Badge variant={variant} className="text-[10px] uppercase tracking-wide">
      {op.toLowerCase()}
    </Badge>
  );
}

export function ExternalConnectionsSyncLogPanel() {
  const [rows, setRows] = useState<SyncLogRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase
      .from('external_connections_sync_log')
      .select(
        'id, started_at, connection_id, connection_name, sync_type, records_processed, records_failed, status, error_message, duration_ms',
      )
      .order('started_at', { ascending: false })
      .limit(20);

    if (err) {
      setError(err.message ?? 'Falha ao ler auditoria');
      setRows(null);
    } else {
      setRows((data ?? []) as unknown as SyncLogRow[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const lastOk = rows?.find((r) => r.status === 'ok') ?? null;
  const lastError = rows?.find((r) => r.status !== 'ok') ?? null;

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div className="flex items-center gap-2">
          <History className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-base">Auditoria · sync external_connections</CardTitle>
        </div>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            load();
          }}
          disabled={loading}
        >
          <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
        </Button>
      </CardHeader>

      <CardContent className="space-y-3">
        {loading && !rows ? (
          <div className="space-y-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : error ? (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Falha ao ler auditoria</AlertTitle>
            <AlertDescription className="text-xs">{error}</AlertDescription>
          </Alert>
        ) : !rows || rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhuma execução registrada ainda. A próxima rotação de credencial deixará rastro aqui.
          </p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-md border border-border/40 p-2">
                <div className="text-muted-foreground">Última execução OK</div>
                <div className="font-medium">
                  {lastOk
                    ? `${formatRelative(lastOk.started_at)} • ${lastOk.records_processed ?? 0} processada(s)`
                    : '—'}
                </div>
              </div>
              <div className="rounded-md border border-border/40 p-2">
                <div className="text-muted-foreground">Última falha</div>
                <div className="font-medium">
                  {lastError ? formatRelative(lastError.started_at) : 'Nenhuma'}
                </div>
              </div>
            </div>

            <ScrollArea className="h-[280px] pr-2">
              <ul className="space-y-2">
                {rows.map((r) => (
                  <li
                    key={r.id}
                    className="space-y-1 rounded-md border border-border/40 p-2 text-xs"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {statusBadge(r.status)}
                        {opBadge(r.sync_type)}
                        <span className="text-muted-foreground">
                          {formatRelative(r.started_at)} ·{' '}
                          {new Date(r.started_at).toLocaleString('pt-BR', {
                            dateStyle: 'short',
                            timeStyle: 'medium',
                          })}
                        </span>
                      </div>
                      <span className="tabular-nums text-muted-foreground">
                        {r.duration_ms !== null ? `${r.duration_ms}ms` : ''}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span>
                        Processadas:{' '}
                        <strong className="tabular-nums">{r.records_processed ?? 0}</strong>
                      </span>
                      <span className="text-destructive">
                        {r.records_failed ?? 0} falharam
                      </span>
                    </div>

                    {r.connection_name && (
                      <div className="text-muted-foreground">
                        Conexão:{' '}
                        <code className="rounded bg-muted px-1 py-0.5 font-mono text-[10px]">
                          {r.connection_name}
                        </code>
                      </div>
                    )}

                    {r.error_message && (
                      <div className="break-words text-destructive">⚠ {r.error_message}</div>
                    )}
                  </li>
                ))}
              </ul>
            </ScrollArea>
          </>
        )}
      </CardContent>
    </Card>
  );
}
