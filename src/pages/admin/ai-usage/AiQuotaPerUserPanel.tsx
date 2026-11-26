import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { AlertTriangle, Clock, Gauge, RefreshCw, Search, Users } from 'lucide-react';
import { useDebounce } from '@/hooks/common';
import { AI_QUOTA_SUMMARY_LIMIT, useAiQuotaSummary } from '@/hooks/admin/useAiQuotaSummary';
import {
  describeQuotaError,
  describeRemaining,
  isQuotaExhausted,
  isQuotaUnlimited,
  roleLabel,
  summarizeAiQuota,
  usagePercent,
  type AiQuotaRow,
} from '@/lib/ai/quota-summary';

const COLUNAS = 7;

function formatarData(iso: string | null): string {
  if (!iso) return '—';
  const data = new Date(iso);
  if (Number.isNaN(data.getTime())) return '—';
  return data.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function consumoDoMes(row: AiQuotaRow): string {
  return isQuotaUnlimited(row)
    ? `${row.usedThisMonth} / ilimitado`
    : `${row.usedThisMonth} / ${row.monthlyLimit}`;
}

function Kpi({
  icon,
  label,
  value,
  sub,
  tone = 'text-primary',
  testId,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  tone?: string;
  testId: string;
}) {
  return (
    <div className="rounded-lg border border-border p-3">
      <div className="flex items-center gap-2 text-muted-foreground">
        <span className={tone}>{icon}</span>
        <span className="text-xs uppercase tracking-wide">{label}</span>
      </div>
      <p className="mt-1 text-xl font-bold text-foreground" data-testid={testId}>
        {value}
      </p>
      <p className="text-xs text-muted-foreground">{sub}</p>
    </div>
  );
}

/**
 * Cota de IA por usuario — le `fn_admin_ai_quota_summary` (guard de admin no
 * banco). Complementa a `AiQuotaManager`, que edita a quota por papel: aqui se
 * ve o consumo efetivo de cada pessoa no mes corrente.
 */
export function AiQuotaPerUserPanel() {
  const [search, setSearch] = useState('');
  const termo = useDebounce(search, 300);
  const { data, isLoading, isFetching, error, refetch } = useAiQuotaSummary(termo);
  const rows = data ?? [];
  const resumo = useMemo(() => summarizeAiQuota(data ?? []), [data]);
  const truncado = rows.length >= AI_QUOTA_SUMMARY_LIMIT;

  return (
    <Card data-testid="ai-quota-panel">
      <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Gauge className="h-4 w-4 text-primary" />
            Cota por usuário
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Consumo do mês corrente e cota efetiva de cada pessoa, calculados no banco a partir de{' '}
            <code className="text-xs">ai_usage_logs</code>.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          data-testid="ai-quota-refresh"
          disabled={isFetching}
          onClick={() => {
            void refetch();
          }}
        >
          <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading && (
          <div className="space-y-2" data-testid="ai-quota-loading">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        )}

        {!isLoading && error && (
          <div
            className="flex flex-col gap-2 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm"
            data-testid="ai-quota-error"
          >
            <div className="flex items-center gap-2 font-medium text-destructive">
              <AlertTriangle className="h-4 w-4" />
              Não foi possível carregar a cota por usuário
            </div>
            <p className="text-muted-foreground">{describeQuotaError(error)}</p>
            <div>
              <Button
                variant="outline"
                size="sm"
                data-testid="ai-quota-retry"
                onClick={() => {
                  void refetch();
                }}
              >
                Tentar de novo
              </Button>
            </div>
          </div>
        )}

        {!isLoading && !error && (
          <>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <Kpi
                icon={<Users className="h-4 w-4" />}
                label="Usuários"
                value={String(resumo.usuarios)}
                sub="com papel registrado"
                testId="ai-quota-kpi-usuarios"
              />
              <Kpi
                icon={<Gauge className="h-4 w-4" />}
                label="Ilimitados"
                value={String(resumo.ilimitados)}
                sub="sem teto mensal"
                testId="ai-quota-kpi-ilimitados"
              />
              <Kpi
                icon={<AlertTriangle className="h-4 w-4" />}
                label="Cota esgotada"
                value={String(resumo.estourados)}
                sub="bloqueados até o próximo mês"
                testId="ai-quota-kpi-esgotados"
                tone={resumo.estourados > 0 ? 'text-destructive' : 'text-primary'}
              />
              <Kpi
                icon={<Clock className="h-4 w-4" />}
                label="Chamadas pendentes"
                value={String(resumo.pendentes)}
                testId="ai-quota-kpi-pendentes"
                sub={
                  resumo.ultimaAtividade
                    ? `última atividade ${formatarData(resumo.ultimaAtividade)}`
                    : 'sem atividade registrada'
                }
              />
            </div>

            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Filtrar por e-mail ou papel…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
                aria-label="Filtrar cota por usuário"
                data-testid="ai-quota-search"
              />
            </div>

            <div className="overflow-x-auto rounded-md border border-border">
              <Table data-testid="ai-quota-tabela">
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Papel</TableHead>
                    <TableHead>Consumo do mês</TableHead>
                    <TableHead>Restante</TableHead>
                    <TableHead>Sucesso / erro</TableHead>
                    <TableHead>Pendentes</TableHead>
                    <TableHead>Última atividade</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={COLUNAS}
                        className="py-8 text-center text-muted-foreground"
                      >
                        {termo === ''
                          ? 'Nenhum usuário com papel registrado — a cota aparece aqui assim que houver usuários em user_roles.'
                          : `Nenhum usuário corresponde a "${termo}".`}
                      </TableCell>
                    </TableRow>
                  )}
                  {rows.map((row) => {
                    const percentual = usagePercent(row);
                    const esgotada = isQuotaExhausted(row);
                    return (
                      <TableRow key={`${row.userId}-${row.role}`} data-testid="ai-quota-row">
                        <TableCell className="font-medium">
                          <div>{row.email ?? `sem e-mail (${row.userId.slice(0, 8)}…)`}</div>
                          <div className="font-mono text-xs text-muted-foreground">
                            {row.userId}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={row.role === 'desconhecido' ? 'outline' : 'secondary'}>
                            {roleLabel(row.role)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div>{consumoDoMes(row)}</div>
                          {percentual !== null && (
                            <div className="text-xs text-muted-foreground">
                              {percentual}% da cota
                            </div>
                          )}
                        </TableCell>
                        <TableCell className={esgotada ? 'font-semibold text-destructive' : ''}>
                          {describeRemaining(row)}
                        </TableCell>
                        <TableCell className="text-sm">
                          <span className="text-emerald-600">{row.successMonth}</span>
                          {' / '}
                          <span className={row.errorMonth > 0 ? 'text-destructive' : ''}>
                            {row.errorMonth}
                          </span>
                        </TableCell>
                        <TableCell>{row.pendingCount}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatarData(row.lastActivity)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            <p className="text-xs text-muted-foreground">
              Chamadas <code>pending</code> com mais de 5 minutos não contam como consumo — mesma
              regra de <code>fn_ai_quota_summary</code>. Restante “ilimitado” equivale a{' '}
              <code>remaining = -1</code> no banco.
              {truncado &&
                ` Exibindo os ${AI_QUOTA_SUMMARY_LIMIT} usuários de maior consumo — refine a busca para ver os demais.`}
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
