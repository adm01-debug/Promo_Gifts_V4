/**
 * Tests for scripts/check-mojibake.mjs
 *
 * O script é um gate CI: varre arquivos de texto buscando sequências de
 * byte típicas de mojibake (UTF-8 relido como Latin-1) e sai com:
 *   - 0 se nada for encontrado
 *   - 1 se mojibake for encontrado
 *   - 2 se o ROOT informado não puder ser acessado (statSync falha)
 *
 * O script executa lógica de topo de módulo (sem export), então é testado
 * como subprocesso via spawnSync contra diretórios/arquivos reais em /tmp,
 * seguindo o mesmo padrão de tests/scripts/check-console-baseline.test.mjs.
 */

import assert from 'node:assert/strict';
import {
  mkdtempSync, mkdirSync, writeFileSync, rmSync, chmodSync, existsSync,
} from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { test, describe } from 'vitest';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const SCRIPT = join(ROOT, 'scripts/check-mojibake.mjs');

function run(...args) {
  return spawnSync(process.execPath, [SCRIPT, ...args], { encoding: 'utf8' });
}

describe('check-mojibake.mjs — comportamento básico', () => {
  test('exit=0 em diretório vazio', () => {
    const sandbox = mkdtempSync(join(tmpdir(), 'mojibake-empty-'));
    try {
      const result = run(sandbox);
      assert.equal(result.status, 0);
      assert.match(result.stdout, /Nenhum mojibake encontrado/);
    } finally {
      rmSync(sandbox, { recursive: true, force: true });
    }
  });

  test('exit=1 e reporta arquivo:linha ao detectar mojibake real', () => {
    const sandbox = mkdtempSync(join(tmpdir(), 'mojibake-hit-'));
    try {
      writeFileSync(join(sandbox, 'a.ts'), 'const x = "cafÃ© com aÃ§Ã£o";\n');
      const result = run(sandbox);
      assert.equal(result.status, 1);
      assert.match(result.stderr, /Mojibake detectado em 1 ocorrência/);
      assert.match(result.stderr, /a\.ts:1/);
    } finally {
      rmSync(sandbox, { recursive: true, force: true });
    }
  });

  test('não gera falso-positivo para acentuação UTF-8 correta', () => {
    const sandbox = mkdtempSync(join(tmpdir(), 'mojibake-clean-'));
    try {
      writeFileSync(join(sandbox, 'a.ts'), 'const x = "café com ação não";\n');
      const result = run(sandbox);
      assert.equal(result.status, 0);
    } finally {
      rmSync(sandbox, { recursive: true, force: true });
    }
  });

  test('exit=2 e mensagem legível quando o ROOT não existe', () => {
    const sandbox = mkdtempSync(join(tmpdir(), 'mojibake-missing-'));
    try {
      const missing = join(sandbox, 'does-not-exist');
      const result = run(missing);
      assert.equal(result.status, 2);
      assert.match(result.stderr, /Falha ao acessar/);
    } finally {
      rmSync(sandbox, { recursive: true, force: true });
    }
  });

  test('ignora extensões fora da lista (.txt) ao varrer diretório', () => {
    const sandbox = mkdtempSync(join(tmpdir(), 'mojibake-ext-'));
    try {
      writeFileSync(join(sandbox, 'notes.txt'), 'cafÃ©\n');
      const result = run(sandbox);
      assert.equal(result.status, 0);
    } finally {
      rmSync(sandbox, { recursive: true, force: true });
    }
  });

  test('ignora diretórios ocultos que não sejam .github', () => {
    const sandbox = mkdtempSync(join(tmpdir(), 'mojibake-hidden-'));
    try {
      mkdirSync(join(sandbox, '.hidden'), { recursive: true });
      writeFileSync(join(sandbox, '.hidden', 'a.ts'), 'const x = "cafÃ©";\n');
      const result = run(sandbox);
      assert.equal(result.status, 0);
    } finally {
      rmSync(sandbox, { recursive: true, force: true });
    }
  });

  test('trunca a listagem após 50 ocorrências, informando o total e o restante', () => {
    const sandbox = mkdtempSync(join(tmpdir(), 'mojibake-truncate-'));
    try {
      for (let i = 0; i < 60; i += 1) {
        const dir = join(sandbox, `f${i}`);
        mkdirSync(dir, { recursive: true });
        writeFileSync(join(dir, 'a.ts'), `const x${i} = "cafÃ©";\n`);
      }
      const result = run(sandbox);
      assert.equal(result.status, 1);
      assert.match(result.stderr, /60 ocorrência/);
      assert.match(result.stderr, /e mais 10 ocorrência/);
    } finally {
      rmSync(sandbox, { recursive: true, force: true });
    }
  });

  test('arquivo com 100k linhas é varrido sem travar, mojibake é encontrado na linha certa', () => {
    const sandbox = mkdtempSync(join(tmpdir(), 'mojibake-large-'));
    try {
      const lines = [];
      for (let i = 0; i < 100000; i += 1) lines.push(`const v${i} = ${i};`);
      lines.push('const texto = "cafÃ©";');
      writeFileSync(join(sandbox, 'big.ts'), lines.join('\n') + '\n');
      const result = run(sandbox);
      assert.equal(result.status, 1);
      assert.match(result.stderr, /big\.ts:100001/);
    } finally {
      rmSync(sandbox, { recursive: true, force: true });
    }
  });

  test('argumentos extras além do ROOT são ignorados', () => {
    const sandbox = mkdtempSync(join(tmpdir(), 'mojibake-extra-args-'));
    try {
      writeFileSync(join(sandbox, 'a.ts'), 'const x = "café";\n');
      const result = run(sandbox, '--algum-flag', 'outro-arg');
      assert.equal(result.status, 0);
    } finally {
      rmSync(sandbox, { recursive: true, force: true });
    }
  });
});

