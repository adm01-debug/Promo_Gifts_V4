/**
 * DevOnlyBridgeOverlay — wrapper atual que exige o papel `dev` (QA #619).
 *
 * Valida:
 *  - Não-dev: retorna null (sem montar o overlay, sem disparar o lazy import).
 *  - Dev: monta o overlay (via Suspense) — fallback null durante o load.
 *  - Papel dev preserva o acesso do wrapper, que não consulta isAllowed.
 *  - Override de infraestrutura não substitui o papel dev obrigatório.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DevOnlyBridgeOverlay } from '@/components/dev/DevOnlyBridgeOverlay';

import { useDevGate } from '@/hooks/admin';

vi.mock('@/hooks/admin', () => ({
  useDevGate: vi.fn(),
}));

// O marcador isola o limite lazy; o overlay real e seu hook são exercitados
// pela suíte tests/unit/system/BridgeMetricsOverlay.test.tsx.
vi.mock('@/components/dev/BridgeMetricsOverlay', () => ({
  default: () => <div data-testid="bridge-metrics-overlay-mock">overlay</div>,
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('DevOnlyBridgeOverlay — gate atual por papel dev', () => {
  it('NÃO renderiza overlay para usuário não-dev (default do gate)', () => {
    vi.mocked(useDevGate).mockReturnValue({ isAllowed: false, isDev: false });
    const { container } = render(<DevOnlyBridgeOverlay />);
    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByTestId('bridge-metrics-overlay-mock')).not.toBeInTheDocument();
  });

  it('renderiza overlay para usuário dev (gate aprovado por role)', async () => {
    vi.mocked(useDevGate).mockReturnValue({ isAllowed: true, isDev: true });
    render(<DevOnlyBridgeOverlay />);
    expect(await screen.findByTestId('bridge-metrics-overlay-mock')).toBeInTheDocument();
  });

  it('mantém o acesso do papel dev independentemente do flag isAllowed', async () => {
    vi.mocked(useDevGate).mockReturnValue({ isAllowed: false, isDev: true });
    render(<DevOnlyBridgeOverlay />);
    expect(await screen.findByTestId('bridge-metrics-overlay-mock')).toBeInTheDocument();
  });

  it('override de infraestrutura não libera usuário sem papel dev', () => {
    vi.mocked(useDevGate).mockReturnValue({ isAllowed: true, isDev: false });
    const { container } = render(<DevOnlyBridgeOverlay />);
    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByTestId('bridge-metrics-overlay-mock')).not.toBeInTheDocument();
  });
});
