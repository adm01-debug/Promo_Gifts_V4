import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, cpSync, chmodSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { test } from 'vitest';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const SCRIPT_SRC = join(ROOT, 'scripts/check-codeowners-coverage.mjs');

// O script calcula REPO_ROOT a partir da própria localização do arquivo
// (import.meta.url), não do cwd. Por isso, para testar com um CODEOWNERS
// isolado, é preciso copiar o script para dentro de um sandbox e criar um
// `.github/CODEOWNERS` lá, em vez de só mudar o `cwd`.
function makeSandbox(prefix) {
  const sandbox = mkdtempSync(join(tmpdir(), prefix));
  mkdirSync(join(sandbox, 'scripts'), { recursive: true });
  mkdirSync(join(sandbox, '.github'), { recursive: true });
  cpSync(SCRIPT_SRC, join(sandbox, 'scripts/check-codeowners-coverage.mjs'));
  return sandbox;
}

function runScript(sandbox, args = []) {
  return spawnSync(
    process.execPath,
    [join(sandbox, 'scripts/check-codeowners-coverage.mjs'), ...args],
    { encoding: 'utf8' },
  );
}

test('check-codeowners-coverage resolve corretamente REPO_ROOT quando o caminho do repositório contém espaço (sem isso, pathname bruto com %20 faz o gate falhar mesmo com CODEOWNERS válido)', () => {
  const parent = mkdtempSync(join(tmpdir(), 'codeowners-space-'));
  const sandbox = join(parent, 'repo with space');
  mkdirSync(join(sandbox, 'scripts'), { recursive: true });
  mkdirSync(join(sandbox, '.github'), { recursive: true });
  cpSync(SCRIPT_SRC, join(sandbox, 'scripts/check-codeowners-coverage.mjs'));

  try {
    writeFileSync(join(sandbox, '.github/CODEOWNERS'), '*   @adm01-debug\n');

    const result = runScript(sandbox, ['--gate']);

    assert.equal(
      result.status,
      0,
      `esperado exit=0 (CODEOWNERS válido, mesmo com espaço no path); saída:\n${result.stdout}${result.stderr}`,
    );
    assert.doesNotMatch(result.stderr, /não encontrado ou vazio/);
  } finally {
    rmSync(parent, { recursive: true, force: true });
  }
});

test('check-codeowners-coverage trata CODEOWNERS sem permissão de leitura sem crash cru, com mensagem acionável e exit code consistente com --gate', () => {
  const sandbox = makeSandbox('codeowners-eacces-');

  try {
    writeFileSync(join(sandbox, '.github/CODEOWNERS'), '*   @adm01-debug\n');
    chmodSync(join(sandbox, '.github/CODEOWNERS'), 0o000);

    // Em processos rodando como root, permissões DAC são ignoradas e o
    // teste de EACCES não se aplica — nesse caso só garantimos que não
    // houve crash (status null/signal indicaria stack trace cru).
    const result = runScript(sandbox, ['--gate']);

    const isRoot = typeof process.getuid === 'function' && process.getuid() === 0;
    const combined = `${result.stdout}${result.stderr}`;
    assert.doesNotMatch(combined, /at readFileSync|at ModuleJob\.run/);

    if (!isRoot) {
      assert.equal(result.status, 1, `esperado exit=1 (--gate, leitura falhou); saída:\n${combined}`);
      assert.match(combined, /EACCES/);
    }

    // Sem --gate, o mesmo cenário deve sair 0 (mesma semântica do caso
    // "CODEOWNERS não encontrado"), nunca 1 por causa de exceção não tratada.
    const resultNoGate = runScript(sandbox, []);
    const combinedNoGate = `${resultNoGate.stdout}${resultNoGate.stderr}`;
    assert.doesNotMatch(combinedNoGate, /at readFileSync|at ModuleJob\.run/);
    if (!isRoot) {
      assert.equal(resultNoGate.status, 0, `esperado exit=0 (sem --gate); saída:\n${combinedNoGate}`);
    }
  } finally {
    chmodSync(join(sandbox, '.github/CODEOWNERS'), 0o644);
    rmSync(sandbox, { recursive: true, force: true });
  }
});

test('check-codeowners-coverage detecta arquivo de gate real sem dono (verdadeiro positivo)', () => {
  const sandbox = makeSandbox('codeowners-truepos-');

  try {
    mkdirSync(join(sandbox, '.security'), { recursive: true });
    writeFileSync(join(sandbox, 'bundle-size-baseline.json'), '{}\n');
    // Sem catch-all "*" e sem pattern para bundle-size-baseline.json.
    writeFileSync(join(sandbox, '.github/CODEOWNERS'), 'package.json   @adm01-debug\n');

    const result = runScript(sandbox, ['--gate']);

    assert.equal(result.status, 1, `esperado exit=1 (arquivo de gate descoberto); saída:\n${result.stdout}${result.stderr}`);
    assert.match(result.stdout, /bundle-size-baseline\.json/);
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
});

test('check-codeowners-coverage não produz falso-negativo com pattern parecido mas incompleto', () => {
  const sandbox = makeSandbox('codeowners-falseneg-');

  try {
    mkdirSync(join(sandbox, 'scripts'), { recursive: true });
    writeFileSync(join(sandbox, 'scripts/validate-supabase-config.mjs'), '// x\n');
    // Pattern sem a extensão .mjs não deve cobrir o arquivo real.
    writeFileSync(join(sandbox, '.github/CODEOWNERS'), 'scripts/validate-supabase-config   @adm01-debug\n');

    const result = runScript(sandbox, ['--gate']);

    assert.equal(result.status, 1, `esperado exit=1 (não deveria casar); saída:\n${result.stdout}${result.stderr}`);
    assert.match(result.stdout, /scripts\/validate-supabase-config\.mjs/);
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
});
