/** Regressão (lote 5): relatórios e gates auxiliares com veredito falso ou crash cru. */
import { spawnSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';

const ROOT = resolve(import.meta.dirname, '../..');
const dirs = [];
afterAll(() => dirs.forEach((d) => rmSync(d, { recursive: true, force: true })));

function sandbox(files) {
  const dir = mkdtempSync(join(tmpdir(), 'tools5-'));
  dirs.push(dir);
  writeFileSync(join(dir, 'package.json'), '{"type":"module"}');
  for (const f of files) {
    mkdirSync(dirname(join(dir, f)), { recursive: true });
    cpSync(join(ROOT, f), join(dir, f));
  }
  return dir;
}
const run = (dir, script, args = []) =>
  spawnSync('node', [join(dir, script), ...args], { cwd: dir, encoding: 'utf8', env: { PATH: process.env.PATH } });

describe('ssot-report-annotations', () => {
  const report = {
    ok: false,
    details: [
      {
        label: 'E064',
        ok: false,
        stdout: '✅ E064: 3059 arquivo(s) sem referência\n❌ src/a.ts:10:5 project-ref proibido\n',
        stderr: '',
      },
    ],
  };
  it('não anota linha de sucesso (✅) como ::error', () => {
    const dir = sandbox(['scripts/ssot-report-annotations.mjs']);
    writeFileSync(join(dir, 'ssot-report.json'), JSON.stringify(report));
    const r = run(dir, 'scripts/ssot-report-annotations.mjs');
    expect(r.status).toBe(0);
    expect(r.stdout).toContain('project-ref proibido');
    expect(r.stdout).not.toContain('3059');
  });
  it.each([['null'], ['[]'], ['"x"']])('JSON %s não derruba (exit 0, como promete)', (body) => {
    const dir = sandbox(['scripts/ssot-report-annotations.mjs', 'scripts/ssot-report-summary.mjs']);
    writeFileSync(join(dir, 'ssot-report.json'), body);
    expect(run(dir, 'scripts/ssot-report-annotations.mjs').status).toBe(0);
    expect(run(dir, 'scripts/ssot-report-summary.mjs').status).toBe(0);
  });
});

describe('graphify/postprocess-report', () => {
  it('sem graphify-out/graph.json → exit 2 com mensagem (antes: stack trace ENOENT)', () => {
    const dir = sandbox(['scripts/graphify/postprocess-report.mjs', 'scripts/graphify/graph-metrics.mjs']);
    const r = run(dir, 'scripts/graphify/postprocess-report.mjs');
    expect(r.status).toBe(2);
    expect(r.stderr).toContain('não encontrado');
    expect(r.stderr).not.toContain('node:fs');
  });
});

describe('ci-cron-table', () => {
  it.each([[['--min-spacing']], [['--min-spacing', 'abc']], [['--min-spacing', '-5']]])('%j → exit 2', (args) => {
    const dir = sandbox(['scripts/ci-cron-table.mjs']);
    expect(run(dir, 'scripts/ci-cron-table.mjs', args).status).toBe(2);
  });
});

describe('generate-coverage-report --check', () => {
  const entry = (lines, functions) => ({
    lines: { total: 100, covered: lines },
    functions: { total: 100, covered: functions },
    branches: { total: 100, covered: 100 },
    statements: { total: 100, covered: 100 },
  });
  it('functions abaixo do piso reprova mesmo com lines 100% (antes: só lines)', () => {
    const dir = sandbox(['scripts/generate-coverage-report.mjs']);
    mkdirSync(join(dir, 'coverage'));
    writeFileSync(
      join(dir, 'coverage/coverage-summary.json'),
      JSON.stringify({ total: entry(100, 10), '/repo/src/hooks/useX.ts': entry(100, 10) }),
    );
    expect(run(dir, 'scripts/generate-coverage-report.mjs', ['--check']).status).toBe(1);
  });
  it('lines e functions acima do piso passam', () => {
    const dir = sandbox(['scripts/generate-coverage-report.mjs']);
    mkdirSync(join(dir, 'coverage'));
    writeFileSync(
      join(dir, 'coverage/coverage-summary.json'),
      JSON.stringify({ total: entry(100, 100), '/repo/src/hooks/useX.ts': entry(100, 100) }),
    );
    expect(run(dir, 'scripts/generate-coverage-report.mjs', ['--check']).status).toBe(0);
  });
});

describe('collect-coverage-ci', () => {
  it('relatório sem nenhuma linha medida → exit 1 (antes: 100% em tudo)', () => {
    const dir = sandbox(['scripts/collect-coverage-ci.mjs']);
    const zero = { total: { lines: { total: 0, covered: 0 }, statements: { total: 0, covered: 0 }, functions: { total: 0, covered: 0 }, branches: { total: 0, covered: 0 } } };
    for (const sub of ['unit', 'integration']) {
      mkdirSync(join(dir, 'coverage/ci', sub), { recursive: true });
      writeFileSync(join(dir, 'coverage/ci', sub, 'coverage-summary.json'), JSON.stringify(zero));
    }
    writeFileSync(join(dir, 'coverage/ci/e2e-report.json'), JSON.stringify({ stats: { expected: 1, unexpected: 0, skipped: 0, flaky: 0 }, suites: [] }));
    const r = run(dir, 'scripts/collect-coverage-ci.mjs', ['--skip-run']);
    expect(r.status).toBe(1);
    expect(r.stderr).toContain('não mediu nenhuma linha');
  });
});
