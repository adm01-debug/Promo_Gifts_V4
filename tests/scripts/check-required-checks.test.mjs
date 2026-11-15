/**
 * Testes para scripts/check-required-checks.mjs
 *
 * Cobre bugs reais encontrados em auditoria adversarial do script (16+
 * cenários rodados de fato: JSON ausente/vazio/corrompido/top-level não-objeto,
 * workflows ausentes/corrompidos/vazios/sem permissão, encoding BOM/CRLF,
 * nomes com espaços, args extras, paths com espaços/acentos, concorrência,
 * SIGINT, 500 workflows × 20 jobs).
 *
 * Bugs confirmados (exceção não tratada → stack trace cru do Node em vez da
 * mensagem `ERROR: ...` já usada pelo próprio script para o caso "arquivo
 * não encontrado"):
 *
 * 1) `.github/required-checks.json` com JSON malformado: `JSON.parse()` sem
 *    try/catch lançava `SyntaxError` não tratado (stack trace do Node,
 *    `exit code` 1 só por acidente — o motivo real do script, "phantom
 *    check", nunca chegava a rodar).
 * 2) `.github/required-checks.json` com JSON válido mas top-level não é um
 *    objeto (ex.: `null`): `requiredChecksJson.rulesets` lançava `TypeError`
 *    não tratado dentro de `collectRequiredChecks()`.
 * 3) `.github/required-checks.json` sem permissão de leitura (EACCES):
 *    mesmo ponto do bug 1, sem try/catch.
 * 4) Um único arquivo em `.github/workflows/` sem permissão de leitura
 *    (EACCES) derrubava o processo inteiro com stack trace cru, mesmo que
 *    outros workflows legíveis contivessem o job esperado — o script já
 *    tinha try/catch para YAML corrompido (`yaml.load`) na mesma função,
 *    mas não para a leitura do arquivo (`readFileSync`) que vem antes.
 *
 * Correção: try/catch ao redor da leitura+parse do required-checks.json
 * (mensagem `ERROR: ...` + exit 1, no mesmo padrão já usado pelo script) e
 * try/catch ao redor do `readFileSync` de cada workflow em `loadWorkflows()`
 * (skip silencioso, mesmo padrão já usado ali para `yaml.load`).
 */
import { test, expect } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, chmodSync, symlinkSync, cpSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const REAL_SCRIPT = join(ROOT, 'scripts/check-required-checks.mjs');

// O script computa seu próprio ROOT a partir de `import.meta.url` (não do
// cwd), então para testar com fixtures isoladas é preciso copiar o script
// para dentro de um sandbox com sua própria árvore `.github/`. `js-yaml` é
// resolvido via `createRequire`, então o sandbox precisa de um
// `node_modules` alcançável — symlink para o real, sem copiar nada.
function makeSandbox(prefix) {
  const sandbox = mkdtempSync(join(tmpdir(), prefix));
  mkdirSync(join(sandbox, 'scripts'), { recursive: true });
  mkdirSync(join(sandbox, '.github', 'workflows'), { recursive: true });
  cpSync(REAL_SCRIPT, join(sandbox, 'scripts', 'check-required-checks.mjs'));
  symlinkSync(join(ROOT, 'node_modules'), join(sandbox, 'node_modules'));
  return sandbox;
}

function run(sandbox) {
  const result = spawnSync(process.execPath, [join(sandbox, 'scripts', 'check-required-checks.mjs')], {
    encoding: 'utf8',
  });
  return { code: result.status, stdout: result.stdout ?? '', stderr: result.stderr ?? '' };
}

function writeRequiredChecks(sandbox, content) {
  writeFileSync(join(sandbox, '.github', 'required-checks.json'), content);
}

function writeWorkflow(sandbox, name, content) {
  writeFileSync(join(sandbox, '.github', 'workflows', name), content);
}

// ─────────────────────────────────────────────────────────────────────────
// Bug 1: JSON malformado em required-checks.json
// ─────────────────────────────────────────────────────────────────────────

