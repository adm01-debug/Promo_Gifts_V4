/**
 * Guarda de montagem dos painéis de falha de plataforma.
 *
 * O modo de falha recorrente deste repositório é: a funcionalidade volta, o
 * teste unitário dela é escrito, e ninguém guarda o PONTO DE MONTAGEM — então
 * o componente some de novo numa refatoração e nenhum teste acusa. Foi
 * exatamente o que aconteceu com `usePlatformFailureMetrics` e
 * `usePlatformFailureAlert`: hooks completos na main, com threshold, throttle e
 * persistência, e nenhuma tela consumindo.
 *
 * Por isso este arquivo tem duas camadas:
 *  - comportamento dos dois componentes, com o hook mockado;
 *  - contrato de montagem: `LiveSurfacesSection` precisa importar os dois, e
 *    `AdminTelemetriaPage` precisa montar a seção.
 */
import { readFileSync } from 'node:fs';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { PlatformFailureMetrics } from '@/pages/admin/telemetry/usePlatformFailureMetrics';

const METRICS: PlatformFailureMetrics = {
  windowMinutes: 60,
  totalCalls: 1234,
  total503: 7,
  totalColdStarts: 3,
  rate503Pct: 0.57,
  rateColdStartPct: 0.24,
  lastColdStartAt: new Date('2026-11-18T18:00:00Z').toISOString(),
  prevWindow503: 2,
  delta503: 5,
};

vi.mock('@/pages/admin/telemetry/usePlatformFailureMetrics', () => ({
  usePlatformFailureMetrics: () => ({ data: METRICS, isLoading: false }),
}));

vi.mock('@/pages/admin/telemetry/usePlatformFailureAlert', () => ({
  DEFAULT_ALERT_CONFIG: {
    threshold503Pct: 5,
    thresholdColdStartPct: 10,
    minSamples: 20,
    enabled: true,
  },
  usePlatformFailureAlert: () => ({
    level: 'breach_503' as const,
    metrics: METRICS,
    config: {
      threshold503Pct: 5,
      thresholdColdStartPct: 10,
      minSamples: 20,
      enabled: true,
    },
    reason: 'taxa de 503 acima do limite',
    setConfig: vi.fn(),
  }),
}));

describe('painéis de falha de plataforma', () => {
  it('os cards mostram os três KPIs da janela com os números do hook', async () => {
    const { PlatformFailureCards } =
      await import('@/components/admin/telemetry/PlatformFailureCards');
    render(<PlatformFailureCards />);

    expect(screen.getByText('7')).toBeInTheDocument();
    expect(screen.getByText('0.57%')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('0.24%')).toBeInTheDocument();
    expect(screen.getByText('1.234')).toBeInTheDocument();
  });

  it('o banner acusa a quebra e diz o motivo que o hook devolveu', async () => {
    const { PlatformFailureAlertBanner } =
      await import('@/components/admin/telemetry/PlatformFailureAlertBanner');
    render(<PlatformFailureAlertBanner />);

    expect(screen.getByText(/taxa de 503 acima do limite/i)).toBeInTheDocument();
  });

  it('a LiveSurfacesSection monta os dois — é o que faltava antes do resgate', () => {
    const secao = readFileSync('src/components/admin/telemetry/LiveSurfacesSection.tsx', 'utf8');
    expect(secao).toContain('<PlatformFailureAlertBanner />');
    expect(secao).toContain('<PlatformFailureCards />');
  });

  it('a página de telemetria monta a seção', () => {
    const pagina = readFileSync('src/pages/admin/AdminTelemetriaPage.tsx', 'utf8');
    expect(pagina).toContain('<LiveSurfacesSection />');
  });
});
