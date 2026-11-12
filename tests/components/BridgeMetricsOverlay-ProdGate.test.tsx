import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { BridgeCallSample } from '@/lib/telemetry/bridgeCallMetrics';
import { DevOnlyBridgeOverlay } from '@/components/dev/DevOnlyBridgeOverlay';

const gate = vi.hoisted(() => ({
  state: { isAllowed: false, isDev: false },
  read: vi.fn(),
}));

const telemetry = vi.hoisted(() => {
  const empty: readonly BridgeCallSample[] = Object.freeze([]);
  return {
    empty,
    snapshot: empty,
    listeners: new Set<() => void>(),
    subscribe: vi.fn(),
    unsubscribe: vi.fn(),
    clear: vi.fn(),
  };
});

vi.mock('@/hooks/admin', () => ({ useDevGate: () => gate.read() }));

vi.mock('@/lib/telemetry/bridgeCallMetrics', () => ({
  getBridgeSamples: () => telemetry.snapshot,
  subscribeBridgeCalls: (listener: () => void) => {
    telemetry.subscribe(listener);
    telemetry.listeners.add(listener);
    return () => {
      telemetry.unsubscribe(listener);
      telemetry.listeners.delete(listener);
    };
  },
  clearBridgeSamples: () => telemetry.clear(),
}));

describe('DevOnlyBridgeOverlay — autoridade do papel dev e snapshot estável', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    gate.state = { isAllowed: false, isDev: false };
    gate.read.mockImplementation(() => gate.state);
    telemetry.snapshot = telemetry.empty;
    telemetry.listeners.clear();
  });

  afterEach(cleanup);

  it.each([false, true])(
    'não monta diagnósticos sem papel dev, mesmo com isAllowed=%s',
    (isAllowed) => {
      gate.state = { isAllowed, isDev: false };
      const { container } = render(<DevOnlyBridgeOverlay />);
      expect(container).toBeEmptyDOMElement();
      expect(telemetry.subscribe).not.toHaveBeenCalled();
      expect(telemetry.listeners.size).toBe(0);
    },
  );

  it('monta o overlay real quando o gate confirma o papel dev', async () => {
    gate.state = { isAllowed: true, isDev: true };
    render(<DevOnlyBridgeOverlay />);
    fireEvent.click(await screen.findByTestId('bridge-metrics-toggle'));
    expect(screen.getByTestId('bridge-metrics-overlay')).toHaveTextContent('Bridge Metrics');
    expect(screen.getByText('0ms')).toBeInTheDocument();
    expect(telemetry.subscribe).toHaveBeenCalledTimes(1);
  });

  it('mantém a decisão isDev do wrapper quando a infraestrutura isAllowed é falsa', async () => {
    gate.state = { isAllowed: false, isDev: true };
    render(<DevOnlyBridgeOverlay />);
    expect(await screen.findByTestId('bridge-metrics-toggle')).toBeInTheDocument();
    expect(telemetry.subscribe).toHaveBeenCalledTimes(1);
  });

  it('remove o overlay e a subscrição quando o papel dev é revogado', async () => {
    gate.state = { isAllowed: true, isDev: true };
    const { container, rerender } = render(<DevOnlyBridgeOverlay />);
    await screen.findByTestId('bridge-metrics-toggle');
    gate.state = { isAllowed: true, isDev: false };
    rerender(<DevOnlyBridgeOverlay />);
    expect(container).toBeEmptyDOMElement();
    expect(telemetry.unsubscribe).toHaveBeenCalledTimes(1);
    expect(telemetry.listeners.size).toBe(0);
  });

  it('admite o papel dev sem remontar a subscrição ao mudar somente isAllowed', async () => {
    const { container, rerender } = render(<DevOnlyBridgeOverlay />);
    expect(container).toBeEmptyDOMElement();
    gate.state = { isAllowed: true, isDev: true };
    rerender(<DevOnlyBridgeOverlay />);
    fireEvent.click(await screen.findByTestId('bridge-metrics-toggle'));
    gate.state = { isAllowed: false, isDev: true };
    rerender(<DevOnlyBridgeOverlay />);
    expect(screen.getByTestId('bridge-metrics-overlay')).toBeInTheDocument();
    expect(telemetry.subscribe).toHaveBeenCalledTimes(1);
  });

  it('o overlay admitido reage à notificação do snapshot e limpa a subscrição ao desmontar', async () => {
    gate.state = { isAllowed: true, isDev: true };
    const { unmount } = render(<DevOnlyBridgeOverlay />);
    fireEvent.click(await screen.findByTestId('bridge-metrics-toggle'));
    act(() => {
      telemetry.snapshot = Object.freeze([
        {
          id: 1,
          ts: 100,
          bridge: 'crm-db-bridge',
          op: 'select',
          target: 'products',
          durationMs: 137,
          reqBytes: 20,
          respBytes: 2048,
          ok: false,
          status: 503,
        },
      ]);
      for (const listener of telemetry.listeners) listener();
    });
    expect(screen.getByText('137ms')).toBeInTheDocument();
    expect(screen.getByText('2 KB')).toBeInTheDocument();
    unmount();
    expect(telemetry.unsubscribe).toHaveBeenCalledTimes(1);
    expect(telemetry.listeners.size).toBe(0);
  });
});
