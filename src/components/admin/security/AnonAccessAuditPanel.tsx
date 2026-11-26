import { useMemo } from 'react';
import { AlertTriangle, RefreshCw, ScanEye, ShieldCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useAnonAccessAudit } from '@/hooks/security/useAnonAccessAudit';
import {
  agruparPorCategoria,
  describeAnonAccessError,
  resumirAnonAccess,
  severidadeLabel,
  severidadeRank,
} from '@/lib/security/anonAccessAudit';

function tomClass(severidade: string): string {
  const rank = severidadeRank(severidade);
  if (rank >= 3) return 'text-destructive';
  if (rank === 2) return 'text-warning';
  return 'text-muted-foreground';
}

function Kpi({
  label,
  value,
  sub,
  testId,
  tone,
}: {
  label: string;
  value: number;
  sub: string;
  testId: string;
  tone?: string;
}) {
  return (
    <div className="rounded-lg border border-border p-3">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`mt-1 text-xl font-bold ${tone ?? 'text-foreground'}`} data-testid={testId}>
        {value}
      </p>
      <p className="text-xs text-muted-foreground">{sub}</p>
    </div>
  );
}

/**
 * Raio-x do acesso `anon` — lê `fn_admin_anon_access_audit()` (migration
 * 20261126192900), o diagnóstico estrutural que roda direto nos catálogos do
 * Postgres. Complementa a aba "Exposição anon": lá se vê o tripwire do contrato
 * de grants declarado (`anon_catalog_grant_audit_log`); aqui se vê o estado
 * real do banco agora, agrupado por categoria.
 */
export function AnonAccessAuditPanel() {
  const { rows, isLoading, isFetching, error, refetch } = useAnonAccessAudit();
  const resumo = useMemo(() => resumirAnonAccess(rows), [rows]);
  const grupos = useMemo(() => agruparPorCategoria(rows), [rows]);

  return (
    <Card data-testid="anon-access-panel">
      <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2">
            <ScanEye className="h-4 w-4 text-primary" />
            Raio-x do acesso anon
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Varredura ao vivo dos catálogos do banco: tabela com RLS sem policy, função em policy
            sem EXECUTE para <code className="text-xs">anon</code>, view interna exposta e tabela de
            badge sem grant. Zero achados = ambiente saudável.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          data-testid="anon-access-refresh"
          disabled={isFetching}
          onClick={() => refetch()}
        >
          <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
          Rodar de novo
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading && (
          <div className="space-y-2" data-testid="anon-access-loading">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        )}

        {!isLoading && Boolean(error) && (
          <div
            className="flex flex-col gap-2 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm"
            data-testid="anon-access-error"
          >
            <div className="flex items-center gap-2 font-medium text-destructive">
              <AlertTriangle className="h-4 w-4" />
              Não foi possível rodar a auditoria de acesso anon
            </div>
            <p className="text-muted-foreground">{describeAnonAccessError(error)}</p>
            <div>
              <Button
                variant="outline"
                size="sm"
                data-testid="anon-access-retry"
                onClick={() => refetch()}
              >
                Tentar de novo
              </Button>
            </div>
          </div>
        )}

        {!isLoading && !error && rows.length === 0 && (
          <div
            className="flex items-center gap-2 rounded-md border border-border bg-muted/30 p-3 text-sm"
            data-testid="anon-access-empty"
          >
            <ShieldCheck className="h-4 w-4 text-primary" />
            Nenhum achado: nenhuma tabela sem policy, nenhuma view interna exposta e nenhum grant de
            badge faltando.
          </div>
        )}

        {!isLoading && rows.length > 0 && (
          <>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Kpi
                label="Achados"
                value={resumo.total}
                sub="objetos na varredura"
                testId="anon-access-kpi-total"
              />
              <Kpi
                label="Críticos"
                value={resumo.criticos}
                sub="quebram request"
                testId="anon-access-kpi-criticos"
                tone="text-destructive"
              />
              <Kpi
                label="Altos"
                value={resumo.altos}
                sub="exposição ou 403"
                testId="anon-access-kpi-altos"
                tone="text-warning"
              />
              <Kpi
                label="Categorias"
                value={resumo.categorias}
                sub="tipos distintos"
                testId="anon-access-kpi-categorias"
              />
            </div>

            <div className="space-y-2">
              {grupos.map((grupo) => (
                <div
                  key={grupo.categoria}
                  className="rounded-md border border-border"
                  data-testid={`anon-access-grupo-${grupo.categoria}`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground">{grupo.label}</span>
                      <span className="text-xs text-muted-foreground">
                        {grupo.objetos.length} objeto(s)
                      </span>
                    </div>
                    <Badge variant="outline" className={tomClass(grupo.severidade)}>
                      {severidadeLabel(grupo.severidade)}
                    </Badge>
                  </div>
                  {grupo.descricao ? (
                    <p className="border-b border-border/60 px-3 py-1.5 text-xs text-muted-foreground">
                      {grupo.descricao}
                    </p>
                  ) : null}
                  <ul className="divide-y divide-border/60">
                    {grupo.objetos.map((objeto) => (
                      <li
                        key={objeto}
                        className="flex items-center justify-between gap-2 px-3 py-1.5 text-sm"
                        data-testid="anon-access-item"
                      >
                        <code className="truncate text-xs">{objeto}</code>
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {grupo.categoria}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            <p className="text-xs text-muted-foreground">
              A varredura lê os catálogos do banco no momento da chamada; o resultado não é
              histórico. Rode de novo após aplicar migration de schema, grant ou policy.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
