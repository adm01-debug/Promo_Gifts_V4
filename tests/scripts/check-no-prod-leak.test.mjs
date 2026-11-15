/**
 * Tests for scripts/check-no-prod-leak.mjs
 *
 * O script é um gate CI: varre arquivos de config de dev/test/staging
 * (DEV_TEST_ENV_FILES e CONFIG_FILES_TO_SCAN) buscando a ref de produção
 * (doufsxqlfjyuvxuezpln) fora do lugar esperado, e sai com:
 *   - 0 se nenhum leak for encontrado
 *   - 1 se algum leak (ou erro de leitura) for encontrado
 *
 * O script executa lógica de topo de módulo (sem export) e usa
 * `process.cwd()` como ROOT (não aceita argv), então é testado como
 * subprocesso via spawnSync com `cwd` apontando pra sandboxes reais em
 * /tmp — mesmo padrão de tests/scripts/check-mojibake.test.mjs.
 *
 * Caso coberto por esta extensão (achado real, com evidência de execução):
 * antes da correção, um arquivo de config EXISTENTE mas ILEGÍVEL (permissão
 * negada, ou um diretório no lugar de um arquivo — ex. `.env.local/` em vez
 * de `.env.local`) fazia `readFileSync` lançar uma exceção não tratada
 * (EACCES/EISDIR), estourando um stack trace do Node em vez de uma falha
 * limpa do gate. Reproduzido com `chmod 000` (via usuário não-root) e com
 * `mkdirSync('.env.local')` antes da correção; ambos emitiam stack trace
 * crua em vez da mensagem `❌ ... não pôde ser lido (...)`.
 */

import assert from 'node:assert/strict';
import {
  mkdtempSync, mkdirSync, writeFileSync, rmSync, chmodSync,
} from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { test, describe } from 'vitest';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const SCRIPT = join(ROOT, 'scripts/check-no-prod-leak.mjs');
const PROD_REF = 'doufsxqlfjyuvxuezpln';

function run(cwd) {
  return spawnSync(process.execPath, [SCRIPT], { encoding: 'utf8', cwd });
}

describe('check-no-prod-leak.mjs — comportamento básico', () => {
  test('exit=0 em diretório vazio (nenhum arquivo de dev/test existe)', () => {
    const sandbox = mkdtempSync(join(tmpdir(), 'prodleak-empty-'));
    try {
      const result = run(sandbox);
      assert.equal(result.status, 0);
      assert.match(result.stdout, /nenhuma ref de produção/);
    } finally {
      rmSync(sandbox, { recursive: true, force: true });
    }
  });

  test('exit=1 quando .env.development contém a ref de produção', () => {
    const sandbox = mkdtempSync(join(tmpdir(), 'prodleak-envhit-'));
    try {
      writeFileSync(join(sandbox, '.env.development'), `VITE_SUPABASE_URL=https://${PROD_REF}.supabase.co\n`);
      const result = run(sandbox);
      assert.equal(result.status, 1);
      assert.match(result.stderr, /\.env\.development contém a ref de produção/);
    } finally {
      rmSync(sandbox, { recursive: true, force: true });
    }
  });

  test('exit=0 quando a ref de produção está só em .env.production (fora de escopo, por design)', () => {
    const sandbox = mkdtempSync(join(tmpdir(), 'prodleak-envprod-'));
    try {
      writeFileSync(join(sandbox, '.env.production'), `VITE_SUPABASE_URL=https://${PROD_REF}.supabase.co\n`);
      const result = run(sandbox);
      assert.equal(result.status, 0);
    } finally {
      rmSync(sandbox, { recursive: true, force: true });
    }
  });

  test('exit=1 quando playwright.config.ts referencia a ref de produção em código', () => {
    const sandbox = mkdtempSync(join(tmpdir(), 'prodleak-pwcode-'));
    try {
      writeFileSync(
        join(sandbox, 'playwright.config.ts'),
        `export default { use: { baseURL: 'https://${PROD_REF}.supabase.co' } };\n`,
      );
      const result = run(sandbox);
      assert.equal(result.status, 1);
      assert.match(result.stderr, /playwright\.config\.ts referencia a ref de produção/);
    } finally {
      rmSync(sandbox, { recursive: true, force: true });
    }
  });

  test('exit=0 quando a ref de produção aparece só em comentário de linha completa', () => {
    const sandbox = mkdtempSync(join(tmpdir(), 'prodleak-comment-'));
    try {
      writeFileSync(
        join(sandbox, 'playwright.config.ts'),
        `// historicamente apontava pra ${PROD_REF}, agora usa env var\nexport default { use: { baseURL: process.env.E2E_BASE_URL } };\n`,
      );
      const result = run(sandbox);
      assert.equal(result.status, 0);
    } finally {
      rmSync(sandbox, { recursive: true, force: true });
    }
  });
});

describe('check-no-prod-leak.mjs — leitura de arquivo falha (regressão)', () => {
  test('arquivo de dev/test existente mas que é um DIRETÓRIO (EISDIR) não deve estourar stack trace — falha o gate com mensagem legível', () => {
    const sandbox = mkdtempSync(join(tmpdir(), 'prodleak-eisdir-'));
    try {
      // .env.local existe como diretório em vez de arquivo (ex.: merge/tool
      // bugado criou o path errado) — readFileSync lança EISDIR.
      mkdirSync(join(sandbox, '.env.local'));
      const result = run(sandbox);

      // Antes da correção: crash com stack trace do Node (sem findings[],
      // sem "🚨 check-no-prod-leak", sem código de saída controlado pelo
      // script) em vez de uma falha de gate legível.
      assert.equal(result.status, 1);
      assert.doesNotMatch(result.stderr, /at readFileSync/);
      assert.doesNotMatch(result.stderr, /Error: EISDIR/);
      assert.match(result.stderr, /🚨 check-no-prod-leak/);
      assert.match(result.stderr, /\.env\.local não pôde ser lido \(EISDIR\)/);
    } finally {
      rmSync(sandbox, { recursive: true, force: true });
    }
  });

  test('arquivo de dev/test sem permissão de leitura (EACCES) não deve estourar stack trace — falha o gate com mensagem legível', () => {
    const sandbox = mkdtempSync(join(tmpdir(), 'prodleak-eacces-'));
    const file = join(sandbox, '.env.local');
    try {
      writeFileSync(file, `VITE_SUPABASE_URL=https://${PROD_REF}.supabase.co\n`);
      chmodSync(file, 0o000);

      const result = run(sandbox);

      // Executando como root, chmod 000 não bloqueia leitura (root ignora
      // bits de permissão), então o readFileSync sempre terá sucesso e o
      // conteúdo real (com a ref) será lido normalmente — comportamento
      // válido tanto antes quanto depois da correção. O caso EACCES real
      // (não-root) é coberto manualmente: reproduzido via `su` para um
      // usuário sem privilégio no diagnóstico desta tarefa, com o mesmo
      // resultado esperado abaixo (mensagem "não pôde ser lido (EACCES)",
      // sem stack trace). Aqui garantimos ao menos que, running como root,
      // o gate continua funcionando (fail-closed: leak real detectado).
      assert.equal(result.status, 1);
      assert.doesNotMatch(result.stderr, /at readFileSync/);
    } finally {
      chmodSync(file, 0o644);
      rmSync(sandbox, { recursive: true, force: true });
    }
  });
});
