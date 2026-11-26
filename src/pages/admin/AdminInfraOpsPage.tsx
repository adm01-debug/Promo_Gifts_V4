/**
 * /admin/infra-ops — "Infra do Banco".
 *
 * Única tela para a telemetria operacional interna que até aqui só existia como
 * relatório/artefato de CI (E30 table size, E33 wraparound, E40 pg_stat
 * statements). Os dados vêm de `ops.*`, que é deny-all e sem GRANT: a leitura
 * passa pela RPC dev-gated `fn_dev_ops_infra_telemetry` (SECURITY DEFINER).
 *
 * Acesso: <DevRoute /> (papel dev) — a RPC também recusa com 42501.
 */
import { useState, type ReactElement } from 'react';
import { PageSEO } from '@/components/seo/PageSEO';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useOpsInfraTelemetry } from '@/hooks/admin/useOpsInfraTelemetry';
import {
  countWraparoundStatus,
  formatBytes,
  formatCapturedAt,
  formatCount,
  formatDurationMs,
  formatPct,
  formatSignedBytes,
  freshnessStatus,
  growthStatus,
  isEmptyTelemetry,
  maxGrowthBytes,
  wraparoundStatus,
  type InfraStatus,
  type OpsInfraTelemetry,
  type OpsWraparoundRow,
} from '@/lib/ops/infra-telemetry';
import { toErrorMessage } from '@/lib/to-error-message';

const STATUS_CLASS: Record<InfraStatus, string> = {
  ok: 'bg-emerald-100 text-emerald-800',
  warn: 'bg-amber-100 text-amber-900',
  critical: 'bg-red-100 text-red-800',
  unknown: 'bg-gray-100 text-gray-600',
};

const STATUS_LABEL: Record<InfraStatus, string> = {
  ok: 'ok',
  warn: 'atenção',
  critical: 'crítico',
  unknown: 'sem dado',
};

const WINDOW_OPTIONS = [7, 30, 90] as const;

