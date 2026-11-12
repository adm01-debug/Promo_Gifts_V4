/**
 * Regressão: gates de erro TypeScript davam "drift positivo"/OK quando o tsc nem chegava a
 * checar (tsconfig ausente/inválido, OOM). Reproduzidos com tsc falso e tsconfig quebrado.
 */
import { spawnSync } from 'node:child_process';
import { chmodSync, cpSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { classifyTscRun, tscHeapArgs } from '../../scripts/lib/tsc-run.mjs';

const ROOT = resolve(import.meta.dirname, '../..');
const dirs = [];
afterAll(() => dirs.forEach((d) => rmSync(d, { recursive: true, force: true })));

describe('classifyTscRun', () => {
  const ok = { status: 2, output: "src/a.ts(1,2): error TS2322: x\nsrc/b.tsx(3,4): error TS2339: y\n" };
  it('conta só diagnósticos de código', () => {
    expect(classifyTscRun(ok)).toEqual({ ok: true, count: 2 });
  });
  it('status 0 sem erros é ok com 0', () => {
    expect(classifyTscRun({ status: 0, output: '' })).toEqual({ ok: true, count: 0 });
  });
  it.each([
    ['binário falhou', { status: null, error: new Error('ENOENT'), output: '' }],
    ['morto por sinal (OOM)', { status: null, signal: 'SIGABRT', output: '' }],
    ['status 134 sem diagnóstico', { status: 134, output: 'FATAL ERROR: heap out of memory' }],
    ['tsconfig ausente', { status: 2, output: "error TS5083: Cannot read file '/x/tsconfig.app.json'.\n" }],
    ['tsconfig JSON inválido', { status: 2, output: "tsconfig.app.json(2,3): error TS1005: ',' expected.\n" }],
    ['mistura infra + código', { status: 2, output: "src/a.ts(1,2): error TS2322: x\nerror TS6053: File not found.\n" }],
  ])('recusa %s', (_n, run) => {
    expect(classifyTscRun(run).ok).toBe(false);
  });
});

function sandboxWithBrokenTsc(files) {
  const dir = mkdtempSync(join(tmpdir(), 'tsc-guard-'));
  dirs.push(dir);
  mkdirSync(join(dir, 'scripts/lib'), { recursive: true });
  for (const f of files) cpSync(join(ROOT, f), join(dir, f));
  cpSync(join(ROOT, 'scripts/lib/tsc-run.mjs'), join(dir, 'scripts/lib/tsc-run.mjs'));
  writeFileSync(join(dir, 'package.json'), '{"type":"module"}');
  // node_modules/typescript/bin/tsc que morre sem diagnóstico (simula OOM/ambiente quebrado)
  mkdirSync(join(dir, 'node_modules/typescript/bin'), { recursive: true });
  writeFileSync(join(dir, 'node_modules/typescript/bin/tsc'), "console.error('FATAL: heap out of memory'); process.exit(134);\n");
  mkdirSync(join(dir, 'node_modules/.bin'), { recursive: true });
  writeFileSync(join(dir, 'node_modules/.bin/tsc'), '#!/bin/sh\necho "FATAL: heap out of memory"\nexit 134\n');
  chmodSync(join(dir, 'node_modules/.bin/tsc'), 0o755);
  return dir;
}

const runIn = (dir, cmd, args) =>
  spawnSync(cmd, args, { cwd: dir, encoding: 'utf8', env: { PATH: process.env.PATH } });

describe('gates com tsc quebrado falham fechado (exit 2)', () => {
  it('check-tsc-baseline', () => {
    const dir = sandboxWithBrokenTsc(['scripts/check-tsc-baseline.mjs']);
    writeFileSync(join(dir, '.tsc-baseline.json'), '{"totalErrors":0,"counts":{}}');
    const r = runIn(dir, 'node', ['scripts/check-tsc-baseline.mjs']);
    expect(r.status).toBe(2);
    expect(r.stderr).toContain('tsc');
  });

  it('check-tsc-tests-baseline (antes: "1 erro < 837 → drift positivo", exit 0)', () => {
    const dir = sandboxWithBrokenTsc(['scripts/check-tsc-tests-baseline.mjs']);
    writeFileSync(join(dir, '.tsc-tests-baseline.json'), '{"totalErrors":837}');
    const r = runIn(dir, 'node', ['scripts/check-tsc-tests-baseline.mjs']);
    expect(r.status).toBe(2);
    expect(r.stdout).not.toContain('Drift positivo');
  });

  it('check-indexed-access-ratchet (antes: -871 erros, exit 0)', () => {
    const dir = sandboxWithBrokenTsc(['scripts/check-indexed-access-ratchet.mjs']);
    writeFileSync(join(dir, '.indexed-access-baseline.json'), '{"errorCount":872}');
    const r = runIn(dir, 'node', ['scripts/check-indexed-access-ratchet.mjs']);
    expect(r.status).toBe(2);
    expect(r.stdout).not.toContain('Drift positivo');
  });

  it('tsc-baseline-generate não sobrescreve a baseline com 0 erros', () => {
    const dir = sandboxWithBrokenTsc(['scripts/tsc-baseline-generate.mjs']);
    writeFileSync(join(dir, '.tsc-baseline.json'), '{"totalErrors":321,"counts":{"a.ts":{"TS1":321}}}');
    const r = runIn(dir, 'node', ['scripts/tsc-baseline-generate.mjs']);
    expect(r.status).toBe(2);
    const kept = JSON.parse(spawnSync('cat', [join(dir, '.tsc-baseline.json')], { encoding: 'utf8' }).stdout);
    expect(kept.totalErrors).toBe(321);
  });

  it('tsc-unused-ratchet.sh (antes: "OK 0 erros", exit 0)', () => {
    const dir = sandboxWithBrokenTsc(['scripts/tsc-unused-ratchet.sh']);
    writeFileSync(join(dir, '.tsc-ratchet-baseline'), '120\n');
    const r = runIn(dir, 'sh', ['scripts/tsc-unused-ratchet.sh']);
    expect(r.status).toBe(2);
    expect(r.stdout).not.toContain('OK noUnusedLocals');
  });

  it.each([['999x'], [''], ['1 2']])('tsc-unused-ratchet.sh recusa baseline inválida %j', (value) => {
    const dir = sandboxWithBrokenTsc(['scripts/tsc-unused-ratchet.sh']);
    // tsc falso que "roda" e reporta 1 erro de código, para chegar ao ponto da baseline.
    writeFileSync(join(dir, 'node_modules/.bin/tsc'), '#!/bin/sh\necho "src/a.ts(1,1): error TS2322: x"\nexit 2\n');
    writeFileSync(join(dir, '.tsc-ratchet-baseline'), value);
    const r = runIn(dir, 'sh', ['scripts/tsc-unused-ratchet.sh']);
    expect(r.status).toBe(2);
    expect(r.stdout).toContain('inválid');
  });

  it('tsc-unused-ratchet.sh: com tsc saudável a regressão ainda reprova (exit 1) e a melhora passa (exit 0)', () => {
    const dir = sandboxWithBrokenTsc(['scripts/tsc-unused-ratchet.sh']);
    writeFileSync(join(dir, 'node_modules/.bin/tsc'), '#!/bin/sh\necho "src/a.ts(1,1): error TS6133: x"\necho "src/b.ts(1,1): error TS6133: y"\nexit 2\n');
    writeFileSync(join(dir, '.tsc-ratchet-baseline'), '1\n');
    expect(runIn(dir, 'sh', ['scripts/tsc-unused-ratchet.sh']).status).toBe(1);
    writeFileSync(join(dir, '.tsc-ratchet-baseline'), '5\n');
    expect(runIn(dir, 'sh', ['scripts/tsc-unused-ratchet.sh']).status).toBe(0);
  });
});

describe('tscHeapArgs', () => {
  it('padrão de 6144 MB quando NODE_OPTIONS não define heap', () => {
    expect(tscHeapArgs({})).toEqual(['--max-old-space-size=6144']);
    expect(tscHeapArgs({ NODE_OPTIONS: '--enable-source-maps' })).toEqual(['--max-old-space-size=6144']);
  });
  it('respeita heap já definido em NODE_OPTIONS (CI)', () => {
    expect(tscHeapArgs({ NODE_OPTIONS: '--max-old-space-size=4096' })).toEqual([]);
    expect(tscHeapArgs({ NODE_OPTIONS: '--foo --max-old-space-size 4096' })).toEqual([]);
  });
  it('aceita override por TSC_MAX_OLD_SPACE_MB e ignora valor inválido', () => {
    expect(tscHeapArgs({ TSC_MAX_OLD_SPACE_MB: '8192' })).toEqual(['--max-old-space-size=8192']);
    expect(tscHeapArgs({ TSC_MAX_OLD_SPACE_MB: 'abc' })).toEqual(['--max-old-space-size=6144']);
    expect(tscHeapArgs({ TSC_MAX_OLD_SPACE_MB: '-1' })).toEqual(['--max-old-space-size=6144']);
  });
});
