/**
 * Testes para scripts/ssot-report.mjs
 *
 * Cobre um bug real encontrado em auditoria adversarial do script (bateria
 * de ~15 cenários: args ausentes/extras/malformados, --out para diretório
 * inexistente/EISDIR/path com espaços/traversal, execução concorrente de
 * duas instâncias escrevendo no mesmo --out, SIGINT no meio da execução,
 * um gate sub-script ausente, gate com stdout grande; evidência completa
 * na sessão que gerou este arquivo).
 *
 * Bug: `writeFileSync(OUT_PATH, ...)` (grava o relatório quando `--out=` é
 * passado) não tinha try/catch. Qualquer falha de escrita — diretório pai
 * inexistente (ENOENT), `--out` apontando para um diretório existente em
 * vez de arquivo (EISDIR), ou permissão negada (EACCES, não reproduzível
 * como root neste ambiente) — derrubava o processo com stack trace cru do
 * Node em vez do comportamento esperado do script: um relatório de erro
 * controlado e exit code 1 (mesma classe de defeito já documentada e
 * corrigida em outros scripts deste repo, ex.:
 * tests/scripts/check-doc-refs.test.mjs, tests/scripts/check-docs-supabase-hosts.test.mjs).
 * Corrigido com try/catch ao redor do `writeFileSync`, reportando a falha
 * em stderr (`Erro ao escrever --out=<path>: <mensagem>`) e saindo com
 * exit 1 em vez de crashar.
 */
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { test } from 'vitest';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const SCRIPT_SRC = join(ROOT, 'scripts/ssot-report.mjs');

/**
 * Monta um sandbox com scripts/ssot-report.mjs (cópia real do script sob
 * teste) + 3 stub scripts para os gates que ele invoca por caminho relativo
 * (scripts/validate-supabase-config.mjs, scripts/guard-canonical-project.mjs,
 * scripts/check-docs-supabase-hosts.mjs), todos passando por padrão. Isola
 * o teste do estado real do repo (que pode mudar) e torna overallOk
 * determinístico.
 */
function makeSandbox(prefix) {
  const sandbox = mkdtempSync(join(tmpdir(), prefix));
  mkdirSync(join(sandbox, 'scripts'), { recursive: true });
  writeFileSync(join(sandbox, 'scripts/ssot-report.mjs'), readFileSync(SCRIPT_SRC, 'utf8'));
  for (const name of [
    'validate-supabase-config.mjs',
    'guard-canonical-project.mjs',
    'check-docs-supabase-hosts.mjs',
  ]) {
    writeFileSync(join(sandbox, 'scripts', name), 'console.log("ok");\nprocess.exit(0);\n');
  }
  return sandbox;
}

function run(sandbox, args = []) {
  return spawnSync(process.execPath, [join(sandbox, 'scripts/ssot-report.mjs'), ...args], {
    cwd: sandbox,
    encoding: 'utf8',
  });
}

// ─────────────────────────────────────────────────────────────────────────
// Sanidade: comportamento normal (todos os gates OK) não foi afetado.
// ─────────────────────────────────────────────────────────────────────────

test('todos os gates OK: exit 0, overallOk=true, --out grava JSON válido', () => {
  const sandbox = makeSandbox('ssot-report-ok-');
  try {
    const outPath = join(sandbox, 'report.json');
    const result = run(sandbox, [`--out=${outPath}`]);
    assert.equal(result.status, 0, result.stdout + result.stderr);
    assert.match(result.stderr, /Overall:.*PASS/);
    assert.match(result.stderr, /Escrito: /);

    const written = JSON.parse(readFileSync(outPath, 'utf8'));
    assert.equal(written.overallOk, true);
    assert.equal(written.gates.length, 3);
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
});

test('--json imprime apenas JSON em stdout, sem o resumo humano', () => {
  const sandbox = makeSandbox('ssot-report-json-');
  try {
    const result = run(sandbox, ['--json']);
    assert.equal(result.status, 0, result.stdout + result.stderr);
    const parsed = JSON.parse(result.stdout);
    assert.equal(parsed.overallOk, true);
    assert.doesNotMatch(result.stdout, /SSOT Report/);
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
});

test('um gate falha (exit != 0): overallOk=false, exit 1, gate marcado no resumo', () => {
  const sandbox = makeSandbox('ssot-report-gatefail-');
  try {
    writeFileSync(
      join(sandbox, 'scripts/guard-canonical-project.mjs'),
      'console.error("FALHA: projeto proibido");\nprocess.exit(1);\n',
    );
    const result = run(sandbox, ['--json']);
    assert.equal(result.status, 1, result.stdout + result.stderr);
    const parsed = JSON.parse(result.stdout);
    assert.equal(parsed.overallOk, false);
    const failedGate = parsed.gates.find((g) => g.label === 'guard-canonical-project');
    assert.equal(failedGate.ok, false);
    assert.equal(failedGate.exitCode, 1);
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
});

test('gate sub-script ausente (ENOENT) não crasha o orquestrador: reportado como falha controlada', () => {
  const sandbox = makeSandbox('ssot-report-missing-gate-');
  try {
    rmSync(join(sandbox, 'scripts/guard-canonical-project.mjs'));
    const result = run(sandbox, ['--json']);
    const combined = result.stdout + result.stderr;
    assert.doesNotMatch(combined, /at runGate/);
    const parsed = JSON.parse(result.stdout);
    assert.equal(parsed.overallOk, false);
    assert.equal(result.status, 1);
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
});

// ─────────────────────────────────────────────────────────────────────────
// Bug: crash cru (sem try/catch) ao gravar --out quando a escrita falha.
// ─────────────────────────────────────────────────────────────────────────

test('--out com diretório pai inexistente (ENOENT): erro controlado em vez de crash cru', () => {
  const sandbox = makeSandbox('ssot-report-out-enoent-');
  try {
    const outPath = join(sandbox, 'nao-existe', 'report.json');
    const result = run(sandbox, [`--out=${outPath}`]);
    const combined = result.stdout + result.stderr;

    // Antes da correção: processo morria com stack trace do Node
    // ("at writeFileSync", banner "Node.js vX.Y.Z").
    assert.doesNotMatch(combined, /at writeFileSync/);
    assert.doesNotMatch(combined, /Node\.js v\d/);
    assert.notEqual(result.status, null, `processo não deveria crashar; saída:\n${combined}`);

    // Depois da correção: mensagem de erro controlada do próprio script,
    // exit 1 (não pode reportar PASS/FAIL sobre uma escrita que falhou).
    assert.equal(result.status, 1, combined);
    assert.match(result.stderr, /Erro ao escrever --out=/);
    assert.match(result.stderr, /ENOENT/);
    assert.doesNotMatch(combined, /Overall:/);
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
});

test('--out apontando para um diretório existente (EISDIR): erro controlado em vez de crash cru', () => {
  const sandbox = makeSandbox('ssot-report-out-eisdir-');
  try {
    const outPath = join(sandbox, 'eh-um-diretorio');
    mkdirSync(outPath);
    const result = run(sandbox, [`--out=${outPath}`]);
    const combined = result.stdout + result.stderr;

    assert.doesNotMatch(combined, /at writeFileSync/);
    assert.doesNotMatch(combined, /Node\.js v\d/);
    assert.notEqual(result.status, null, `processo não deveria crashar; saída:\n${combined}`);

    assert.equal(result.status, 1, combined);
    assert.match(result.stderr, /Erro ao escrever --out=/);
    assert.match(result.stderr, /EISDIR/);
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
});
