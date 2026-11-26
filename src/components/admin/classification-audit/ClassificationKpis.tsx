import { Skeleton } from '@/components/ui/skeleton';
import { formatarDataHora, type ClassificationSummary } from '@/lib/admin/classificationAudit';

function Kpi({
  label,
  value,
  sub,
  testId,
  tone,
}: {
  label: string;
  value: number | string;
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

/** KPIs da trilha: os dois recortes de negócio (gaps e kits) mais conflitos e volume. */
export function ClassificationKpis({
  summary,
  isLoading,
}: {
  summary: ClassificationSummary;
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div
        className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6"
        data-testid="classification-kpis-loading"
      >
        {[0, 1, 2, 3, 4, 5].map((indice) => (
          <Skeleton key={indice} className="h-20 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
      <Kpi
        label="Sugestões"
        value={summary.totalSugestoes}
        sub="na trilha"
        testId="classification-kpi-total"
      />
      <Kpi
        label="Gaps"
        value={summary.naoAtribuidas}
        sub="categoria ainda não aplicada"
        testId="classification-kpi-gaps"
        tone="text-warning"
      />
      <Kpi
        label="Alta confiança"
        value={summary.altaConfianca}
        sub="4+ matches e gap"
        testId="classification-kpi-alta-confianca"
        tone="text-success"
      />
      <Kpi
        label="Kits"
        value={summary.kitsParaRevisao}
        sub="kit/conjunto para revisão"
        testId="classification-kpi-kits"
      />
      <Kpi
        label="Conflitos"
        value={summary.conflitos}
        sub="material ou tipo divergente"
        testId="classification-kpi-conflitos"
        tone="text-destructive"
      />
      <Kpi
        label="Última análise"
        value={formatarDataHora(summary.ultimaAnalise)}
        sub="momento do cálculo"
        testId="classification-kpi-ultima-analise"
      />
    </div>
  );
}
