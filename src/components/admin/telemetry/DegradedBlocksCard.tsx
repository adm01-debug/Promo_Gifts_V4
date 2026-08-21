/**
 * DegradedBlocksCard — visibilidade operacional dos blocos que degradaram.
 *
 * Consome o `degradationRegistry` (eventos `intelligence_block_degraded`
 * emitidos por `degradeOrThrow`). Sem este card, uma negação de RLS ou uma
 * relação ausente em `/inteligencia-comercial`, `/estoque` ou `/trends` é
 * invisível: o bloco simplesmente renderiza vazio.
 */
import { useCallback, useMemo, useSyncExternalStore } from 'react';
import { ShieldAlert, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  aggregateDegradations,
  clearDegradationLog,
  getDegradationLog,
  subscribeDegradationLog,
  type DegradationEvent,
} from '@/lib/intelligence/degradationRegistry';
import type { DegradationReason } from '@/lib/intelligence/degradation';

const EMPTY: readonly DegradationEvent[] = [];

const REASON_LABEL: Record<DegradationReason, string> = {
  permission_denied: 'Permissão negada (RLS)',
  missing_relation: 'Relação/função ausente',
  quota_exceeded: 'Quota excedida',
  schema_mismatch: 'Schema divergente',
};

const REASON_TONE: Record<DegradationReason, string> = {
  permission_denied: 'border-destructive/30 bg-destructive/15 text-destructive',
  missing_relation: 'border-warning/30 bg-warning/15 text-warning',
  quota_exceeded: 'border-warning/30 bg-warning/15 text-warning',
  schema_mismatch: 'border-border bg-muted text-muted-foreground',
};

function formatTime(at: number): string {
  try {
    return new Date(at).toLocaleTimeString('pt-BR', { hour12: false });
  } catch {
    return '—';
  }
}

export function DegradedBlocksCard() {
  const events = useSyncExternalStore(
    subscribeDegradationLog,
    getDegradationLog,
    () => EMPTY, // SSR/teste sem store
  );

  const rows = useMemo(() => aggregateDegradations(events), [events]);
  const total = events.length;

  const handleClear = useCallback(() => {
    clearDegradationLog();
  }, []);

  return (
    <Card data-testid="degraded-blocks-card">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <ShieldAlert className="h-4 w-4 text-muted-foreground" aria-hidden />
          Blocos degradados (sessão)
          {total > 0 && (
            <Badge variant="secondary" className="text-[10px]">
              {total} evento{total === 1 ? '' : 's'}
            </Badge>
          )}
        </CardTitle>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-7 gap-1.5"
          onClick={handleClear}
          disabled={total === 0}
        >
          <Trash2 className="h-3.5 w-3.5" aria-hidden />
          Limpar
        </Button>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhuma degradação registrada nesta sessão. Blocos analíticos estão consultando o banco
            sem erros estruturais.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-muted-foreground">
                <tr>
                  <th scope="col" className="pb-2 pr-3 font-medium">
                    Bloco
                  </th>
                  <th scope="col" className="pb-2 pr-3 font-medium">
                    Motivo
                  </th>
                  <th scope="col" className="pb-2 pr-3 font-medium">
                    Códigos
                  </th>
                  <th scope="col" className="pb-2 pr-3 text-right font-medium">
                    Ocorrências
                  </th>
                  <th scope="col" className="pb-2 text-right font-medium">
                    Último
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={`${row.scope}:${row.reason}`}
                    className="border-t border-border/50"
                    data-testid="degraded-blocks-row"
                  >
                    <td className="py-2 pr-3 font-mono text-[11px] text-foreground">{row.scope}</td>
                    <td className="py-2 pr-3">
                      <Badge variant="outline" className={`text-[10px] ${REASON_TONE[row.reason]}`}>
                        {REASON_LABEL[row.reason]}
                      </Badge>
                    </td>
                    <td className="py-2 pr-3 font-mono text-[11px] text-muted-foreground">
                      {row.codes.length > 0 ? row.codes.join(', ') : '—'}
                    </td>
                    <td className="py-2 pr-3 text-right tabular-nums">{row.count}</td>
                    <td className="py-2 text-right tabular-nums text-muted-foreground">
                      {formatTime(row.lastAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