test('required-checks.json com JSON malformado reporta erro controlado em vez de crashar com SyntaxError cru', () => {
  const sandbox = makeSandbox('crc-badjson-');
  try {
    writeRequiredChecks(sandbox, '{"rulesets": [ this is not valid json');
    writeWorkflow(sandbox, 'a.yml', 'jobs:\n  build:\n    name: "Build"\n');

    const { code, stdout, stderr } = run(sandbox);
    const combined = stdout + stderr;

    // Antes da correção: stack trace cru do Node (`at JSON.parse`,
    // `at ModuleJob.run`) em vez da mensagem de erro do próprio script.
    expect(combined).not.toMatch(/at JSON\.parse/);
    expect(combined).not.toMatch(/at ModuleJob\.run/);
    expect(combined).toMatch(/ERROR: failed to read\/parse .github\/required-checks\.json/);
    expect(code).toBe(1);
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
});

// ─────────────────────────────────────────────────────────────────────────
// Bug 2: JSON válido mas top-level não é objeto (ex.: null)
// ─────────────────────────────────────────────────────────────────────────

test('required-checks.json cujo top-level é `null` reporta erro controlado em vez de TypeError cru', () => {
  const sandbox = makeSandbox('crc-nulljson-');
  try {
    writeRequiredChecks(sandbox, 'null');

    const { code, stdout, stderr } = run(sandbox);
    const combined = stdout + stderr;

    // Antes da correção: TypeError não tratado em collectRequiredChecks()
    // ("Cannot read properties of null (reading 'rulesets')").
    expect(combined).not.toMatch(/TypeError/);
    expect(combined).not.toMatch(/at collectRequiredChecks/);
    expect(combined).toMatch(/ERROR: .github\/required-checks\.json must contain a JSON object/);
    expect(code).toBe(1);
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
});

// ─────────────────────────────────────────────────────────────────────────
// Bug 3: required-checks.json sem permissão de leitura (EACCES)
// ─────────────────────────────────────────────────────────────────────────

test('required-checks.json sem permissão de leitura reporta erro controlado em vez de crashar com EACCES cru', () => {
  const sandbox = makeSandbox('crc-eacces-main-');
  try {
    writeRequiredChecks(sandbox, '{"rulesets":[{"id":"main","required_checks":[{"name":"Build"}]}]}');
    chmodSync(join(sandbox, '.github', 'required-checks.json'), 0o000);

    const { code, stdout, stderr } = run(sandbox);
    const combined = stdout + stderr;

    expect(combined).not.toMatch(/at readFileSync/);
    expect(combined).not.toMatch(/at ModuleJob\.run/);

    // Root ignora bits de permissão DAC — nesse caso o cenário de EACCES não
    // é reproduzível; a ausência de stack trace cru já foi verificada acima.
    const isRoot = typeof process.getuid === 'function' && process.getuid() === 0;
    if (!isRoot) {
      expect(code).toBe(1);
      expect(combined).toMatch(/ERROR: failed to read\/parse .github\/required-checks\.json/);
      expect(combined).toMatch(/EACCES/);
    }
  } finally {
    chmodSync(join(sandbox, '.github', 'required-checks.json'), 0o644);
    rmSync(sandbox, { recursive: true, force: true });
  }
});

// ─────────────────────────────────────────────────────────────────────────
// Bug 4: um workflow sem permissão de leitura derruba o processo inteiro
// ─────────────────────────────────────────────────────────────────────────

test('um workflow sem permissão de leitura não derruba o processo inteiro — outros workflows continuam sendo avaliados', () => {
  const sandbox = makeSandbox('crc-eacces-workflow-');
  try {
    writeRequiredChecks(sandbox, '{"rulesets":[{"id":"main","required_checks":[{"name":"Build"}]}]}');
    writeWorkflow(sandbox, 'a.yml', 'jobs:\n  build:\n    name: "Build"\n    runs-on: ubuntu-latest\n');
    writeWorkflow(sandbox, 'b.yml', 'jobs:\n  other:\n    name: "Other"\n    runs-on: ubuntu-latest\n');
    chmodSync(join(sandbox, '.github', 'workflows', 'b.yml'), 0o000);

    const { code, stdout, stderr } = run(sandbox);
    const combined = stdout + stderr;

    // Antes da correção: EACCES não tratado dentro de loadWorkflows()
    // derrubava o processo ANTES de qualquer checagem — mesmo o job "Build"
    // em a.yml, perfeitamente legível e correspondente, nunca era avaliado.
    expect(combined).not.toMatch(/at readFileSync/);
    expect(combined).not.toMatch(/at loadWorkflows/);

    const isRoot = typeof process.getuid === 'function' && process.getuid() === 0;
    if (!isRoot) {
      // a.yml é legível e satisfaz o required check "Build" — o script deve
      // reportar sucesso em vez de crashar por causa de b.yml, ilegível.
      expect(code).toBe(0);
      expect(combined).toMatch(/Matched: 1/);
      expect(combined).toMatch(/Phantoms \(no matching job\): 0/);
    }
  } finally {
    chmodSync(join(sandbox, '.github', 'workflows', 'b.yml'), 0o644);
    rmSync(sandbox, { recursive: true, force: true });
  }
});

// ─────────────────────────────────────────────────────────────────────────
// Regressão: comportamentos corretos que já existiam antes do fix, para
// garantir que a correção não quebrou nada.
// ─────────────────────────────────────────────────────────────────────────

test('required-checks.json ausente continua reportando o erro original (sem regressão)', () => {
  const sandbox = makeSandbox('crc-missing-');
  try {
    const { code, stdout, stderr } = run(sandbox);
    expect(code).toBe(1);
    expect((stdout + stderr)).toMatch(/ERROR: \.github\/required-checks\.json not found\./);
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
});

test('rulesets vazio continua saindo com exit 0 e mensagem "nothing to verify" (sem regressão)', () => {
  const sandbox = makeSandbox('crc-empty-rulesets-');
  try {
    writeRequiredChecks(sandbox, '{"rulesets": []}');
    const { code, stdout, stderr } = run(sandbox);
    expect(code).toBe(0);
    expect((stdout + stderr)).toMatch(/Nothing to verify/);
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
});

test('check correspondente a um job real continua passando com exit 0 (sem regressão)', () => {
  const sandbox = makeSandbox('crc-match-ok-');
  try {
    writeRequiredChecks(sandbox, '{"rulesets":[{"id":"main","required_checks":[{"name":"Build"}]}]}');
    writeWorkflow(sandbox, 'a.yml', 'jobs:\n  build:\n    name: "Build"\n    runs-on: ubuntu-latest\n');
    const { code, stdout, stderr } = run(sandbox);
    expect(code).toBe(0);
    expect((stdout + stderr)).toMatch(/✓ \[main\] "Build"/);
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
});

test('check sem job correspondente continua sendo reportado como phantom com exit 1 (sem regressão)', () => {
  const sandbox = makeSandbox('crc-phantom-ok-');
  try {
    writeRequiredChecks(sandbox, '{"rulesets":[{"id":"main","required_checks":[{"name":"Nao Existe"}]}]}');
    const { code, stdout, stderr } = run(sandbox);
    expect(code).toBe(1);
    expect((stdout + stderr)).toMatch(/✗ \[main\] "Nao Existe"/);
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
});
