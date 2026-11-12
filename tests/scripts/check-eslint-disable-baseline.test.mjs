import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { test } from 'vitest';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const SCRIPT = join(ROOT, 'scripts/check-eslint-disable-baseline.mjs');

function runGate(sandbox, ...args) {
  return spawnSync(process.execPath, [SCRIPT, ...args], { cwd: sandbox, encoding: 'utf8' });
}

test('check-eslint-disable-baseline conta múltiplas supressões na mesma linha como regressão real', () => {
  const sandbox = mkdtempSync(join(tmpdir(), 'eslint-disable-baseline-multi-'));

  try {
    mkdirSync(join(sandbox, 'src'), { recursive: true });
    writeFileSync(
      join(sandbox, '.eslint-disable-baseline.json'),
      JSON.stringify({ productionEslintDisableCount: 1, counts: { 'src/a.ts': 1 } }),
    );
    // A linha abaixo tem DUAS supressões inline na mesma linha (2 ocorrências).
    writeFileSync(
      join(sandbox, 'src/a.ts'),
      'export const a = 1; // eslint-disable-next-line no-unused-vars eslint-disable-line no-explicit-any\n',
    );

    const result = runGate(sandbox);

    assert.equal(result.status, 1, `esperado exit=1 (regressão); saída:\n${result.stdout}${result.stderr}`);
    assert.match(result.stdout, /atual: 2/);
    assert.match(result.stderr, /src\/a\.ts: 2 \(baseline: 1, \+1\)/);
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
});

test('check-eslint-disable-baseline não regride quando a contagem por arquivo não muda', () => {
  const sandbox = mkdtempSync(join(tmpdir(), 'eslint-disable-baseline-stable-'));

  try {
    mkdirSync(join(sandbox, 'src'), { recursive: true });
    writeFileSync(
      join(sandbox, '.eslint-disable-baseline.json'),
      JSON.stringify({ productionEslintDisableCount: 1, counts: { 'src/a.ts': 1 } }),
    );
    writeFileSync(join(sandbox, 'src/a.ts'), '// eslint-disable-next-line a\nexport const a = 1;\n');

    const result = runGate(sandbox);

    assert.equal(result.status, 0, `esperado exit=0; saída:\n${result.stdout}${result.stderr}`);
    assert.match(result.stdout, /atual: 1 · baseline: 1/);
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
});

test('check-eslint-disable-baseline falha com erro legível (exit 2), sem stack trace cru, quando src/ não existe', () => {
  // Regressão real encontrada ao testar: scan() em lib/baseline-gate.mjs rodava
  // ANTES do existsSync(baseline) e sem try/catch — ENOENT/ENOTDIR/EACCES ao
  // varrer src/ derrubava o processo com stack trace do Node e exit=1, o MESMO
  // exit code usado para uma regressão real do gate (ambíguo em CI).
  const sandbox = mkdtempSync(join(tmpdir(), 'eslint-disable-baseline-nosrc-'));

  try {
    // Sem mkdir de 'src' e sem baseline — propositalmente nenhum dos dois existe.
    const result = runGate(sandbox);

    assert.equal(result.status, 2, `esperado exit=2; saída:\n${result.stdout}${result.stderr}`);
    assert.equal(result.signal, null);
    const combined = `${result.stdout}${result.stderr}`;
    assert.doesNotMatch(combined, /at readdirSync|at ModuleJob\.run|at walk/);
    assert.match(combined, /ENOENT/);
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
});

test('check-eslint-disable-baseline falha com erro legível (exit 2) quando src/ existe mas é um arquivo (ENOTDIR)', () => {
  const sandbox = mkdtempSync(join(tmpdir(), 'eslint-disable-baseline-srcfile-'));

  try {
    writeFileSync(join(sandbox, 'src'), 'não é um diretório');
    writeFileSync(join(sandbox, '.eslint-disable-baseline.json'), JSON.stringify({ counts: {} }));

    const result = runGate(sandbox);

    assert.equal(result.status, 2, `esperado exit=2; saída:\n${result.stdout}${result.stderr}`);
    assert.equal(result.signal, null);
    const combined = `${result.stdout}${result.stderr}`;
    assert.doesNotMatch(combined, /at readdirSync|at ModuleJob\.run|at walk/);
    assert.match(combined, /ENOTDIR/);
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
});

test('check-eslint-disable-baseline --update regrava a baseline preservando o campo meta', () => {
  const sandbox = mkdtempSync(join(tmpdir(), 'eslint-disable-baseline-update-'));

  try {
    mkdirSync(join(sandbox, 'src'), { recursive: true });
    writeFileSync(
      join(sandbox, '.eslint-disable-baseline.json'),
      JSON.stringify({
        productionEslintDisableCount: 5,
        meta: { target: 80, deadline: '2027-03-31' },
        counts: { 'src/old.ts': 5 },
      }),
    );
    writeFileSync(join(sandbox, 'src/a.ts'), '// eslint-disable-next-line a\nexport const a = 1;\n');

    const result = runGate(sandbox, '--update');

    assert.equal(result.status, 0, `esperado exit=0; saída:\n${result.stdout}${result.stderr}`);
    const baseline = JSON.parse(
      readFileSync(join(sandbox, '.eslint-disable-baseline.json'), 'utf8'),
    );
    assert.equal(baseline.productionEslintDisableCount, 1);
    assert.deepEqual(baseline.counts, { 'src/a.ts': 1 });
    assert.deepEqual(baseline.meta, { target: 80, deadline: '2027-03-31' });
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
});
