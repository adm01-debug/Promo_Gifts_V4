/**
 * Testes para scripts/check-docs-supabase-hosts.mjs
 *
 * Cobre dois bugs reais encontrados em auditoria adversarial do script
 * (bateria de ~20 cenários; evidência completa na sessão que gerou este
 * arquivo). Ambos são a mesma classe de defeito — erro de leitura do
 * sistema de arquivos sem tratamento — em dois pontos diferentes do script:
 *
 * 1) Crash não tratado em arquivo: quando um `.md` existe mas não pode ser
 *    lido (ex.: EACCES), `fs.readFileSync(file, 'utf8')` lançava sem
 *    try/catch, derrubando o processo com stack trace cru do Node em vez do
 *    relatório controlado do próprio script (mesmo padrão de bug já
 *    documentado em tests/scripts/check-doc-refs.test.mjs e
 *    tests/scripts/check-codeowners-coverage.test.mjs para outros scripts
 *    deste repo). Corrigido com try/catch ao redor do `readFileSync`,
 *    reportando em `readErrors` e falhando o gate (exit 1) em vez de
 *    crashar.
 *
 * 2) Falso-negativo (gate reporta [OK] indevido): `walk()` já tinha
 *    try/catch em volta de `readdirSync`, mas o catch descartava o erro
 *    silenciosamente (`catch { return; }`). Um diretório sem permissão de
 *    leitura (ex.: EACCES por permissão quebrada no checkout) era
 *    simplesmente pulado, e qualquer violação de host Supabase dentro dele
 *    nunca era vista — o gate terminava com `[OK]`/exit 0 mesmo sem ter
 *    varrido parte da árvore. Corrigido registrando o erro em `readErrors`
 *    (mesmo array usado para o caso de arquivo) em vez de descartá-lo, o
 *    que agora faz o gate falhar (exit 1) de forma honesta em vez de
 *    reportar sucesso sobre uma varredura incompleta.
 *
 * Os testes rodam como root neste ambiente de CI, onde chmod 000 não nega
 * leitura (DAC é ignorado por root) — por isso as asserções de exit
 * code/mensagem específica ficam condicionadas a `!isRoot`, mas a asserção
 * de "nunca crash cru" vale sempre, igual ao padrão já usado nos outros
 * testes de EACCES deste repo.
 */
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, chmodSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { test } from 'vitest';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const SCRIPT = join(ROOT, 'scripts/check-docs-supabase-hosts.mjs');

const isRoot = typeof process.getuid === 'function' && process.getuid() === 0;

function run(sandbox, args = []) {
  return spawnSync(process.execPath, [SCRIPT, ...args], { cwd: sandbox, encoding: 'utf8' });
}

function makeSandbox(prefix) {
  const sandbox = mkdtempSync(join(tmpdir(), prefix));
  mkdirSync(join(sandbox, 'docs'), { recursive: true });
  return sandbox;
}

// ─────────────────────────────────────────────────────────────────────────
// Sanidade: comportamento normal (documentado no cabeçalho do script) não
// foi afetado pela correção.
// ─────────────────────────────────────────────────────────────────────────