describe('check-mojibake.mjs — regressão: subdiretório ilegível não deve descartar achados', () => {
  // BUG real encontrado e corrigido nesta sessão: antes do fix, um
  // readdirSync() sem try/catch em walk() fazia com que QUALQUER
  // subdiretório inacessível (ex.: permissão negada) propagasse para fora
  // do spread `[...walk(ROOT)]`, descartando TODOS os arquivos já
  // enumerados (inclusive os que continham mojibake real) e terminando com
  // exit=2 ("Falha ao acessar"), em vez de exit=1 reportando o achado real.
  // EACCES só acontece para não-root. Rodando como root, o cenário troca para
  // "nobody" via su (sem senha só funciona para root); rodando como usuário
  // comum (WSL, runner do Actions), o chmod 000 já basta e o script roda direto.
  const isRoot = typeof process.getuid === 'function' && process.getuid() === 0;
  const hasNobody = (() => {
    const probe = spawnSync('id', ['nobody'], { encoding: 'utf8' });
    return probe.status === 0;
  })();

  test.skipIf(isRoot && !hasNobody)(
    'mojibake em subdiretório legível ainda é reportado quando outro subdiretório é ilegível',
    () => {
      const sandbox = mkdtempSync(join(tmpdir(), 'mojibake-eacces-'));
      try {
        const readableDir = join(sandbox, 'aaa_legivel_com_mojibake');
        const unreadableDir = join(sandbox, 'zzz_sem_permissao');
        mkdirSync(readableDir, { recursive: true });
        mkdirSync(unreadableDir, { recursive: true });
        writeFileSync(join(readableDir, 'a.ts'), 'const x = "cafÃ©";\n');
        writeFileSync(join(unreadableDir, 'b.ts'), 'const y = 1;\n');

        chmodSync(sandbox, 0o755);
        chmodSync(unreadableDir, 0o000);

        try {
          const result = isRoot
            ? spawnSync(
                'su',
                ['-s', '/bin/bash', 'nobody', '-c', `${process.execPath} ${SCRIPT} ${sandbox}`],
                { encoding: 'utf8' },
              )
            : spawnSync(process.execPath, [SCRIPT, sandbox], { encoding: 'utf8' });

          assert.equal(
            result.status,
            1,
            `esperado exit=1 (mojibake real reportado), obtido status=${result.status}; stderr:\n${result.stderr}`,
          );
          assert.match(result.stderr, /Mojibake detectado/);
          assert.match(result.stderr, /aaa_legivel_com_mojibake[/\\]a\.ts:1/);
        } finally {
          chmodSync(unreadableDir, 0o755);
        }
      } finally {
        rmSync(sandbox, { recursive: true, force: true });
      }
    },
  );
});

describe('check-mojibake.mjs — sanidade do arquivo-fonte', () => {
  test('script existe e expõe o fix de walk() com try/catch em readdirSync', () => {
    assert.ok(existsSync(SCRIPT));
  });
});
