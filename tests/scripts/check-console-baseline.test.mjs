import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { test } from 'vitest';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const SCRIPT = join(ROOT, 'scripts/check-console-baseline.mjs');

function runGate(sandbox, args = []) {
  return spawnSync(process.execPath, [SCRIPT, ...args], { cwd: sandbox, encoding: 'utf8' });
}

test('check-console-baseline trata .console-baseline.json corrompido como erro de execução, sem crash cru', () => {
  const sandbox = mkdtempSync(join(tmpdir(), 'console-baseline-corrupt-'));

  try {
    mkdirSync(join(sandbox, 'src'), { recursive: true });
    writeFileSync(join(sandbox, 'src/a.ts'), 'export const x = 1;\n');
    // Sem isso, um JSON.parse não tratado derruba o processo com stack trace
    // cru do Node (ex.: "at JSON.parse (<anonymous>)" / "at ModuleJob.run"),
    // em vez de uma mensagem de gate legível.
    writeFileSync(join(sandbox, '.console-baseline.json'), '{not valid json');

    const result = runGate(sandbox);

    assert.equal(result.status, 1, `esperado exit=1; saída:\n${result.stdout}${result.stderr}`);
    assert.equal(result.signal, null);
    const combined = `${result.stdout}${result.stderr}`;
    assert.doesNotMatch(combined, /at JSON\.parse|at ModuleJob\.run|at readFileSync/);
    assert.match(combined, /Falha ao executar o gate console\.\* baseline/);
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
});

test('check-console-baseline trata .console-baseline.json ausente como erro de execução, sem crash cru', () => {
  const sandbox = mkdtempSync(join(tmpdir(), 'console-baseline-missing-'));

  try {
    mkdirSync(join(sandbox, 'src'), { recursive: true });
    writeFileSync(join(sandbox, 'src/a.ts'), 'export const x = 1;\n');
    // Nenhum .console-baseline.json criado — readFileSync deve falhar com
    // ENOENT, e o gate precisa reportar isso de forma legível, não crashar.

    const result = runGate(sandbox);

    assert.equal(result.status, 1, `esperado exit=1; saída:\n${result.stdout}${result.stderr}`);
    assert.equal(result.signal, null);
    const combined = `${result.stdout}${result.stderr}`;
    assert.doesNotMatch(combined, /at readFileSync|at ModuleJob\.run/);
    assert.match(combined, /Falha ao executar o gate console\.\* baseline/);
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
});

test('check-console-baseline ainda detecta arquivo novo com console.* fora do baseline', () => {
  const sandbox = mkdtempSync(join(tmpdir(), 'console-baseline-new-'));

  try {
    mkdirSync(join(sandbox, 'src'), { recursive: true });
    writeFileSync(join(sandbox, 'src/bad.ts'), 'export function f() { console.log("hi"); }\n');
    writeFileSync(
      join(sandbox, '.console-baseline.json'),
      JSON.stringify({ description: 'test', files: [], counts: {} }),
    );

    const result = runGate(sandbox);

    assert.equal(result.status, 1, `esperado exit=1 (violação); saída:\n${result.stdout}${result.stderr}`);
    assert.match(result.stderr, /NOVO arquivo com console\.\*: src\/bad\.ts/);
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
});

test('check-console-baseline passa (exit 0) quando o estado atual já está no baseline', () => {
  const sandbox = mkdtempSync(join(tmpdir(), 'console-baseline-ok-'));

  try {
    mkdirSync(join(sandbox, 'src'), { recursive: true });
    writeFileSync(join(sandbox, 'src/bad.ts'), 'export function f() { console.log("hi"); }\n');
    writeFileSync(
      join(sandbox, '.console-baseline.json'),
      JSON.stringify({ description: 'test', files: ['src/bad.ts'], counts: { 'src/bad.ts': 1 } }),
    );

    const result = runGate(sandbox);

    assert.equal(result.status, 0, `esperado exit=0; saída:\n${result.stdout}${result.stderr}`);
    assert.match(result.stdout, /0 regressões/);
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
});
