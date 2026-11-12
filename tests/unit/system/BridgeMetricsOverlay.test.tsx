import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import BridgeMetricsOverlay from '@/components/dev/BridgeMetricsOverlay';
import { DevOnlyBridgeOverlay } from '@/components/dev/DevOnlyBridgeOverlay';
import { useDevGate } from '@/hooks/admin';
import type { BridgeCallSample } from '@/lib/telemetry/bridgeCallMetrics';

const store = vi.hoisted(() => {
  let snapshot: readonly BridgeCallSample[] = [];
  const listeners = new Set<() => void>();
  const replace = (next: readonly BridgeCallSample[]) => {
    snapshot = next;
    for (const listener of listeners) listener();
  };
  return {
    listeners,
    replace,
    getSnapshot: vi.fn(() => snapshot),
    subscribe: vi.fn((listener: () => void) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    }),
    clear: vi.fn(() => replace([])),
  };
});

vi.mock('@/hooks/admin', () => ({ useDevGate: vi.fn() }));
vi.mock('@/lib/telemetry/bridgeCallMetrics', () => ({
  getBridgeSamples: store.getSnapshot,
  subscribeBridgeCalls: store.subscribe,
  clearBridgeSamples: store.clear,
}));

function sample(id: number, durationMs: number, respBytes: number, status = 200): BridgeCallSample {
  return {
    id,
    ts: id,
    bridge: 'crm-db-bridge',
    op: 'select',
    target: 'companies',
    durationMs,
    reqBytes: 0,
    respBytes,
    status,
    ok: status < 400,
  };
}

const emptySummary = { total: '0', avg: '0ms', bytes: '0 B', errors: '0', last: 0 };
const scenarios = [
  {
    name: 'empty',
    samples: [],
    summary: emptySummary,
    nextSamples: [sample(1, 20, 1024, 500)],
    nextSummary: { total: '1', avg: '20ms', bytes: '1 KB', errors: '1', last: 1 },
  },
  {
    name: 'mixed',
    samples: [sample(1, 100, 1024), sample(2, 700, 500), sample(3, 150, 200, 500)],
    summary: { total: '3', avg: '317ms', bytes: '1.7 KB', errors: '1', last: 3 },
    nextSamples: [
      sample(1, 100, 1024),
      sample(2, 700, 500),
      sample(3, 150, 200, 500),
      sample(4, 50, 256, 404),
    ],
    nextSummary: { total: '4', avg: '250ms', bytes: '1.9 KB', errors: '2', last: 4 },
  },
  {
    name: 'errors',
    samples: [sample(1, 200, 512, 500), sample(2, 400, 512, 403)],
    summary: { total: '2', avg: '300ms', bytes: '1 KB', errors: '2', last: 2 },
    nextSamples: [sample(1, 200, 512, 500), sample(2, 400, 512, 403), sample(3, 600, 512)],
    nextSummary: { total: '3', avg: '400ms', bytes: '1.5 KB', errors: '2', last: 3 },
  },
];

const roles = [
  { isDev: false, isAllowed: false },
  { isDev: false, isAllowed: true },
  { isDev: true, isAllowed: false },
  { isDev: true, isAllowed: true },
];
const matrix = roles.flatMap((role) =>
  [false, true].flatMap((initiallyOpen) =>
    scenarios.flatMap((scenario) =>
      ['toggle', 'notify'].map((interaction) => ({
        role,
        initiallyOpen,
        scenario,
        interaction,
      })),
    ),
  ),
);

type Summary = typeof emptySummary;
function expectSummary(summary: Summary) {
  expect(screen.getByText('total').nextElementSibling?.textContent).toBe(summary.total);
  expect(screen.getByText(`avg (last ${summary.last})`).nextElementSibling?.textContent).toBe(
    summary.avg,
  );
  expect(screen.getByText(`resp (last ${summary.last})`).nextElementSibling?.textContent).toBe(
    summary.bytes,
  );
  expect(screen.getByText('errors').nextElementSibling?.textContent).toBe(summary.errors);
  expect(screen.getByTestId('bridge-metrics-overlay')).not.toHaveTextContent(/NaN|undefined/);
}

