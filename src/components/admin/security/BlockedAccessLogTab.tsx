/**
 * BlockedAccessLogTab — tela de auditoria de `public.access_blocked_log`
 * (aba "Bloqueios" de /admin/seguranca-acesso).
 *
 * Fecha o buraco entre backend e UI: a tabela é alimentada em produção por
 * `fn_check_login_allowed` (chamada pela edge function `check-login`) e pelas
 * edge functions `check-login` e `validate-access`, mas nenhuma tela lia esses
 * registros — a página de segurança já tinha 9 abas e nenhuma consumia a
 * tabela. Sem isso, "usuário legítimo bloqueado" só se resolvia por SQL.
 *
 * Leitura pura: a tabela é append-only (sem policy de UPDATE/DELETE), então
 * não existe ação de escrita aqui. O desbloqueio continua sendo operação de
 * banco/edge function.
 */
import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AlertTriangle, Download, RefreshCw, ShieldAlert } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { useBlockedAccessLog } from '@/hooks/security/useBlockedAccessLog';
import {
  BLOCKED_ACCESS_ALL_REASONS,
  BLOCKED_ACCESS_PERIODS,
  BLOCKED_ACCESS_PERIOD_LABELS,
  DEFAULT_BLOCKED_ACCESS_FILTERS,
  SEVERITY_LABELS,
  buildBlockedAccessCsv,
  describeBlockReason,
  filterBlockedAccess,
  formatBlockedAccessLocation,
  isCatalogedBlockReason,
  listBlockedAccessReasons,
  sortBlockedAccess,
  summarizeBlockedAccess,
  truncateUserAgent,
  type BlockedAccessFilters,
  type BlockedAccessRow,
  type BlockedAccessSeverity,
} from '@/lib/security/blockedAccess';

const SEVERITY_CLASS: Record<BlockedAccessSeverity, string> = {
  atencao: 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300',
  critico: 'border-destructive/40 bg-destructive/10 text-destructive',
  info: 'border-muted-foreground/30 bg-muted text-muted-foreground',
};

const MAX_ROWS_RENDERED = 200;

function formatMoment(value: string): string {
  const ts = Date.parse(value);
  if (Number.isNaN(ts)) return '—';
  return format(new Date(ts), 'dd/MM/yyyy HH:mm:ss', { locale: ptBR });
}