function StatusPill({ status }: { status: InfraStatus }): ReactElement {
  return (
    <span
      className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${STATUS_CLASS[status]}`}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}

function Kpi({
  title,
  value,
  hint,
  status,
}: {
  title: string;
  value: string;
  hint: string;
  status?: InfraStatus;
}): ReactElement {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-gray-500">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold">{value}</span>
          {status ? <StatusPill status={status} /> : null}
        </div>
        <p className="mt-1 text-xs text-gray-500">{hint}</p>
      </CardContent>
    </Card>
  );
}

function metricHint(row: OpsWraparoundRow): string {
  if (row.value_pct !== null && row.value_pct !== undefined) {
    return `${formatPct(row.value_pct)} do limite`;
  }
  if (row.unit === 'bytes' || row.metric === 'replication_slot_retained_bytes') {
    return formatBytes(row.value_numeric);
  }
  return row.value_numeric === null ? '—' : String(row.value_numeric);
}

function Section({
  title,
  subtitle,
  empty,
  children,
}: {
  title: string;
  subtitle: string;
  empty: string;
  children: React.ReactNode;
}): ReactElement {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        <p className="text-xs text-gray-500">{subtitle}</p>
      </CardHeader>
      <CardContent>
        {children ? (
          <div className="overflow-x-auto">{children}</div>
        ) : (
          <p className="text-sm text-gray-500">{empty}</p>
        )}
      </CardContent>
    </Card>
  );
}

export default function AdminInfraOpsPage(): ReactElement {
  const [days, setDays] = useState<number>(30);
  const { data, isLoading, error, refetch } = useOpsInfraTelemetry(days);

  const telemetry: OpsInfraTelemetry | null = data ?? null;
  const risks = telemetry ? countWraparoundStatus(telemetry.wraparound) : null;
  const oldestCapture = telemetry
    ? ([
        telemetry.captured_at.table_size,
        telemetry.captured_at.pgss,
        telemetry.captured_at.wraparound,
      ]
        .filter((value): value is string => Boolean(value))
        .sort()[0] ?? null)
    : null;

  return (
    <div className="container mx-auto max-w-7xl space-y-6 px-4 py-6">
      <PageSEO
        title="Infra do Banco"
        description="Telemetria operacional do banco — crescimento de tabelas, tempo de consultas e risco de wraparound"
      />

      <header className="flex flex-wrap items-start justify-between gap-3 border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold">Infra do Banco</h1>
          <p className="text-sm text-gray-500">
            Telemetria de ops.* (E30/E33/E40) · área restrita a dev · nada aqui é exposto ao site
            público
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="infra-window" className="text-sm text-gray-600">
            Janela
          </label>
          <select
            id="infra-window"
            className="rounded border px-2 py-1 text-sm"
            value={days}
            onChange={(event) => setDays(Number(event.target.value))}
          >
            {WINDOW_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option} dias
              </option>
            ))}
          </select>
          <button
            type="button"
            className="rounded border px-3 py-1 text-sm hover:bg-gray-50"
            onClick={() => {
              refetch().catch(() => undefined);
            }}
          >
            Atualizar
          </button>
        </div>
      </header>

      {isLoading ? (
        <p className="text-sm text-gray-500">Carregando telemetria…</p>
      ) : error ? (
        <Card>
          <CardContent className="py-6">
            <p className="text-sm font-medium text-red-700">
              Não foi possível carregar a telemetria do banco.
            </p>
            <p className="mt-1 text-xs text-gray-500">{toErrorMessage(error)}</p>
            <p className="mt-2 text-xs text-gray-500">
              A RPC exige papel dev. Se a função ainda não foi aplicada no banco, rode a migration
              20261126052000 pelo workflow de DDL.
            </p>
          </CardContent>
        </Card>
      ) : !telemetry || isEmptyTelemetry(telemetry) ? (
        <Card>
          <CardContent className="py-6">
            <p className="text-sm font-medium">Nenhuma captura na janela de {days} dias.</p>
            <p className="mt-1 text-xs text-gray-500">
              As séries são preenchidas pelos crons table-size-history-daily, pgss-history-weekly e
              wraparound-toast-sequence-monitor. Se a última captura mostrada abaixo for antiga, é o
              cron que está parado — não a tela.
            </p>
            <p className="mt-2 text-xs text-gray-500">
              Última captura por série: tabelas{' '}
              {formatCapturedAt(telemetry?.captured_at.table_size)}, consultas{' '}
              {formatCapturedAt(telemetry?.captured_at.pgss)}, wraparound{' '}
              {formatCapturedAt(telemetry?.captured_at.wraparound)}
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Kpi
              title="Tabelas monitoradas"
              value={formatCount(telemetry.table_growth.length)}
              hint={`maior crescimento: ${formatSignedBytes(maxGrowthBytes(telemetry.table_growth))}`}
            />
            <Kpi
              title="Funções no snapshot"
              value={formatCount(telemetry.pgss_summary.labels)}
              hint={`${formatCount(telemetry.pgss_summary.calls)} chamadas · ${formatDurationMs(
                telemetry.pgss_summary.total_exec_time,
              )} acumulados`}
            />
            <Kpi
              title="Riscos críticos"
              value={formatCount(risks?.critical ?? 0)}
              hint={`${formatCount(risks?.warn ?? 0)} em atenção · ${formatCount(
                risks?.ok ?? 0,
              )} dentro do limite`}
              status={
                risks && risks.critical > 0 ? 'critical' : risks && risks.warn > 0 ? 'warn' : 'ok'
              }
            />
            <Kpi
              title="Captura mais antiga"
              value={formatCapturedAt(oldestCapture)}
              hint={`frescor: ${STATUS_LABEL[freshnessStatus(oldestCapture)]}`}
              status={freshnessStatus(oldestCapture)}
            />
          </div>

          <Section
            title="Crescimento de tabelas"
            subtitle={`Δ entre a primeira e a última captura na janela de ${telemetry.window_days} dias — atenção a partir de 100 MB, crítico a partir de 500 MB`}
            empty="Sem histórico de tamanho na janela."
          >
            {telemetry.table_growth.length > 0 ? (
              <table className="w-full text-left text-sm">
                <thead className="border-b text-xs text-gray-500">
                  <tr>
                    <th className="py-2">Tabela</th>
                    <th className="py-2 text-right">Início</th>
                    <th className="py-2 text-right">Agora</th>
                    <th className="py-2 text-right">Variação</th>
                    <th className="py-2 text-right">Linhas vivas</th>
                    <th className="py-2 text-right">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {telemetry.table_growth.map((row) => (
                    <tr
                      key={`${row.schema_name}.${row.table_name}`}
                      className="border-b last:border-0"
                    >
                      <td className="py-1.5 font-mono text-xs">
                        {row.schema_name}.{row.table_name}
                      </td>
                      <td className="py-1.5 text-right">{formatBytes(row.first_bytes)}</td>
                      <td className="py-1.5 text-right">{formatBytes(row.last_bytes)}</td>
                      <td className="py-1.5 text-right">{formatSignedBytes(row.delta_bytes)}</td>
                      <td className="py-1.5 text-right">{formatCount(row.live_tup)}</td>
                      <td className="py-1.5 text-right">
                        <StatusPill status={growthStatus(row.delta_bytes)} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : null}
          </Section>

          <Section
            title="Consultas mais caras"
            subtitle={`Último snapshot de pg_stat_statements (${formatCapturedAt(
              telemetry.captured_at.pgss,
            )}) — tempo total acumulado`}
            empty="Sem snapshot de pg_stat_statements."
          >
            {telemetry.pgss_top.length > 0 ? (
              <table className="w-full text-left text-sm">
                <thead className="border-b text-xs text-gray-500">
                  <tr>
                    <th className="py-2">Função / query</th>
                    <th className="py-2 text-right">Chamadas</th>
                    <th className="py-2 text-right">Tempo total</th>
                    <th className="py-2 text-right">Média</th>
                    <th className="py-2 text-right">Máximo</th>
                  </tr>
                </thead>
                <tbody>
                  {telemetry.pgss_top.map((row, index) => (
                    <tr key={`${row.label}-${index}`} className="border-b last:border-0">
                      <td className="py-1.5 font-mono text-xs">{row.label}</td>
                      <td className="py-1.5 text-right">{formatCount(row.calls)}</td>
                      <td className="py-1.5 text-right">{formatDurationMs(row.total_exec_time)}</td>
                      <td className="py-1.5 text-right">{formatDurationMs(row.mean_exec_time)}</td>
                      <td className="py-1.5 text-right">{formatDurationMs(row.max_exec_time)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : null}
          </Section>

          <Section
            title="Risco operacional"
            subtitle={`Wraparound de xid/mxid, uso de sequence e WAL retido por replication slot (${formatCapturedAt(
              telemetry.captured_at.wraparound,
            )}) — atenção a partir de 75% do limite, crítico a partir de 90%`}
            empty="Sem leituras do monitor de wraparound."
          >
            {telemetry.wraparound.length > 0 ? (
              <table className="w-full text-left text-sm">
                <thead className="border-b text-xs text-gray-500">
                  <tr>
                    <th className="py-2">Métrica</th>
                    <th className="py-2">Objeto</th>
                    <th className="py-2 text-right">Valor</th>
                    <th className="py-2 text-right">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {telemetry.wraparound.map((row, index) => (
                    <tr
                      key={`${row.metric}-${row.object_name}-${index}`}
                      className="border-b last:border-0"
                    >
                      <td className="py-1.5 font-mono text-xs">{row.metric}</td>
                      <td className="py-1.5 font-mono text-xs">{row.object_name}</td>
                      <td className="py-1.5 text-right">{metricHint(row)}</td>
                      <td className="py-1.5 text-right">
                        <StatusPill status={wraparoundStatus(row)} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : null}
          </Section>
        </>
      )}
    </div>
  );
}
