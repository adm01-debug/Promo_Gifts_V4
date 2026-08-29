import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import SimulationPage from '@/pages/Simulation';
import { invokeEdge } from '@/lib/edge/safeInvokeCall';
import { toast } from 'sonner';

vi.mock('@/lib/edge/safeInvokeCall', () => ({ invokeEdge: vi.fn() }));
vi.mock('sonner', () => ({
  toast: { success: vi.fn(), warning: vi.fn(), error: vi.fn() },
}));

describe('SimulationPage blocked plan', () => {
  beforeEach(() => vi.clearAllMocks());

  it('descreve o plano sem afirmar que carga real foi executada', async () => {
    vi.mocked(invokeEdge).mockResolvedValue({
      data: {
        id: 'run-ephemeral',
        status: 'blocked',
        requestedScenarios: 500,
        totalScenarios: 3,
        successes: 0,
        failures: 3,
        skipped: 3,
        startTime: '2026-08-29T10:00:00.000Z',
        endTime: '2026-08-29T10:00:01.000Z',
        consistencyChecks: { passed: 0, failed: 0 },
        details: [],
        latencies: [],
      },
      error: null,
    });

    render(<SimulationPage />);
    fireEvent.click(screen.getByRole('button', { name: /plano de carga/i }));

    await waitFor(() =>
      expect(invokeEdge).toHaveBeenCalledWith(
        'simulation-orchestrator',
        expect.objectContaining({ body: { count: 500, mode: 'load' } }),
      ),
    );
    expect(await screen.findByRole('status')).toHaveTextContent('nenhuma carga real foi executada');
    expect(toast.warning).toHaveBeenCalled();
    expect(toast.success).not.toHaveBeenCalled();
  });
});
