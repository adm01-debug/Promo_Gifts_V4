import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { test } from 'vitest';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const SCRIPT = join(ROOT, 'scripts/check-clickable-drift.mjs');

function runGate(sandbox, args = []) {
  return spawnSync(process.execPath, [SCRIPT, ...args], { cwd: sandbox, encoding: 'utf8' });
}

test('check-clickable-drift trata baseline JSON corrompido como erro de execução (exit 2), sem crash cru', () => {
  const sandbox = mkdtempSync(join(tmpdir(), 'clickable-drift-corrupt-'));

  try {
    mkdirSync(join(sandbox, 'src'), { recursive: true });
    mkdirSync(join(sandbox, '.a11y'), { recursive: true });
    writeFileSync(join(sandbox, 'src/Foo.tsx'), 'export const x = <div role="button">x</div>;\n');
    writeFileSync(join(sandbox, '.a11y/clickable-baseline.json'), 'isto nao e json valido {{{');

    const result = runGate(sandbox);

    assert.equal(result.status, 2, `esperado exit=2; saída:\n${result.stdout}${result.stderr}`);
    assert.equal(result.signal, null);
    const combined = `${result.stdout}${result.stderr}`;
    assert.doesNotMatch(combined, /at JSON\.parse|at ModuleJob\.run|at readFileSync/);
    assert.match(combined, /Falha ao ler baseline/);
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
});

test('check-clickable-drift --update cria .a11y/ quando a pasta ainda não existe (sem crash ENOENT)', () => {
  const sandbox = mkdtempSync(join(tmpdir(), 'clickable-drift-update-'));

  try {
    mkdirSync(join(sandbox, 'src'), { recursive: true });
    writeFileSync(join(sandbox, 'src/Foo.tsx'), "export const x = <div role='button'>x</div>;\n");
    // Nota: NÃO criamos sandbox/.a11y aqui — é exatamente o cenário que crashava.
    assert.equal(existsSync(join(sandbox, '.a11y')), false);

    const result = runGate(sandbox, ['--update']);

    assert.equal(result.status, 0, `esperado exit=0; saída:\n${result.stdout}${result.stderr}`);
    assert.equal(result.signal, null);
    assert.doesNotMatch(result.stderr, /ENOENT|at writeFileSync/);

    const baselinePath = join(sandbox, '.a11y/clickable-baseline.json');
    assert.equal(existsSync(baselinePath), true);
    const written = JSON.parse(readFileSync(baselinePath, 'utf8'));
    assert.deepEqual(written.files, ['src/Foo.tsx']);
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
});
