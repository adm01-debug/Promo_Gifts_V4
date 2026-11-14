/**
 * IntegrationsHealthCard — Onda 9
 * Card read-only no topo de /admin/conexoes com auto-refresh 60s.
 * Mostra saúde agregada de webhooks, conexões e MCP keys.
 *
 * Estado, leitura e ações vivem em ./useIntegrationsHealthCard (extração feita
 * para respeitar o gate de tamanho de arquivo — sem mudança de comportamento).
 */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Activity,
  Webhook,
  CheckCircle2,
  AlertTriangle,
  KeyRound,
  Clock,
  RefreshCw,
  ShieldCheck,
  Loader2,
  Bot,
  Database,
  Minus,
  Trash2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import type { SecretStatus } from '@/hooks/admin';
import { useIntegrationsHealthCard } from './useIntegrationsHealthCard';

const STATUS_BADGE_CLASSES = {
  success: 'bg-success/10 text-success border-success/20',
  warning: 'bg-warning/10 text-warning border-warning/20',
  destructive: 'bg-destructive/10 text-destructive border-destructive/20',
  muted: 'bg-muted text-muted-foreground border-border',
} as const;

const METRIC_ICON_CLASSES = {
  default: 'text-muted-foreground',
  success: 'text-success',
  warning: 'text-warning',
  destructive: 'text-destructive',
} as const;

function StatusBadge({
  tone,
  children,
}: {
  tone: 'destructive' | 'muted' | 'success' | 'warning';
  children: React.ReactNode;
}) {
  const cls = STATUS_BADGE_CLASSES[tone];
  return (
    <Badge variant="outline" className={cn('font-medium', cls)}>
      {children}
    </Badge>
  );
}

interface MetricProps {
  icon: React.ElementType;
  label: string;
  value: string;
  badge?: React.ReactNode;
  tone?: 'default' | 'destructive' | 'success' | 'warning';
}

function Metric({ icon: iconElement, label, value, badge, tone = 'default' }: MetricProps) {
  const Icon = iconElement;
  const iconCls = METRIC_ICON_CLASSES[tone];

  return (
    <div className="flex flex-col gap-1.5 rounded-lg border border-border/50 bg-muted/30 p-3">
      <div className="flex items-center justify-between">
        <Icon className={cn('h-4 w-4', iconCls)} aria-hidden="true" />
        {badge}
      </div>
      <div>
        <p className="text-xl font-bold leading-tight">{value}</p>
        <p className="mt-0.5 text-[11px] leading-tight text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

const SOURCE_COUNT_CHIP_CLS: Record<'muted' | 'success' | 'warning', string> = {
  success: 'border-success/30 bg-success/10 text-success hover:bg-success/15',
  warning: 'border-warning/40 bg-warning/10 text-warning hover:bg-warning/15',
  muted: 'border-border bg-muted text-muted-foreground hover:bg-muted/70',
} as const;

function SourceCountChip({
  icon: iconElement,
  tone,
  count,
  label,
  onClick,
  emphasize,
}: {
  icon: React.ElementType;
  tone: 'muted' | 'success' | 'warning';
  count: number;
  label: string;
  onClick: () => void;
  emphasize?: boolean;
}) {
  const Icon = iconElement;
  const cls = SOURCE_COUNT_CHIP_CLS[tone];
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium tabular-nums transition-colors',
        cls,
        emphasize && 'ring-1 ring-warning/40',
      )}
    >
      <Icon className="h-3 w-3" />
      <span className="font-semibold">{count}</span> {label}
    </button>
  );
}