function downloadCsv(rows: BlockedAccessRow[], period: string): void {
  const csv = buildBlockedAccessCsv(rows);
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `acessos-bloqueados-${period}-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

interface KpiCardProps {
  label: string;
  value: number;
  hint?: string;
  tone?: 'default' | 'warning';
}

function KpiCard({ label, value, hint, tone = 'default' }: KpiCardProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>{label}</CardDescription>
        <CardTitle className={tone === 'warning' ? 'text-warning' : undefined}>{value}</CardTitle>
      </CardHeader>
      {hint ? (
        <CardContent className="pt-0 text-xs text-muted-foreground">{hint}</CardContent>
      ) : null}
    </Card>
  );
}

export function BlockedAccessLogTab() {
  const [filters, setFilters] = useState<BlockedAccessFilters>(DEFAULT_BLOCKED_ACCESS_FILTERS);
  const { rows, limit, isLoading, error, refetch } = useBlockedAccessLog();
  const nowMs = useMemo(() => Date.now(), []);

  const periodScoped = useMemo(
    () => filterBlockedAccess(rows, { ...filters, reason: BLOCKED_ACCESS_ALL_REASONS }, nowMs),
    [rows, filters, nowMs],
  );

  const visible = useMemo(() => {
    const scoped =
      filters.reason === BLOCKED_ACCESS_ALL_REASONS
        ? periodScoped
        : periodScoped.filter((row) => row.block_reason === filters.reason);
    return sortBlockedAccess(scoped);
  }, [periodScoped, filters.reason]);

  const summary = useMemo(() => summarizeBlockedAccess(periodScoped, nowMs), [periodScoped, nowMs]);
  const reasonOptions = useMemo(() => listBlockedAccessReasons(periodScoped), [periodScoped]);
  const rendered = visible.slice(0, MAX_ROWS_RENDERED);
  const truncated = rows.length >= limit;

  if (isLoading) {
    return (
      <div className="space-y-3" data-testid="blocked-access-loading">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <Card data-testid="blocked-access-error">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" /> Não foi possível carregar os
            acessos bloqueados
          </CardTitle>
          <CardDescription>
            {error.message} — a leitura exige perfil de administrador (policy{' '}
            <code>access_blocked_log_admin_read</code>).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" onClick={refetch} data-testid="blocked-access-retry">
            <RefreshCw className="mr-2 h-4 w-4" /> Tentar novamente
          </Button>
        </CardContent>
      </Card>
    );
  }

  const variantLabel =
    filters.period === 'tudo'
      ? 'todo o período carregado'
      : BLOCKED_ACCESS_PERIOD_LABELS[filters.period];

  return (
    <div className="space-y-3" data-testid="blocked-access-tab">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <KpiCard label="Bloqueios no filtro" value={summary.total} hint={variantLabel} />
        <KpiCard label="Últimas 24h" value={summary.last24h} />
        <KpiCard label="Últimos 7 dias" value={summary.last7d} />
        <KpiCard label="IPs distintos" value={summary.uniqueIps} />
        <KpiCard
          label="Gravidade crítica"
          value={summary.critical}
          tone={summary.critical > 0 ? 'warning' : 'default'}
          hint="IP fora de whitelist, país bloqueado ou padrão suspeito"
        />
      </div>

      {truncated ? (
        <Card>
          <CardContent className="pt-6 text-sm text-muted-foreground">
            Mostrando os {limit} registros mais recentes. Reduza o período para auditar o histórico
            anterior.
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader className="gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5" /> Acessos bloqueados
            </CardTitle>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={refetch}
                data-testid="blocked-access-refresh"
              >
                <RefreshCw className="mr-2 h-4 w-4" /> Atualizar
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={visible.length === 0}
                onClick={() => {
                  downloadCsv(visible, filters.period);
                }}
                data-testid="blocked-access-csv"
              >
                <Download className="mr-2 h-4 w-4" /> Baixar CSV
              </Button>
            </div>
          </div>
          <CardDescription>
            Registros gravados pelas rotinas de bloqueio de login (`fn_check_login_allowed`,
            `check-login`, `validate-access`). Use o e-mail ou o IP do cliente para localizar o
            bloqueio e o motivo.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-end gap-2">
            <div className="min-w-[220px] flex-1">
              <Input
                placeholder="Buscar por e-mail, IP, cidade, país ou navegador"
                value={filters.search}
                onChange={(event) => {
                  setFilters((current) => ({ ...current, search: event.target.value }));
                }}
                aria-label="Buscar acessos bloqueados"
                data-testid="blocked-access-search"
              />
            </div>
            <div className="flex flex-wrap gap-1">
              {reasonOptions.length > 0 ? (
                <Button
                  variant={filters.reason === BLOCKED_ACCESS_ALL_REASONS ? 'secondary' : 'outline'}
                  size="sm"
                  onClick={() => {
                    setFilters((current) => ({ ...current, reason: BLOCKED_ACCESS_ALL_REASONS }));
                  }}
                >
                  Todos os motivos ({summary.total})
                </Button>
              ) : null}
              {reasonOptions.map((option) => (
                <Button
                  key={option.reason}
                  variant={filters.reason === option.reason ? 'secondary' : 'outline'}
                  size="sm"
                  className={SEVERITY_CLASS[option.severity]}
                  title={option.description}
                  aria-pressed={filters.reason === option.reason}
                  onClick={() => {
                    setFilters((current) => ({ ...current, reason: option.reason }));
                  }}
                >
                  {option.label} ({option.count})
                </Button>
              ))}
            </div>
            <div className="flex flex-wrap gap-1">
              {BLOCKED_ACCESS_PERIODS.map((period) => (
                <Button
                  key={period}
                  variant={filters.period === period ? 'secondary' : 'outline'}
                  size="sm"
                  aria-pressed={filters.period === period}
                  onClick={() => {
                    setFilters((current) => ({ ...current, period }));
                  }}
                >
                  {BLOCKED_ACCESS_PERIOD_LABELS[period]}
                </Button>
              ))}
            </div>
          </div>

          {rows.length === 0 ? (
            <div
              className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground"
              data-testid="blocked-access-empty"
            >
              Nenhum acesso bloqueado registrado. Isso é o esperado quando os controles de whitelist
              estão desativados e ninguém estourou o limite de tentativas.
            </div>
          ) : null}

          {rows.length > 0 && visible.length === 0 ? (
            <div
              className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground"
              data-testid="blocked-access-no-match"
            >
              Nenhum registro para este filtro.
            </div>
          ) : null}

          {rendered.length > 0 ? (
            <div className="overflow-x-auto" data-testid="blocked-access-table">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Quando</TableHead>
                    <TableHead>E-mail</TableHead>
                    <TableHead>IP</TableHead>
                    <TableHead>Local</TableHead>
                    <TableHead>Motivo</TableHead>
                    <TableHead>Navegador</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rendered.map((row) => {
                    const info = describeBlockReason(row.block_reason);
                    const cataloged = isCatalogedBlockReason(row.block_reason);
                    return (
                      <TableRow key={row.id}>
                        <TableCell className="whitespace-nowrap text-xs">
                          {formatMoment(row.created_at)}
                        </TableCell>
                        <TableCell className="text-xs">{row.email ?? '—'}</TableCell>
                        <TableCell className="font-mono text-xs">{row.ip_address}</TableCell>
                        <TableCell className="text-xs">
                          {formatBlockedAccessLocation(row)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={SEVERITY_CLASS[info.severity]}
                            title={info.description}
                          >
                            {cataloged ? null : <AlertTriangle className="mr-1 h-3 w-3" />}
                            {info.label}
                          </Badge>
                          <span className="mt-1 block font-mono text-[10px] text-muted-foreground">
                            {row.block_reason} · {SEVERITY_LABELS[info.severity]}
                          </span>
                        </TableCell>
                        <TableCell
                          className="max-w-[260px] text-xs text-muted-foreground"
                          title={row.user_agent ?? ''}
                        >
                          {truncateUserAgent(row.user_agent)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              <p className="pt-2 text-xs text-muted-foreground" data-testid="blocked-access-count">
                {visible.length} registro(s)
                {visible.length > rendered.length
                  ? ` — exibindo os ${rendered.length} mais recentes`
                  : ''}
              </p>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {reasonOptions.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Por que cada bloqueio acontece</CardTitle>
            <CardDescription>
              Tradução dos motivos gravados pelo sistema de segurança
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {reasonOptions.map((option) => (
              <div key={option.reason} className="flex flex-wrap items-baseline gap-2 text-sm">
                <Badge variant="outline" className={SEVERITY_CLASS[option.severity]}>
                  {option.label}
                </Badge>
                <span className="text-muted-foreground">{option.description}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
