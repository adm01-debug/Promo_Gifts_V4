/**
 * Seção "ao vivo" da página de telemetria: os três painéis que leem amostras
 * in-memory da sessão atual (invokeEdgeSafe, alertas de bridge e bridges por
 * endpoint).
 *
 * Existe como componente próprio, e não inline na página, porque
 * `AdminTelemetriaPage.tsx` já está acima do limite de 500 linhas do
 * `check-file-size-baseline` e não pode crescer: montar os dois cards novos de
 * bridge direto na página estouraria o gate. Agrupá-los aqui com o painel de
 * edge invokes, que é da mesma natureza, deixou a página MENOR do que era.
 *
 * Cada painel mantém o próprio SectionErrorBoundary: um que quebre não derruba
 * os outros dois.
 */
import { lazy, Suspense } from 'react';
import { SectionErrorBoundary } from '@/components/errors/SectionErrorBoundary';
import { BannerSkeleton, CardSkeleton } from '@/pages/admin/telemetry/TelemetrySkeletons';

const EdgeInvokeLivePanel = lazy(() =>
  import('@/components/admin/telemetry/EdgeInvokeLivePanel').then((m) => ({
    default: m.EdgeInvokeLivePanel,
  })),
);
const BridgeAlertsCard = lazy(() =>
  import('@/components/admin/telemetry/BridgeAlertsCard').then((m) => ({
    default: m.BridgeAlertsCard,
  })),
);
const BridgesLiveCard = lazy(() =>
  import('@/components/admin/telemetry/BridgesLiveCard').then((m) => ({
    default: m.BridgesLiveCard,
  })),
);

export function LiveSurfacesSection() {
  return (
    <>
      {/* Onda 21 — Painel live in-memory da superfície invokeEdgeSafe (sessão atual) */}
      <SectionErrorBoundary section="telemetry.EdgeInvokeLivePanel" label="edge invokes ao vivo">
        <Suspense fallback={<CardSkeleton height={360} label="Carregando edge invokes live" />}>
          <EdgeInvokeLivePanel />
        </Suspense>
      </SectionErrorBoundary>

      {/* Alertas configuráveis das bridges (p95 / payload) sobre as amostras da sessão */}
      <SectionErrorBoundary section="telemetry.BridgeAlertsCard" label="alertas das bridges">
        <Suspense fallback={<BannerSkeleton />}>
          <BridgeAlertsCard />
        </Suspense>
      </SectionErrorBoundary>

      {/* Bridges ao vivo — por endpoint+operação, bytes de payload e drill-down por request-id */}
      <SectionErrorBoundary section="telemetry.BridgesLiveCard" label="bridges ao vivo">
        <Suspense fallback={<CardSkeleton height={360} label="Carregando bridges ao vivo" />}>
          <BridgesLiveCard />
        </Suspense>
      </SectionErrorBoundary>
    </>
  );
}
