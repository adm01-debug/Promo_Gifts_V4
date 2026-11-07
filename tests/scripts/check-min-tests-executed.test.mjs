import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = resolve(import.meta.dirname, '../..');
const SCRIPT = resolve(ROOT, 'scripts/check-min-tests-executed.mjs');

let fixtureDir;
let emptyReport;
let tenTestsReport;

function run(reportPath, min) {
  return spawnSync(process.execPath, [SCRIPT, reportPath, `--min=${min}`], {
    cwd: ROOT,
    encoding: 'utf8',
  });
}

beforeAll(() => {
  fixtureDir = mkdtempSync(resolve(tmpdir(), 'check-min-tests-'));
  emptyReport = resolve(fixtureDir, 'empty.json');
  tenTestsReport = resolve(fixtureDir, 'ten-tests.json');
  writeFileSync(emptyReport, JSON.stringify({ stats: {} }));
  writeFileSync(tenTestsReport, JSON.stringify({ stats: { expected: 8, unexpected: 1, flaky: 1 } }));
});

afterAll(() => {
  rmSync(fixtureDir, { recursive: true, force: true });
});

describe('check-min-tests-executed --min', () => {
  it.each([
    '',
    '0',
    '-0',
    '-1',
    '-5',
    '+1',
    '1.0',
    '1.5',
    '.5',
    '1.',
    '1e2',
    '1E2',
    '0x10',
    '0b10',
    'NaN',
    'nan',
    'Infinity',
    '-Infinity',
    'abc',
    '10abc',
    'abc10',
    '10 20',
    ' 10',
    '10 ',
    '1_000',
    '1,000',
    'null',
    'undefined',
    'true',
    'false',
    '9007199254740992',
    '999999999999999999999999999999999999',
  ])('rejeita valor invalido %j antes de avaliar o relatorio', (min) => {
    const result = run(emptyReport, min);

    expect(result.status).toBe(2);
    expect(result.stderr).toContain('Valor invalido para --min');
    expect(result.stdout).toBe('');
  });

  it.each(['1', '01', '10', '00010'])('aceita inteiro positivo %j', (min) => {
    const result = run(tenTestsReport, min);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('OK: 10 spec(s) executados');
    expect(result.stderr).toBe('');
  });

  it('mantem a falha funcional quando o relatorio nao atinge o minimo valido', () => {
    const result = run(emptyReport, '1');

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('FALHOU: 0 spec(s) executados (minimo: 1)');
  });
});
