/** Regressão (lote 4): monitores e ferramentas com veredito dependente de ordem, estouro de pilha ou ref inválida. */
import { execFileSync, spawnSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, rmSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { computeProjections } from '../../scripts/capacity-growth-projection.mjs';
import { evaluateSloBreaches } from '../../scripts/pgss-slo-check.mjs';

const ROOT = resolve(import.meta.dirname, '../..');
const dirs = [];
afterAll(() => dirs.forEach((d) => rmSync(d, { recursive: true, force: true })));

function sandbox(files) {
  const dir = mkdtempSync(join(tmpdir(), 'tools4-'));
  dirs.push(dir);
  writeFileSync(join(dir, 'package.json'), '{"type":"module"}');
  for (const f of files) {
    mkdirSync(dirname(join(dir, f)), { recursive: true });
    cpSync(join(ROOT, f), join(dir, f));
  }
  return dir;
}

describe('pgss-slo-check: veredito independe da ordem das linhas da mesma captura', () => {
  const at = '2026-11-09T12:00:00.000Z';
  const mk = (mean) => ({ fn_name: 'fn_x', captured_at: at, mean_exec_time: mean, stddev_exec_time: 0 });
  const targets = { fn_x: 500 };
  it('[rápida, lenta] e [lenta, rápida] ambas sinalizam o estouro', () => {
    for (const rows of [[mk(100), mk(900)], [mk(900), mk(100)]]) {
      expect(evaluateSloBreaches({ rows, sloTargetsMs: targets }).breaches).toHaveLength(1);
    }
  });
  it('captura antiga lenta não conta se a mais recente está ok', () => {
    const rows = [
      { ...mk(900), captured_at: '2026-11-08T12:00:00.000Z' },
      mk(100),
    ];
    expect(evaluateSloBreaches({ rows, sloTargetsMs: targets }).breaches).toHaveLength(0);
  });
});

describe('capacity-growth-projection com série muito longa', () => {
  it('600 mil linhas não estouram a pilha (Math.max(...arr))', () => {
    const base = Date.parse('2026-01-01T00:00:00Z');
    const rows = Array.from({ length: 600_000 }, (_, i) => ({
      schema_name: 'public',
      table_name: 't',
      captured_at: new Date(base + (i % 60) * 86_400_000).toISOString(),
      total_bytes: 1_000 + i,
      live_tup: 1,
    }));
    expect(() => computeProjections({ rows, totalDbBytes: 1e9, minSeriesDays: 7 })).not.toThrow();
  });
});

describe('check-critical-coverage', () => {
  it('COVERAGE_TOLERANCE_PP inválido → exit 2 (antes: NaN e 0% passava)', () => {
    const dir = sandbox(['scripts/check-critical-coverage.mjs']);
    const r = spawnSync('node', ['scripts/check-critical-coverage.mjs'], {
      cwd: dir,
      encoding: 'utf8',
      env: { PATH: process.env.PATH, COVERAGE_TOLERANCE_PP: '1pp' },
    });
    expect(r.status).toBe(2);
    expect(r.stderr).toContain('COVERAGE_TOLERANCE_PP inválido');
  });
});

describe('check-file-size-baseline conta linhas reais', () => {
  it('arquivo com exatamente 500 linhas e \\n final não é "acima do limite"', () => {
    const dir = sandbox(['scripts/check-file-size-baseline.mjs', 'scripts/lib/baseline-gate.mjs']);
    mkdirSync(join(dir, 'src'));
    writeFileSync(join(dir, 'src/exato.ts'), `${'x\n'.repeat(500)}`);
    writeFileSync(join(dir, 'src/passou.ts'), `${'x\n'.repeat(501)}`);
    const r = spawnSync('node', ['scripts/check-file-size-baseline.mjs', '--update'], { cwd: dir, encoding: 'utf8', env: { PATH: process.env.PATH } });
    expect(r.status, r.stderr).toBe(0);
    const baseline = JSON.parse(readFileSync(join(dir, '.file-size-baseline.json'), 'utf8'));
    const files = baseline.files ?? baseline.sizes ?? baseline;
    const serialized = JSON.stringify(files);
    expect(serialized).toContain('passou.ts');
    expect(serialized).not.toContain('exato.ts');
  });
});

describe('sentinel-validate-history.sh', () => {
  const git = (cwd, ...args) =>
    execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', '-c', 'commit.gpgsign=false', ...args], {
      cwd,
      encoding: 'utf8',
      env: { PATH: process.env.PATH, HOME: process.env.HOME ?? '', GIT_CONFIG_GLOBAL: '/dev/null' },
    });

  it('ref inexistente → exit 1 (antes: "Total auditado: 0", exit 0)', () => {
    const dir = sandbox(['scripts/sentinel-validate-history.sh', 'scripts/sentinel-check.sh']);
    git(dir, 'init', '-q', '-b', 'main');
    git(dir, 'add', '-A');
    git(dir, 'commit', '-q', '-m', 'feat: base');
    const r = spawnSync('bash', ['scripts/sentinel-validate-history.sh', '5', 'origin/nao-existe'], {
      cwd: dir,
      encoding: 'utf8',
      env: { PATH: process.env.PATH, HOME: process.env.HOME ?? '', GIT_CONFIG_GLOBAL: '/dev/null' },
    });
    expect(r.status).toBe(1);
    expect(r.stderr).toContain('não existe');
  });

  it('ref válida continua auditando', () => {
    const dir = sandbox(['scripts/sentinel-validate-history.sh', 'scripts/sentinel-check.sh']);
    git(dir, 'init', '-q', '-b', 'main');
    git(dir, 'add', '-A');
    git(dir, 'commit', '-q', '-m', 'feat: base');
    const r = spawnSync('bash', ['scripts/sentinel-validate-history.sh', '1', 'HEAD'], {
      cwd: dir,
      encoding: 'utf8',
      env: { PATH: process.env.PATH, HOME: process.env.HOME ?? '', GIT_CONFIG_GLOBAL: '/dev/null' },
    });
    expect(r.stdout).toContain('Total auditado: 1');
  });
});
