/**
 * Tests for scripts/qa-price-readonly-regression.mjs
 *
 * O script faz checagens estáticas (grep/AST-lite, sem subir o app) do
 * checklist `qa/QUOTE_ITEM_PRICE_READONLY_REGRESSION.md`: testid antigo
 * ausente, `quote-item-price-display` presente, `CurrencyInput` removido,
 * trigger antifraude versionado, specs e2e críticos presentes e snapshots
 * antigos removidos. Não aceita argv nem lê env vars; usa `process.cwd()`
 * como ROOT, então é testado como subprocesso via spawnSync com `cwd`
 * apontando pra sandboxes em /tmp — mesmo padrão de
 * tests/scripts/check-product-type-fields.test.mjs.
 *
 * Achado real (com evidência de execução antes da correção): a função
 * `walk()` chamava `readdirSync`/`statSync` sem tratamento de erro. Isso
 * fazia o script estourar uma exceção não tratada (stack trace cru do
 * Node, sem nenhuma das mensagens "✓/✗" do próprio gate) em pelo menos três
 * cenários reais:
 *   1. ROOT sem a pasta `src/` (ou sem `e2e/`) — ENOENT no primeiro
 *      `readdirSync` de `walk()`.
 *   2. Subdiretório dentro de `src/` sem permissão de leitura — EACCES.
 *   3. Symlink circular dentro de `src/` — ELOOP no `statSync` de `walk()`.
 * Em todos os casos o processo morria com `code: 'ENOENT'/'EACCES'/'ELOOP'`
 * e traço de pilha do Node, em vez do relatório controlado ✓/✗ + exit 1 que
 * o resto do script produz para toda falha esperada.
 */

import assert from 'node:assert/strict';
import {
  mkdtempSync, mkdirSync, writeFileSync, symlinkSync, chmodSync, rmSync,
} from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { test, describe } from 'vitest';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const SCRIPT = join(ROOT, 'scripts/qa-price-readonly-regression.mjs');

// chmod 000 não bloqueia leitura quando o processo roda como root (uid 0) —
// a checagem EACCES do kernel é pulada nesse caso.
const IS_ROOT = typeof process.getuid === 'function' && process.getuid() === 0;

function run(cwd) {
  return spawnSync(process.execPath, [SCRIPT], { encoding: 'utf8', cwd });
}

function buildValidFixture(sandbox) {
  mkdirSync(join(sandbox, 'src/components/quotes'), { recursive: true });
  mkdirSync(join(sandbox, 'e2e/quotes'), { recursive: true });
  mkdirSync(join(sandbox, 'supabase/migrations'), { recursive: true });

  writeFileSync(
    join(sandbox, 'src/components/quotes/QuoteItemsList.tsx'),
    'export const QuoteItemsList = () => <div data-testid="quote-item-price-display" aria-readonly="true" />;\n',
  );
  writeFileSync(
    join(sandbox, 'supabase/migrations/20250101_trigger.sql'),
    'CREATE TRIGGER trg_prevent_non_admin_quote_item_price_change ...;\n',
  );
  writeFileSync(join(sandbox, 'e2e/quotes/quote-item-price-immutable.spec.ts'), '');
  writeFileSync(join(sandbox, 'e2e/quotes/quote-items-list-mobile-layout.spec.ts'), '');
  writeFileSync(
    join(sandbox, 'e2e/quotes/quote-item-editor-sheet-header.spec.ts'),
    '// quote-item-price-display\ntest("Tab order ignora preço", () => {});\n',
  );
}

function assertNoCrash(result) {
  assert.doesNotMatch(result.stderr, /at readdirSync/);
  assert.doesNotMatch(result.stderr, /at statSync/);
  assert.doesNotMatch(result.stderr, /Error: (ENOENT|EACCES|ELOOP)/);
}

describe('qa-price-readonly-regression.mjs — comportamento básico', () => {
  test('exit=0 quando a fixture satisfaz todas as checagens', () => {
    const sandbox = mkdtempSync(join(tmpdir(), 'qapr-ok-'));
    try {
      buildValidFixture(sandbox);
      const result = run(sandbox);
      assert.equal(result.status, 0);
      assert.match(result.stdout, /Todas as checagens estáticas passaram/);
    } finally {
      rmSync(sandbox, { recursive: true, force: true });
    }
  });
});

describe('qa-price-readonly-regression.mjs — exceção não tratada em walk() (regressão)', () => {
  test('ROOT sem pasta src/ nem e2e/ não deve estourar stack trace — falha controlada (exit 1)', () => {
    const sandbox = mkdtempSync(join(tmpdir(), 'qapr-nodirs-'));
    try {
      // Nenhum src/, e2e/ ou supabase/ — antes da correção, o primeiro
      // readdirSync(join(ROOT, 'src')) dentro de walk() lançava ENOENT não
      // tratado e o processo morria com stack trace do Node.
      const result = run(sandbox);

      assertNoCrash(result);
      assert.equal(result.status, 1);
      assert.match(result.stdout, /spec ausente/);
    } finally {
      rmSync(sandbox, { recursive: true, force: true });
    }
  });

  test('symlink circular dentro de src/ não deve estourar stack trace (ELOOP)', () => {
    const sandbox = mkdtempSync(join(tmpdir(), 'qapr-eloop-'));
    try {
      buildValidFixture(sandbox);
      // src/components/quotes/loop -> aponta para um ancestral, criando um
      // ciclo que o statSync de walk() segue indefinidamente até o kernel
      // devolver ELOOP — antes da correção isso também derrubava o processo.
      symlinkSync('../../..', join(sandbox, 'src/components/quotes/loop'));

      const result = run(sandbox);

      assertNoCrash(result);
      // O resto da fixture é válido; o ciclo fica isolado num subdiretório
      // sem specs/testids reais, então o gate deve continuar aprovando.
      assert.equal(result.status, 0);
      assert.match(result.stdout, /Todas as checagens estáticas passaram/);
    } finally {
      rmSync(sandbox, { recursive: true, force: true });
    }
  });

  test.skipIf(IS_ROOT)(
    'subdiretório sem permissão de leitura dentro de src/ não deve estourar stack trace (EACCES)',
    () => {
      const sandbox = mkdtempSync(join(tmpdir(), 'qapr-eacces-'));
      try {
        buildValidFixture(sandbox);
        const blocked = join(sandbox, 'src/secret_no_access');
        mkdirSync(blocked, { recursive: true });
        writeFileSync(join(blocked, 'foo.ts'), 'export const x = 1;\n');
        chmodSync(blocked, 0o000);

        const result = run(sandbox);

        assertNoCrash(result);
        assert.equal(result.status, 0);
        assert.match(result.stdout, /Todas as checagens estáticas passaram/);
      } finally {
        chmodSync(join(sandbox, 'src/secret_no_access'), 0o755);
        rmSync(sandbox, { recursive: true, force: true });
      }
    },
  );
});
