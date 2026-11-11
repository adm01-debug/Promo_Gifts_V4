import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { test } from 'vitest';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const SCRIPT = join(ROOT, 'scripts/check-boundary-baseline.mjs');

function runGate(sandbox, args = []) {
  // maxBuffer alto: com 100k violações a saída passa de 1 MB (padrão do spawnSync) e o Node
  // mataria o filho com SIGTERM — falso positivo de "processo morreu por sinal".
  return spawnSync(process.execPath, [SCRIPT, ...args], { cwd: sandbox, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });
}

function makeSandbox(prefix) {
  const sandbox = mkdtempSync(join(tmpdir(), prefix));
  mkdirSync(join(sandbox, 'src/pages/quotes'), { recursive: true });
  mkdirSync(join(sandbox, 'src/pages/orders'), { recursive: true });
  writeFileSync(join(sandbox, 'src/pages/orders/OrderPage.tsx'), 'export default function OrderPage() { return null; }\n');
  return sandbox;
}

test('check-boundary-baseline não aponta violação quando não há importação cross-domain', () => {
  const sandbox = makeSandbox('boundary-ok-');
  try {
    writeFileSync(
      join(sandbox, 'src/pages/quotes/QuoteViewPage.tsx'),
      "import React from 'react';\nexport default function QuoteViewPage() { return null; }\n",
    );
    writeFileSync(join(sandbox, '.boundary-baseline.json'), JSON.stringify({ description: 't', violations: [] }));

    const result = runGate(sandbox);

    assert.equal(result.status, 0, `esperado exit=0; saída:\n${result.stdout}${result.stderr}`);
    assert.match(result.stdout, /0 novas/);
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
});

test('check-boundary-baseline detecta importação cross-domain nova fora do baseline', () => {
  const sandbox = makeSandbox('boundary-new-');
  try {
    writeFileSync(
      join(sandbox, 'src/pages/quotes/QuoteViewPage.tsx'),
      "import { bar } from '../orders/OrderPage';\n",
    );
    writeFileSync(join(sandbox, '.boundary-baseline.json'), JSON.stringify({ description: 't', violations: [] }));

    const result = runGate(sandbox);

    assert.equal(result.status, 1, `esperado exit=1 (violação nova); saída:\n${result.stdout}${result.stderr}`);
    assert.match(result.stderr, /pages\/quotes\/QuoteViewPage\.tsx:1\s+pages\/quotes → pages\/orders\/OrderPage/);
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
});

test('check-boundary-baseline trata baseline ausente como erro de execução (exit 2), sem crash cru', () => {
  const sandbox = makeSandbox('boundary-missing-');
  try {
    writeFileSync(join(sandbox, 'src/pages/quotes/QuoteViewPage.tsx'), "export default function Q() { return null; }\n");
    // .boundary-baseline.json propositalmente não existe.

    const result = runGate(sandbox);

    assert.equal(result.status, 2, `esperado exit=2; saída:\n${result.stdout}${result.stderr}`);
    assert.equal(result.signal, null);
    const combined = `${result.stdout}${result.stderr}`;
    assert.doesNotMatch(combined, /at readFileSync|at ModuleJob\.run/);
    assert.match(combined, /ausente ou com JSON inválido/);
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
});

test('check-boundary-baseline trata baseline JSON corrompido como erro de execução (exit 2), sem crash cru', () => {
  const sandbox = makeSandbox('boundary-corrupt-');
  try {
    writeFileSync(join(sandbox, 'src/pages/quotes/QuoteViewPage.tsx'), "export default function Q() { return null; }\n");
    writeFileSync(join(sandbox, '.boundary-baseline.json'), '{ this is not json');

    const result = runGate(sandbox);

    assert.equal(result.status, 2, `esperado exit=2; saída:\n${result.stdout}${result.stderr}`);
    assert.equal(result.signal, null);
    const combined = `${result.stdout}${result.stderr}`;
    assert.doesNotMatch(combined, /at JSON\.parse|at ModuleJob\.run/);
    assert.match(combined, /ausente ou com JSON inválido/);
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
});

test('check-boundary-baseline não trava com RangeError em arquivo com muitas violações (100k importações cross-domain)', () => {
  const sandbox = makeSandbox('boundary-huge-');
  try {
    // `push(...deduped)` excede o limite de argumentos de chamada de função
    // do engine (V8: entre 65536 e 131072) quando há muitas violações —
    // sem o fix, isto crasha com "RangeError: Maximum call stack size
    // exceeded" em vez de reportar o gate corretamente.
    const N = 100_000;
    const lines = [];
    for (let i = 0; i < N; i++) lines.push(`import { x${i} } from '../orders/mod${i}';`);
    writeFileSync(join(sandbox, 'src/pages/quotes/QuoteViewPage.tsx'), lines.join('\n') + '\n');
    writeFileSync(join(sandbox, '.boundary-baseline.json'), JSON.stringify({ description: 't', violations: [] }));

    const result = runGate(sandbox);

    assert.equal(result.signal, null, `processo não deve morrer por sinal; stderr:\n${result.stderr}`);
    assert.doesNotMatch(result.stderr, /RangeError|Maximum call stack size exceeded/);
    assert.equal(result.status, 1, `esperado exit=1 (violações novas); saída:\n${result.stdout}${result.stderr}`);
    assert.match(result.stderr, new RegExp(`${N} importa`));
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
}, 30_000);
