import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { test } from 'vitest';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const SCRIPT = join(ROOT, 'scripts/check-any-type-baseline.mjs');

function runGate(sandbox) {
  return spawnSync(process.execPath, [SCRIPT], { cwd: sandbox, encoding: 'utf8' });
}

test('check-any-type-baseline conta múltiplas ocorrências de `any` na mesma linha (sem isso, regressão real passa pelo gate)', () => {
  const sandbox = mkdtempSync(join(tmpdir(), 'any-baseline-multi-'));

  try {
    mkdirSync(join(sandbox, 'src'), { recursive: true });

    // Baseline aceita 1 cast legado em src/a.ts.
    writeFileSync(
      join(sandbox, '.any-type-baseline.json'),
      JSON.stringify({ productionAnyCount: 1, counts: { 'src/a.ts': 1 } }),
    );

    // Código real tem 3 ocorrências de `: any` NA MESMA LINHA — uma
    // regressão real de +2 em relação à baseline. `grep -n` só reporta a
    // linha uma vez, então um gate que conta "linha casou" (+1) em vez de
    // "quantas vezes o padrão casou" não detecta essa regressão.
    writeFileSync(
      join(sandbox, 'src/a.ts'),
      'export function f(a: any, b: any): any {\n  return a;\n}\n',
    );

    const result = runGate(sandbox);

    assert.equal(result.status, 1, `esperado exit=1 (regressão); saída:\n${result.stdout}${result.stderr}`);
    assert.match(result.stdout, /atual: 3/);
    assert.match(result.stderr, /src\/a\.ts: 3 \(baseline: 1, \+2\)/);
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
});

test('check-any-type-baseline não regride quando a contagem por arquivo não muda', () => {
  const sandbox = mkdtempSync(join(tmpdir(), 'any-baseline-stable-'));

  try {
    mkdirSync(join(sandbox, 'src'), { recursive: true });
    writeFileSync(
      join(sandbox, '.any-type-baseline.json'),
      JSON.stringify({ productionAnyCount: 3, counts: { 'src/a.ts': 3 } }),
    );
    writeFileSync(
      join(sandbox, 'src/a.ts'),
      'export function f(a: any, b: any): any {\n  return a;\n}\n',
    );

    const result = runGate(sandbox);

    assert.equal(result.status, 0, `esperado exit=0 (sem regressão); saída:\n${result.stdout}${result.stderr}`);
    assert.match(result.stdout, /atual: 3 · baseline: 3/);
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
});

test('check-any-type-baseline trata baseline JSON corrompido como erro de execução (exit 2), sem crash cru', () => {
  const sandbox = mkdtempSync(join(tmpdir(), 'any-baseline-corrupt-'));

  try {
    mkdirSync(join(sandbox, 'src'), { recursive: true });
    writeFileSync(join(sandbox, 'src/a.ts'), 'export const x = 1;\n');
    writeFileSync(join(sandbox, '.any-type-baseline.json'), '{ "counts": { invalid json !!');

    const result = runGate(sandbox);

    assert.equal(result.status, 2, `esperado exit=2; saída:\n${result.stdout}${result.stderr}`);
    assert.equal(result.signal, null);
    const combined = `${result.stdout}${result.stderr}`;
    assert.doesNotMatch(combined, /at JSON\.parse|at ModuleJob\.run/);
    assert.match(combined, /JSON corrompido/);
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
});
