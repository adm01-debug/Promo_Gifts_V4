import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { test } from 'vitest';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const SCRIPT = join(ROOT, 'scripts/check-as-unknown-baseline.mjs');

function runGate(sandbox, args = []) {
  return spawnSync(process.execPath, [SCRIPT, ...args], { cwd: sandbox, encoding: 'utf8' });
}

test('check-as-unknown-baseline trata baseline JSON corrompido como erro de execução (exit 2), sem crash cru', () => {
  const sandbox = mkdtempSync(join(tmpdir(), 'as-unknown-baseline-corrupt-'));

  try {
    mkdirSync(join(sandbox, 'src'), { recursive: true });
    writeFileSync(join(sandbox, 'src/a.ts'), 'export const x = 1;\n');
    // Baseline com JSON inválido (ex.: conflito de merge mal resolvido no
    // arquivo gerado por --update). Antes do fix, `runBaselineGate` chamava
    // `JSON.parse` sem try/catch e deixava a exceção subir crua — stack
    // trace do Node, sem mensagem acionável, exit code 1 indistinguível de
    // uma regressão real.
    writeFileSync(join(sandbox, '.as-unknown-baseline.json'), '{ "counts": { invalid json !!');

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

test('check-as-unknown-baseline conta múltiplas ocorrências de `as unknown as` na mesma linha', () => {
  const sandbox = mkdtempSync(join(tmpdir(), 'as-unknown-baseline-multi-'));

  try {
    mkdirSync(join(sandbox, 'src'), { recursive: true });
    writeFileSync(
      join(sandbox, '.as-unknown-baseline.json'),
      JSON.stringify({ productionAsUnknownCount: 1, counts: { 'src/a.ts': 1 } }),
    );
    writeFileSync(
      join(sandbox, 'src/a.ts'),
      "export const a = (x as unknown as Foo); export const b = (y as unknown as Bar);\n",
    );

    const result = runGate(sandbox);

    assert.equal(result.status, 1, `esperado exit=1 (regressão); saída:\n${result.stdout}${result.stderr}`);
    assert.match(result.stdout, /atual: 2/);
    assert.match(result.stderr, /src\/a\.ts: 2 \(baseline: 1, \+1\)/);
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
});

test('check-as-unknown-baseline ignora `as unknown as` dentro de comentário de linha e de bloco', () => {
  const sandbox = mkdtempSync(join(tmpdir(), 'as-unknown-baseline-comment-'));

  try {
    mkdirSync(join(sandbox, 'src'), { recursive: true });
    writeFileSync(
      join(sandbox, '.as-unknown-baseline.json'),
      JSON.stringify({ productionAsUnknownCount: 0, counts: {} }),
    );
    writeFileSync(
      join(sandbox, 'src/a.ts'),
      [
        '// exemplo antigo: foo as unknown as Bar (nao faça isso)',
        '/* outro exemplo: baz as unknown as Qux */',
        'export const real = 1;',
        '',
      ].join('\n'),
    );

    const result = runGate(sandbox);

    assert.equal(result.status, 0, `esperado exit=0 (sem regressão); saída:\n${result.stdout}${result.stderr}`);
    assert.match(result.stdout, /atual: 0 · baseline: 0/);
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
});

test('check-as-unknown-baseline não regride quando a contagem por arquivo não muda', () => {
  const sandbox = mkdtempSync(join(tmpdir(), 'as-unknown-baseline-stable-'));

  try {
    mkdirSync(join(sandbox, 'src'), { recursive: true });
    writeFileSync(
      join(sandbox, '.as-unknown-baseline.json'),
      JSON.stringify({ productionAsUnknownCount: 1, counts: { 'src/a.ts': 1 } }),
    );
    writeFileSync(join(sandbox, 'src/a.ts'), 'export const a = (x as unknown as Foo);\n');

    const result = runGate(sandbox);

    assert.equal(result.status, 0, `esperado exit=0 (sem regressão); saída:\n${result.stdout}${result.stderr}`);
    assert.match(result.stdout, /atual: 1 · baseline: 1/);
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
});

test('check-as-unknown-baseline --update grava contagem atual e volta a passar', () => {
  const sandbox = mkdtempSync(join(tmpdir(), 'as-unknown-baseline-update-'));

  try {
    mkdirSync(join(sandbox, 'src'), { recursive: true });
    writeFileSync(join(sandbox, 'src/a.ts'), 'export const a = (x as unknown as Foo);\n');

    const update = runGate(sandbox, ['--update']);
    assert.equal(update.status, 0, `esperado exit=0 no --update; saída:\n${update.stdout}${update.stderr}`);

    const check = runGate(sandbox);
    assert.equal(check.status, 0, `esperado exit=0 após --update; saída:\n${check.stdout}${check.stderr}`);
    assert.match(check.stdout, /atual: 1 · baseline: 1/);
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
});

test('check-as-unknown-baseline falha com exit=2 e mensagem clara quando não há baseline', () => {
  const sandbox = mkdtempSync(join(tmpdir(), 'as-unknown-baseline-missing-'));

  try {
    mkdirSync(join(sandbox, 'src'), { recursive: true });
    writeFileSync(join(sandbox, 'src/a.ts'), 'export const x = 1;\n');

    const result = runGate(sandbox);

    assert.equal(result.status, 2, `esperado exit=2; saída:\n${result.stdout}${result.stderr}`);
    assert.match(result.stderr, /não encontrado. Gere com --update/);
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
});
