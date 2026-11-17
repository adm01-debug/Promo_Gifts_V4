/**
 * O túnel só pode valer em build de produção: `api/monitoring` é função Vercel e
 * o dev server do Vite não a serve, então apontar o túnel em dev mandaria todo
 * envelope para um 404 — pior que o envio direto, que ao menos tenta.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const init = vi.fn();

vi.mock('@sentry/react', () => ({
  init,
  browserTracingIntegration: () => ({ name: 'browserTracing' }),
  replayIntegration: () => ({ name: 'replay' }),
  captureConsoleIntegration: () => ({ name: 'captureConsole' }),
  captureException: vi.fn(),
  captureMessage: vi.fn(),
  setUser: vi.fn(),
  ErrorBoundary: () => null,
}));

/** DSN com chave alfanumérica: o formato que `isValidSentryDsn` aceita. */
const DSN = 'https://66323199858e42958e4dfcde3cd77b7e@erros.atomicabr.com.br/4';

async function initComPROD(prod: boolean): Promise<Record<string, unknown>> {
  vi.resetModules();
  init.mockClear();
  vi.stubEnv('VITE_SENTRY_DSN', DSN);
  vi.stubEnv('PROD', prod as unknown as string);

  const mod = await import('../sentry');
  // initSentry adia o load para idle ou 3s; avança o relógio e drena as promessas
  // do import dinâmico do SDK.
  vi.useFakeTimers();
  try {
    mod.initSentry();
    await vi.advanceTimersByTimeAsync(3100);
  } finally {
    vi.useRealTimers();
  }
  expect(init).toHaveBeenCalledTimes(1);
  return init.mock.calls[0][0] as Record<string, unknown>;
}

describe('Sentry — túnel de mesma origem', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('em build de produção manda o envelope pela própria origem', async () => {
    const opts = await initComPROD(true);
    expect(opts.tunnel).toBe('/api/monitoring');
  });

  it('em dev não usa o túnel (o Vite não serve api/, seria 404 em todo envio)', async () => {
    const opts = await initComPROD(false);
    expect(opts.tunnel).toBeUndefined();
  });
});
