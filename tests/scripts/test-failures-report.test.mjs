/**
 * Tests for scripts/test-failures-report.mjs
 *
 * O script lê um log de `vitest run` (argv[2] ou stdin), extrai cada linha
 * "❯ <arquivo> (N tests | F failed)" e gera um Markdown categorizado por
 * prioridade (P0 Segurança/RLS, P1 Hooks/Componentes/..., P2 outros).
 *
 * Executa lógica de topo de módulo (sem export), então é testado como
 * subprocesso via spawnSync, seguindo o padrão de
 * tests/scripts/check-mojibake.test.mjs e check-console-baseline.test.mjs.
 */

import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { test, describe } from 'vitest';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const SCRIPT = join(ROOT, 'scripts/test-failures-report.mjs');

function run(...args) {
  return spawnSync(process.execPath, [SCRIPT, ...args], { encoding: 'utf8' });
}

describe('test-failures-report.mjs — comportamento básico', () => {
  test('log sem falhas gera relatório zerado, exit=0', () => {
    const sandbox = mkdtempSync(join(tmpdir(), 'tfr-empty-'));
    try {
      const file = join(sandbox, 'in.log');
      writeFileSync(file, ' ✓ tests/lib/foo.test.ts (3 tests) 10ms\n');
      const result = run(file);
      assert.equal(result.status, 0);
      assert.match(result.stdout, /Arquivos com falha: \*\*0\*\*/);
    } finally {
      rmSync(sandbox, { recursive: true, force: true });
    }
  });

  test('categoriza e prioriza corretamente um log típico com múltiplas falhas', () => {
    const sandbox = mkdtempSync(join(tmpdir(), 'tfr-typical-'));
    try {
      const file = join(sandbox, 'in.log');
      writeFileSync(
        file,
        [
          ' ❯ tests/security/auth.test.ts (5 tests | 5 failed) 120ms',
          ' ❯ tests/hooks/useFoo.test.ts (12 tests | 2 failed) 340ms',
        ].join('\n'),
      );
      const result = run(file);
      assert.equal(result.status, 0);
      assert.match(result.stdout, /P0 — Segurança \/ authz/);
      assert.match(result.stdout, /tests\/security\/auth\.test\.ts` \| 5 \| 5/);
      assert.match(result.stdout, /tests\/hooks\/useFoo\.test\.ts` \| 2 \| 12/);
    } finally {
      rmSync(sandbox, { recursive: true, force: true });
    }
  });
});

describe('test-failures-report.mjs — saída truncada/parcial (regressão)', () => {
  test('linha truncada (sem "| F failed") não deve "roubar" a falha de uma linha seguinte real', () => {
    // Bug original: `[^|]*` no regex casava \n, então uma linha ❯ incompleta
    // (ex.: saída de vitest truncada por buffer/corte de processo) se fundia
    // com a linha "❯ ... | F failed" seguinte, e o relatório atribuía a
    // contagem de falhas ao arquivo ERRADO (o truncado), enquanto a falha
    // real de segurança (P0) desaparecia silenciosamente do relatório.
    const sandbox = mkdtempSync(join(tmpdir(), 'tfr-truncated-'));
    try {
      const file = join(sandbox, 'in.log');
      writeFileSync(
        file,
        [
          ' ❯ tests/hooks/useFoo.test.ts (12 tests',
          ' ❯ tests/security/auth.test.ts (5 tests | 5 failed) 120ms',
        ].join('\n'),
      );
      const result = run(file);
      assert.equal(result.status, 0);

      // A falha real de segurança precisa aparecer, com os números certos.
      assert.match(result.stdout, /P0 — Segurança \/ authz/);
      assert.match(result.stdout, /tests\/security\/auth\.test\.ts` \| 5 \| 5/);

      // O arquivo truncado NÃO pode aparecer no relatório com dados
      // inventados a partir da linha seguinte.
      assert.doesNotMatch(result.stdout, /tests\/hooks\/useFoo\.test\.ts/);

      // Exatamente 1 arquivo com falha reportado (o real, não o truncado).
      assert.match(result.stdout, /Arquivos com falha: \*\*1\*\*/);
    } finally {
      rmSync(sandbox, { recursive: true, force: true });
    }
  });

  test('linha malformada sem parênteses/pipe não contamina o arquivo anterior', () => {
    const sandbox = mkdtempSync(join(tmpdir(), 'tfr-malformed-'));
    try {
      const file = join(sandbox, 'in.log');
      writeFileSync(
        file,
        [
          ' ❯ tests/lib/broken1.test.ts (5 tests) sem barra',
          ' ❯ tests/lib/broken2.test.ts 5 tests | 2 failed',
        ].join('\n'),
      );
      const result = run(file);
      assert.equal(result.status, 0);
      assert.match(result.stdout, /Arquivos com falha: \*\*0\*\*/);
    } finally {
      rmSync(sandbox, { recursive: true, force: true });
    }
  });
});
