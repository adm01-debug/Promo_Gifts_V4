import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { test } from 'vitest';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const UPDATE_SCRIPT = join(ROOT, 'scripts/update-any-type-baseline.mjs');
const CHECK_SCRIPT = join(ROOT, 'scripts/check-any-type-baseline.mjs');

function runUpdate(sandbox) {
  return spawnSync(process.execPath, [UPDATE_SCRIPT], { cwd: sandbox, encoding: 'utf8' });
}

function runCheck(sandbox) {
  return spawnSync(process.execPath, [CHECK_SCRIPT], { cwd: sandbox, encoding: 'utf8' });
}

test('update-any-type-baseline conta múltiplas ocorrências de `any` na mesma linha (sem isso, o baseline gerado diverge do gate e causa regressão falsa logo após o --update)', () => {
  const sandbox = mkdtempSync(join(tmpdir(), 'any-baseline-update-multi-'));

  try {
    mkdirSync(join(sandbox, 'src'), { recursive: true });

    // 3 ocorrências de `: any` NA MESMA LINHA.
    writeFileSync(
      join(sandbox, 'src/a.ts'),
      'export function f(a: any, b: any): any {\n  return a;\n}\n',
    );

    const updateResult = runUpdate(sandbox);
    assert.equal(updateResult.status, 0, `esperado exit=0; saída:\n${updateResult.stdout}${updateResult.stderr}`);

    const baseline = JSON.parse(readFileSync(join(sandbox, '.any-type-baseline.json'), 'utf8'));

    // O baseline gerado precisa refletir as 3 ocorrências reais, não 1
    // (uma por linha reportada pelo `grep -n`, ignorando múltiplos matches).
    assert.equal(baseline.productionAnyCount, 3, `baseline.productionAnyCount deveria ser 3; recebido: ${JSON.stringify(baseline)}`);
    assert.equal(baseline.counts['src/a.ts'], 3, `baseline.counts['src/a.ts'] deveria ser 3; recebido: ${JSON.stringify(baseline)}`);

    // Rodar o gate imediatamente após o --update, sem nenhuma mudança de
    // código, NUNCA pode reportar regressão — senão o --update não serve
    // para "aceitar" o estado atual do código.
    const checkResult = runCheck(sandbox);
    assert.equal(checkResult.status, 0, `esperado exit=0 (sem regressão) logo após --update; saída:\n${checkResult.stdout}${checkResult.stderr}`);
    assert.match(checkResult.stdout, /atual: 3 · baseline: 3/);
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
});

test('update-any-type-baseline preserva meta pré-existente e produz baseline válido em diretório sem nenhum any', () => {
  const sandbox = mkdtempSync(join(tmpdir(), 'any-baseline-update-empty-'));

  try {
    mkdirSync(join(sandbox, 'src'), { recursive: true });
    writeFileSync(
      join(sandbox, '.any-type-baseline.json'),
      JSON.stringify({ meta: { owner: 'team-x' }, counts: { 'src/old.ts': 5 } }),
    );
    writeFileSync(join(sandbox, 'src/a.ts'), 'export const x = 1;\n');

    const result = runUpdate(sandbox);
    assert.equal(result.status, 0, `esperado exit=0; saída:\n${result.stdout}${result.stderr}`);

    const baseline = JSON.parse(readFileSync(join(sandbox, '.any-type-baseline.json'), 'utf8'));
    assert.equal(baseline.productionAnyCount, 0);
    assert.deepEqual(baseline.counts, {});
    assert.deepEqual(baseline.meta, { owner: 'team-x' });
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
});