beforeEach(() => {
  expect(store.listeners.size).toBe(0);
  store.replace([]);
  vi.clearAllMocks();
  vi.mocked(useDevGate).mockReturnValue({ isDev: true, isAllowed: true });
});

afterEach(() => {
  cleanup();
  expect(store.listeners.size).toBe(0);
});

describe('BridgeMetricsOverlay — compact summary and current dev wrapper', () => {
  it.each(matrix)(
    'role=$role initiallyOpen=$initiallyOpen source=$scenario.name action=$interaction',
    async ({ role, initiallyOpen, scenario, interaction }) => {
      vi.mocked(useDevGate).mockReturnValue(role);
      store.replace(scenario.samples);
      const original = store.getSnapshot();
      expect(store.getSnapshot()).toBe(original);
      const view = render(<DevOnlyBridgeOverlay />);
      if (!role.isDev) {
        expect(view.container).toBeEmptyDOMElement();
        expect(store.subscribe).not.toHaveBeenCalled();
        return;
      }

      const button = await screen.findByRole('button', { name: 'Bridge' });
      if (initiallyOpen) {
        fireEvent.click(button);
        expectSummary(scenario.summary);
      } else {
        expect(screen.queryByTestId('bridge-metrics-overlay')).not.toBeInTheDocument();
      }

      if (interaction === 'toggle') {
        if (!initiallyOpen) {
          fireEvent.click(button);
          expectSummary(scenario.summary);
        }
        fireEvent.click(screen.getByRole('button', { name: 'X' }));
        expect(screen.getByRole('button', { name: 'Bridge' })).toBeInTheDocument();
        expect(screen.queryByTestId('bridge-metrics-overlay')).not.toBeInTheDocument();
      } else {
        act(() => store.replace(scenario.nextSamples));
        if (!initiallyOpen) fireEvent.click(button);
        expectSummary(scenario.nextSummary);
        expect(store.getSnapshot()).not.toBe(original);
      }
      expect(store.subscribe).toHaveBeenCalledTimes(1);
    },
  );

  it.each([
    [0, 'text-green-400'],
    [199, 'text-green-400'],
    [200, 'text-yellow-400'],
    [499, 'text-yellow-400'],
    [500, 'text-red-400'],
    [1000, 'text-red-400'],
  ])('shows the actual latency class at %ims', (latency, expectedClass) => {
    store.replace([sample(1, Number(latency), 0)]);
    render(<BridgeMetricsOverlay />);
    fireEvent.click(screen.getByRole('button', { name: 'Bridge' }));
    expect(screen.getByText(`${latency}ms`)).toHaveClass(String(expectedClass));
  });

  it.each([
    [0, '0 B'],
    [1, '1 B'],
    [1024, '1 KB'],
    [1536, '1.5 KB'],
    [1048576, '1 MB'],
  ])('shows formatted response size at %i bytes', (bytes, expectedText) => {
    store.replace([sample(1, 0, Number(bytes))]);
    render(<BridgeMetricsOverlay />);
    fireEvent.click(screen.getByRole('button', { name: 'Bridge' }));
    expect(screen.getByText('resp (last 1)').nextElementSibling?.textContent).toBe(expectedText);
  });

  it('unsubscribes the actual hook when the dev role is removed and restores only permitted UI', async () => {
    store.replace(scenarios[1].samples);
    const view = render(<DevOnlyBridgeOverlay />);
    fireEvent.click(await screen.findByRole('button', { name: 'Bridge' }));
    expectSummary(scenarios[1].summary);
    expect(store.listeners.size).toBe(1);

    vi.mocked(useDevGate).mockReturnValue({ isDev: false, isAllowed: true });
    view.rerender(<DevOnlyBridgeOverlay />);
    expect(view.container).toBeEmptyDOMElement();
    expect(store.listeners.size).toBe(0);

    vi.mocked(useDevGate).mockReturnValue({ isDev: true, isAllowed: true });
    view.rerender(<DevOnlyBridgeOverlay />);
    expect(await screen.findByRole('button', { name: 'Bridge' })).toBeInTheDocument();
    expect(screen.queryByTestId('bridge-metrics-overlay')).not.toBeInTheDocument();
    expect(store.listeners.size).toBe(1);
  });
});
