import { describe, expect, it, vi } from 'vitest';
import { runCatalogChecks, runLinter } from '../../scripts/check-supabase-linter.mjs';

const logger = () => ({ log: vi.fn(), warn: vi.fn(), error: vi.fn() });
const response = (status, findings = []) => ({
  status,
  ok: status >= 200 && status < 300,
  statusText: status === 401 ? 'Unauthorized' : 'Not Found',
  json: async () => ({ lints: findings }),
});

describe('Supabase Security Advisors gate', () => {
  it('usa o endpoint atual e completa as auditorias de catálogo', async () => {
    const catalogRunner = vi.fn(() => 0);
    const fetcher = vi.fn(async () => response(200, [{
      name: 'security_definer_view', level: 'ERROR',
      metadata: { schema: 'public', name: 'v_products_public' },
    }]));
    const result = await runLinter({
      token: 'test-token',
      ref: 'doufsxqlfjyuvxuezpln',
      fetcher,
      catalogRunner,
      logger: logger(),
    });
    expect(result).toBe(0);
    expect(catalogRunner).toHaveBeenCalledOnce();
    expect(fetcher.mock.calls[0][0]).toContain('/advisors/security');
  });

  it('propaga falha do catálogo e bloqueia 404 ou 401', async () => {
    const catalogRunner = vi.fn(() => 1);
    expect(await runLinter({
      token: 'test-token', ref: 'doufsxqlfjyuvxuezpln',
      fetcher: async () => response(200), catalogRunner, logger: logger(),
    })).toBe(1);
    catalogRunner.mockClear();
    expect(await runLinter({
      token: 'test-token', ref: 'doufsxqlfjyuvxuezpln',
      fetcher: async () => response(404), catalogRunner, logger: logger(),
    })).toBe(2);
    expect(await runLinter({
      token: 'test-token', ref: 'doufsxqlfjyuvxuezpln',
      fetcher: async () => response(401), catalogRunner, logger: logger(),
    })).toBe(2);
    expect(catalogRunner).not.toHaveBeenCalled();
  });

  it('bloqueia timeout, JSON inválido e ERROR não revisado', async () => {
    const base = { token: 'test-token', ref: 'doufsxqlfjyuvxuezpln', logger: logger(), sleepFn: () => Promise.resolve() };
    expect(await runLinter({ ...base, fetcher: async () => { throw new Error('timeout'); } })).toBe(0); // E103: throw de rede é não-bloqueante
    expect(await runLinter({ ...base, fetcher: async () => ({ ...response(200), json: async () => ({}) }) })).toBe(2);
    expect(await runLinter({
      ...base,
      fetcher: async () => response(200, [{ name: 'security_definer_view', level: 'ERROR', metadata: { schema: 'public', name: 'new_view' } }]),
    })).toBe(1);
  });

  it('trata 5xx da Management API como falha de infra transitória (retry 3x, exit 0)', async () => {
    const fetcher = vi.fn(async () => response(544));
    const log = logger();
    expect(await runLinter({
      token: 'test-token', ref: 'doufsxqlfjyuvxuezpln', fetcher, logger: log, sleepFn: () => Promise.resolve(),
    })).toBe(0);
    expect(fetcher).toHaveBeenCalledTimes(3);
    expect(log.warn).toHaveBeenCalled();
  });

  it('não consulta outro projeto Supabase por engano', async () => {
    const fetcher = vi.fn();
    expect(await runLinter({
      token: 'test-token', ref: 'other-project', fetcher, logger: logger(),
    })).toBe(2);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('exige sucesso das cinco consultas ao catálogo, incluindo views públicas', () => {
    const spawn = vi.fn(() => ({ status: 0 }));
    expect(runCatalogChecks({ spawn, logger: logger() })).toBe(0);
    expect(spawn).toHaveBeenCalledTimes(5);
    expect(spawn.mock.calls.every(([, args]) => args.includes('--require-live'))).toBe(true);
    spawn.mockImplementationOnce(() => ({ status: 2 }));
    expect(runCatalogChecks({ spawn, logger: logger() })).toBe(2);
  });
});
