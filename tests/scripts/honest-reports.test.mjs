/**
 * Regressão: relatórios/gates de performance e auditoria imprimiam "passou" sem medir nada
 * (números literais no código, "Sistema estável e pronto para produção" fixo).
 */
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { buildReport, resolveVerdict } from '../../scripts/generate-audit-report.mjs';
import { evaluateGates, generateDashboard } from '../../scripts/replenishment-ci/metrics-dashboard.mjs';

const ROOT = resolve(import.meta.dirname, '../..');
const dirs = [];
afterAll(() => dirs.forEach((d) => rmSync(d, { recursive: true, force: true })));
const tmp = () => {
  const d = mkdtempSync(join(tmpdir(), 'honest-'));
  dirs.push(d);
  return d;
};

describe('generate-audit-report', () => {
  it('sem vereditos: tudo "NÃO VERIFICADO" e a conclusão não atesta produção', () => {
    const { content, failed } = buildReport({ argv: [], env: {}, coverageSummary: null });
    expect(failed).toBe(false);
    expect(content.match(/NÃO VERIFICADO/g)?.length).toBeGreaterThanOrEqual(5);
    expect(content).not.toMatch(/Passou|PASSOU|Limpo|Sistema estável/);
    expect(content).toContain('INCOMPLETA');
  });
  it('falha informada vira "HÁ FALHAS"', () => {
    const { content, failed } = buildReport({ argv: ['--lint=failed', '--typecheck=passed'], env: {} });
    expect(failed).toBe(true);
    expect(content).toContain('Lint (ESLint): FALHOU');
    expect(content).toContain('HÁ FALHAS');
  });
  it('veredito por variável de ambiente e valor inválido ignorado', () => {
    expect(resolveVerdict('e2e', [], { AUDIT_E2E: 'PASSED' })).toBe('passed');
    expect(resolveVerdict('e2e', [], { AUDIT_E2E: 'talvez' })).toBeNull();
  });
  it('cobertura vem do arquivo, não de texto fixo', () => {
    const pct = { pct: 12.3 };
    const { content } = buildReport({ argv: [], env: {}, coverageSummary: { total: { statements: pct, branches: pct, functions: pct, lines: pct } } });
    expect(content).toContain('Lines: 12.3%');
  });
  it('todas informadas e passando: conclusão sem "NÃO VERIFICADO" nas seções', () => {
    const { content } = buildReport({ argv: ['--typecheck=passed', '--lint=passed', '--security=passed', '--e2e=passed'], env: {}, coverageSummary: { total: { statements: { pct: 1 }, branches: { pct: 1 }, functions: { pct: 1 }, lines: { pct: 1 } } } });
    expect(content).not.toContain('NÃO VERIFICADO');
  });
});

describe('metrics-dashboard (Reposição)', () => {
  it('evaluateGates: erro acima do limite = CRITICAL; p95 alto = WARNING; senão OK', () => {
    expect(evaluateGates({ routes: [{ path: '/a', p95_ms: 100, error_rate: 0.05 }] }).status).toBe('CRITICAL');
    expect(evaluateGates({ routes: [{ path: '/a', p95_ms: 900, error_rate: 0.001 }] }).status).toBe('WARNING');
    expect(evaluateGates({ routes: [{ path: '/a', p95_ms: 100, error_rate: 0.001 }] }).status).toBe('OK');
  });
  it('sem métricas: não grava dashboard; estrito → 2', () => {
    const dir = tmp();
    const out = join(dir, 'dash.json');
    expect(generateDashboard({ metricsFile: join(dir, 'nao-existe.json'), outputReport: out, strict: false })).toBe(0);
    expect(existsSync(out)).toBe(false);
    expect(generateDashboard({ metricsFile: join(dir, 'nao-existe.json'), outputReport: out, strict: true })).toBe(2);
  });
  it('JSON corrompido → 2 (antes: erro engolido, exit 0)', () => {
    const dir = tmp();
    writeFileSync(join(dir, 'm.json'), '{bad');
    expect(generateDashboard({ metricsFile: join(dir, 'm.json'), outputReport: join(dir, 'o.json'), strict: false })).toBe(2);
  });
  it('métricas reais viram dashboard; CRITICAL → exit 1', () => {
    const dir = tmp();
    writeFileSync(join(dir, 'm.json'), JSON.stringify({ routes: [{ path: '/r', avg_response_ms: 10, p95_ms: 20, error_rate: 0.5 }] }));
    const out = join(dir, 'o.json');
    expect(generateDashboard({ metricsFile: join(dir, 'm.json'), outputReport: out, strict: false })).toBe(1);
    expect(JSON.parse(readFileSync(out, 'utf8')).routes[0].path).toBe('/r');
  });
});

describe('ci-performance-gate.ts', () => {
  const run = (cwd, env = {}) =>
    spawnSync(join(ROOT, 'node_modules/.bin/tsx'), [join(ROOT, 'scripts/ci-performance-gate.ts')], { cwd, encoding: 'utf8', env: { PATH: process.env.PATH, ...env } });
  it('sem métricas: local = NÃO VERIFICADO (0) e sem "GATE PASSED"; CI = 2', () => {
    const dir = tmp();
    const local = run(dir);
    expect(local.status).toBe(0);
    expect(local.stdout).not.toContain('GATE PASSED');
    expect(local.stdout).toContain('NÃO VERIFICADO');
    expect(run(dir, { CI: 'true' }).status).toBe(2);
  });
  it('medição acima do limite reprova (1); dentro do limite passa (0)', () => {
    const dir = tmp();
    mkdirSync(join(dir, 'tests/results'), { recursive: true });
    const file = join(dir, 'tests/results/performance-metrics.json');
    writeFileSync(file, JSON.stringify([{ name: 'listing', duration: 5000, status: 'passed', route: 'replenishment-listing' }]));
    expect(run(dir).status).toBe(1);
    writeFileSync(file, JSON.stringify([{ name: 'listing', duration: 100, status: 'passed', route: 'replenishment-listing' }]));
    expect(run(dir).status).toBe(0);
    writeFileSync(file, JSON.stringify([{ name: 'listing', duration: 100, status: 'failed', route: 'replenishment-listing' }]));
    expect(run(dir).status).toBe(1);
  });
});