export function IntegrationsHealthCard({ secrets = [] }: { secrets?: SecretStatus[] }) {
  const {
    data,
    isLoading,
    isFetching,
    refetch,
    auditing,
    runningRealActions,
    realActionsConfirmOpen,
    setRealActionsConfirmOpen,
    pendingDestructiveCounts,
    sourceCounts,
    setFilter,
    handleAudit,
    handleOpenRealActionsConfirm,
    handleConfirmRealActions,
    successTone,
    failingTone,
  } = useIntegrationsHealthCard(secrets);

  return (
    <>
      <ConfirmDialog
        open={realActionsConfirmOpen}
        onOpenChange={setRealActionsConfirmOpen}
        variant="destructive"
        title="Reenviar webhooks e apagar logs antigos?"
        description={`Isso vai reenviar até ${pendingDestructiveCounts?.retryCandidates ?? 0} webhook(s) falhado(s) na última hora e apagar ${pendingDestructiveCounts?.oldLogs ?? 0} log(s) de webhook com mais de 90 dias. Ação real em sistemas externos e no banco, sem volta.`}
        confirmLabel="Executar"
        cancelLabel="Cancelar"
        onConfirm={handleConfirmRealActions}
        loading={runningRealActions}
        testId="connections-hub-real-actions-confirm"
      />
      <Card className="border-primary/10">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="h-4 w-4 text-primary" aria-hidden="true" />
              Saúde das Integrações
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleAudit}
                disabled={auditing}
                className="h-7 text-xs"
                title="Verificação somente leitura — não reenvia webhooks nem apaga logs"
              >
                {auditing ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <ShieldCheck className="h-3 w-3" />
                )}
                Rodar auditoria
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleOpenRealActionsConfirm}
                disabled={runningRealActions}
                className="h-7 text-xs"
                title="Ação real: reenvia webhooks falhados e apaga logs antigos (pede confirmação)"
              >
                {runningRealActions ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Trash2 className="h-3 w-3" />
                )}
                Retry + limpeza real
              </Button>
              <button
                type="button"
                onClick={() => refetch()}
                className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
                aria-label="Atualizar saúde das integrações"
              >
                <RefreshCw className={cn('h-3 w-3', isFetching && 'animate-spin')} />
                {isFetching ? 'Atualizando…' : 'Auto 60s'}
              </button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {data && (data.staleSecrets > 0 || data.autoDisabledWebhooks > 0) && (
            <div className="flex flex-wrap gap-2">
              {data.staleSecrets > 0 && (
                <div className="flex items-center gap-2 rounded-md border border-warning/20 bg-warning/10 px-3 py-1.5 text-xs text-warning">
                  <AlertTriangle className="h-3 w-3" />
                  {data.staleSecrets} {data.staleSecrets === 1 ? 'credencial' : 'credenciais'} sem
                  rotação há &gt;90 dias
                </div>
              )}
              {data.autoDisabledWebhooks > 0 && (
                <div className="flex items-center gap-2 rounded-md border border-destructive/20 bg-destructive/10 px-3 py-1.5 text-xs text-destructive">
                  <AlertTriangle className="h-3 w-3" />
                  {data.autoDisabledWebhooks} webhook(s) desativados pelo circuit breaker
                </div>
              )}
            </div>
          )}
          {isLoading || !data ? (
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-20 animate-pulse rounded-lg bg-muted/30" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
              <Metric
                icon={Webhook}
                label="Webhooks ativos"
                value={`${data.activeWebhooks}/${data.totalWebhooks}`}
                tone={data.activeWebhooks > 0 ? 'success' : 'default'}
              />
              <Metric
                icon={CheckCircle2}
                label={`Sucesso 24h (${data.totalDeliveries24h} envios)`}
                value={data.successRate24h === null ? '—' : `${data.successRate24h.toFixed(1)}%`}
                tone={successTone}
                badge={
                  data.successRate24h !== null && (
                    <StatusBadge
                      tone={
                        successTone === 'success'
                          ? 'success'
                          : successTone === 'warning'
                            ? 'warning'
                            : 'destructive'
                      }
                    >
                      {successTone === 'success'
                        ? 'OK'
                        : successTone === 'warning'
                          ? 'Atenção'
                          : 'Crítico'}
                    </StatusBadge>
                  )
                }
              />
              <Metric
                icon={Clock}
                label="Última entrega bem-sucedida"
                value={
                  data.lastSuccessAt
                    ? formatDistanceToNow(new Date(data.lastSuccessAt), {
                        locale: ptBR,
                        addSuffix: true,
                      })
                    : 'Nunca'
                }
              />
              <Metric
                icon={AlertTriangle}
                label="Conexões com falha"
                value={String(data.failingConnections)}
                tone={failingTone}
                badge={
                  data.failingConnections > 0 ? (
                    <StatusBadge tone="destructive">Verificar</StatusBadge>
                  ) : (
                    <StatusBadge tone="success">OK</StatusBadge>
                  )
                }
              />
              <Metric
                icon={KeyRound}
                label="Chaves MCP usadas (24h)"
                value={String(data.mcpKeysUsed24h)}
                tone={data.mcpKeysUsed24h > 0 ? 'success' : 'default'}
              />
            </div>
          )}
          {sourceCounts.total > 0 && (
            <div className="flex flex-wrap items-center gap-2 border-t border-border/40 pt-1 text-[11px]">
              <span className="text-muted-foreground">Origem das credenciais:</span>
              <SourceCountChip
                icon={Database}
                tone="success"
                count={sourceCounts.db}
                label="no banco"
                onClick={() => setFilter('db')}
              />
              <SourceCountChip
                icon={AlertTriangle}
                tone="warning"
                count={sourceCounts.env}
                label={sourceCounts.env === 1 ? 'ainda em ENV' : 'ainda em ENV'}
                onClick={() => setFilter('env')}
                emphasize={sourceCounts.env > 0}
              />
              <SourceCountChip
                icon={Minus}
                tone="muted"
                count={sourceCounts.none}
                label={sourceCounts.none === 1 ? 'vazia' : 'vazias'}
                onClick={() => setFilter('none')}
              />
              {sourceCounts.env > 0 && (
                <span className="ml-1 text-warning">↳ recomendado migrar para o banco</span>
              )}
            </div>
          )}
          {data && (
            <div className="flex items-center justify-between gap-2 border-t border-border/40 pt-1 text-[11px] text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <Bot className="h-3 w-3" aria-hidden="true" />
                Última auto-verificação:{' '}
                <span className="tabular-nums text-foreground">
                  {data.lastAutoTestAt
                    ? formatDistanceToNow(new Date(data.lastAutoTestAt), {
                        locale: ptBR,
                        addSuffix: true,
                      })
                    : 'aguardando 1ª execução'}
                </span>
              </span>
              {data.autoTestOkLastHour + data.autoTestFailLastHour > 0 && (
                <span className="tabular-nums">
                  Última hora:{' '}
                  <span className="font-medium text-success">{data.autoTestOkLastHour} OK</span>
                  {data.autoTestFailLastHour > 0 && (
                    <>
                      {' · '}
                      <span className="font-medium text-destructive">
                        {data.autoTestFailLastHour} falha
                        {data.autoTestFailLastHour === 1 ? '' : 's'}
                      </span>
                    </>
                  )}
                </span>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