test('host canônico passa (exit 0, sem violações)', () => {
  const sandbox = makeSandbox('docs-hosts-ok-');
  try {
    writeFileSync(
      join(sandbox, 'docs/a.md'),
      'Painel: https://doufsxqlfjyuvxuezpln.supabase.co/project/default\n',
    );
    const result = run(sandbox);
    assert.equal(result.status, 0, result.stdout + result.stderr);
    assert.match(result.stdout, /\[OK\]/);
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
});

test('host não-canônico sem marcador de legado falha o gate (exit 1)', () => {
  const sandbox = makeSandbox('docs-hosts-fail-');
  try {
    writeFileSync(
      join(sandbox, 'docs/a.md'),
      'Link antigo: https://pqpdolkaeqlyzpdpbizo.supabase.co/project/default\n',
    );
    const result = run(sandbox);
    assert.equal(result.status, 1, result.stdout + result.stderr);
    assert.match(result.stderr, /pqpdolkaeqlyzpdpbizo/);
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
});

// ─────────────────────────────────────────────────────────────────────────
// Bug 1: crash cru (EACCES) ao ler um arquivo .md sem permissão
// ─────────────────────────────────────────────────────────────────────────

test('arquivo .md sem permissão de leitura reporta erro controlado em vez de crashar com EACCES', () => {
  const sandbox = makeSandbox('docs-hosts-file-eacces-');
  try {
    writeFileSync(
      join(sandbox, 'docs/a.md'),
      'Link antigo: https://pqpdolkaeqlyzpdpbizo.supabase.co/project/default\n',
    );
    chmodSync(join(sandbox, 'docs/a.md'), 0o000);

    const result = run(sandbox);
    const combined = result.stdout + result.stderr;

    // Antes da correção: processo morria com stack trace do Node
    // (`Error: EACCES...` não capturado em fs.readFileSync).
    assert.doesNotMatch(combined, /at readFileSync/);
    assert.doesNotMatch(combined, /at ModuleJob\.run/);
    assert.notEqual(result.status, null, `processo não deveria crashar; saída:\n${combined}`);

    if (!isRoot) {
      // Depois da correção: erro reportado no formato do próprio script,
      // exit 1 (gate não conseguiu verificar o arquivo, não pode dizer OK).
      assert.equal(result.status, 1, combined);
      assert.match(combined, /erro ao ler/);
      assert.match(combined, /EACCES/);
      assert.doesNotMatch(combined, /\[OK\]/);
    }

    // --json também não deve crashar e deve expor o erro em `readErrors`.
    const jsonResult = run(sandbox, ['--json']);
    assert.doesNotMatch(jsonResult.stdout + jsonResult.stderr, /at readFileSync/);
    if (!isRoot) {
      const parsed = JSON.parse(jsonResult.stdout);
      assert.equal(parsed.violations.length, 0);
      assert.equal(parsed.readErrors.length, 1);
      assert.match(parsed.readErrors[0], /EACCES/);
      assert.equal(jsonResult.status, 1);
    }
  } finally {
    chmodSync(join(sandbox, 'docs/a.md'), 0o644);
    rmSync(sandbox, { recursive: true, force: true });
  }
});

// ─────────────────────────────────────────────────────────────────────────
// Bug 2: falso-negativo (exit 0 / [OK]) com diretório sem permissão de
// leitura — a violação dentro dele nunca é vista, e antes da correção o
// erro de `readdirSync` era descartado em silêncio por `walk()`.
// ─────────────────────────────────────────────────────────────────────────

test('diretório sem permissão de leitura não resulta em [OK] falso — gate falha de forma honesta em vez de reportar sucesso sobre varredura incompleta', () => {
  const sandbox = makeSandbox('docs-hosts-dir-eacces-');
  try {
    mkdirSync(join(sandbox, 'docs/secreto'), { recursive: true });
    // Violação real, que ficaria invisível se o diretório não puder ser lido.
    writeFileSync(
      join(sandbox, 'docs/secreto/a.md'),
      'Link antigo: https://pqpdolkaeqlyzpdpbizo.supabase.co/project/default\n',
    );
    // Único arquivo fora do diretório restrito: canônico, sem violação.
    writeFileSync(
      join(sandbox, 'docs/b.md'),
      'https://doufsxqlfjyuvxuezpln.supabase.co/ok\n',
    );
    chmodSync(join(sandbox, 'docs/secreto'), 0o000);

    const result = run(sandbox);
    const combined = result.stdout + result.stderr;

    // Nunca deve crashar cru, mesmo como root (onde EACCES não se aplica).
    assert.doesNotMatch(combined, /at readdirSync/);
    assert.doesNotMatch(combined, /at ModuleJob\.run/);
    assert.notEqual(result.status, null, `processo não deveria crashar; saída:\n${combined}`);

    if (!isRoot) {
      // Antes da correção, este seria exit 0 com "[OK]" — falso-negativo,
      // pois a violação em docs/secreto/a.md nunca foi vista.
      assert.equal(result.status, 1, combined);
      assert.doesNotMatch(combined, /\[OK\]/);
      assert.match(combined, /erro ao listar diretório/);
      assert.match(combined, /EACCES/);

      const jsonResult = run(sandbox, ['--json']);
      const parsed = JSON.parse(jsonResult.stdout);
      assert.equal(parsed.violations.length, 0); // violação real não foi vista…
      assert.equal(parsed.readErrors.length, 1); // …mas o erro agora é reportado.
      assert.match(parsed.readErrors[0], /secreto/);
      assert.match(parsed.readErrors[0], /EACCES/);
      assert.equal(jsonResult.status, 1); // …e o gate falha em vez de aprovar.
    }
  } finally {
    chmodSync(join(sandbox, 'docs/secreto'), 0o755);
    rmSync(sandbox, { recursive: true, force: true });
  }
});
