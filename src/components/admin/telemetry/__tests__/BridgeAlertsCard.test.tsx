/**
 * Cobertura do card de alertas das bridges (/admin/telemetria):
 *  - amostras abaixo de `minSamples` não produzem alerta;
 *  - p95 >= `p95CritMs` produz alerta crítico;
 *  - o toast dispara UMA única vez por chave de alerta (seenRef).
 */
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { toast } from 'sonner';
import { BridgeAlertsCard } from '../BridgeAlertsCard';
import { clearBridgeSamples, recordBridgeCall } from '@/lib/telemetry/bridgeCallMetrics';
import { setInstrumentationPaused } from '@/lib/telemetry/instrumentationControl';
import { DEFAULT_THRESHOLDS, resetThresholds } from '@/lib/telemetry/bridgeAlertThresholds';

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    warning: vi.fn(),
    success: vi.fn(),
  },
}));

const BRIDGE = 'crm-db-bridge' as const;
const { p95CritMs: CRIT_MS, minSamples: MIN_SAMPLES } = DEFAULT_THRESHOLDS[BRIDGE];

function recordSlowCalls(count: number): void {
  for (let i = 0; i < count; i++) {
    recordBridgeCall({
      bridge: BRIDGE,
      op: 'select',
      target: 'clientes',
      durationMs: CRIT_MS + 1000,
      reqBytes: 120,
      respBytes: 480,
      ok: true,
    });
  }
}

describe('BridgeAlertsCard', () => {
  beforeEach(() => {
    // O emit de bridgeCallMetrics é throttled em setTimeout(100ms); com timers
    // falsos o flush não dispara re-render fora de act() depois do teste.
    vi.useFakeTimers();
    vi.clearAllMocks();
    // Kill-switch global vem pausado por padrão: sem isto recordBridgeCall é no-op.
    setInstrumentationPaused(false);
    clearBridgeSamples();
    resetThresholds();
  });

  afterEach(() => {
    clearBridgeSamples();
    setInstrumentationPaused(true);
    vi.useRealTimers();
  });

  it('não alerta enquanto a contagem fica abaixo de minSamples', () => {
    recordSlowCalls(MIN_SAMPLES - 1);

    render(<BridgeAlertsCard />);

    expect(screen.getByText(/Nenhum limiar excedido/i)).toBeInTheDocument();
    expect(screen.queryByText('CRÍTICO')).not.toBeInTheDocument();
    expect(toast.error).not.toHaveBeenCalled();
    expect(toast.warning).not.toHaveBeenCalled();
  });

  it('marca alerta crítico quando p95 atinge p95CritMs', () => {
    recordSlowCalls(MIN_SAMPLES);

    render(<BridgeAlertsCard />);

    expect(screen.getByText('CRÍTICO')).toBeInTheDocument();
    expect(screen.queryByText(/Nenhum limiar excedido/i)).not.toBeInTheDocument();
    expect(toast.error).toHaveBeenCalledTimes(1);
    expect(toast.error).toHaveBeenCalledWith(
      expect.stringContaining(`[${BRIDGE}] p95 crítico em select`),
      expect.objectContaining({ description: `${MIN_SAMPLES} amostras` }),
    );
    expect(toast.warning).not.toHaveBeenCalled();
  });

  it('dispara o toast uma única vez por chave de alerta', () => {
    recordSlowCalls(MIN_SAMPLES);

    const { rerender } = render(<BridgeAlertsCard />);
    expect(toast.error).toHaveBeenCalledTimes(1);

    // Nova amostra do mesmo bridge+op mantém a mesma chave de alerta.
    recordSlowCalls(1);
    rerender(<BridgeAlertsCard />);

    expect(screen.getByText('CRÍTICO')).toBeInTheDocument();
    expect(toast.error).toHaveBeenCalledTimes(1);
  });
});
