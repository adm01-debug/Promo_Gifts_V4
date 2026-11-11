// Testa scripts/check-generated-files-protected.mjs — E196: gate que
// bloqueia redução ≥20% de linhas em arquivos "gerados" sem label.
//
// Regressão coberta: sem GITHUB_BASE_SHA e sem HEAD~1 resolvível (repo com
// um único commit — o mesmo estado de um clone shallow fetch-depth=1, padrão
// do GitHub Actions), o script caía no fallback `|| 'HEAD~1'`, que reusa a
// MESMA ref que já falhou em resolver. O `git diff` subsequente também
// falhava, o erro era engolido por `run()` como string vazia, e o gate
// reportava "nenhuma redução" (fail-open) mesmo com uma redução real de 80%
// em um arquivo gerado, sem nunca ter comparado nada de fato.
import { afterEach, describe, expect, it } from 'vitest';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { spawn } from 'node:child_process';

const SCRIPT_PATH = resolve(process.cwd(), 'scripts/check-generated-files-protected.mjs');
const temporaryRoots = [];

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

function git(cwd, args) {
  execFileSync('git', args, { cwd, stdio: 'ignore' });
}

/** Repo git com um único commit — simula clone shallow (fetch-depth=1): não existe HEAD~1. */
function singleCommitRepoWithGeneratedFile() {
  const root = mkdtempSync(join(tmpdir(), 'promo-gifts-generated-files-'));
  temporaryRoots.push(root);
  git(root, ['init', '-q']);
  git(root, ['config', 'user.email', 'a@a.com']);
  git(root, ['config', 'user.name', 'a']);
  mkdirSync(join(root, 'src', 'integrations', 'supabase'), { recursive: true });
  const typesPath = join(root, 'src', 'integrations', 'supabase', 'types.ts');
  writeFileSync(typesPath, 'line1\nline2\nline3\nline4\nline5\n', 'utf8');
  git(root, ['add', '-A']);
  git(root, ['commit', '-q', '-m', 'init']);
  return { root, typesPath };
}

function runScript(cwd, env = {}) {
  return new Promise((resolveRun, rejectRun) => {
    const child = spawn(process.execPath, [SCRIPT_PATH, '--gate'], {
      cwd,
      env: { ...process.env, ...env, GITHUB_BASE_SHA: '' },
    });
    let stdout = '';
    let stderr = '';
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.once('error', rejectRun);
    child.once('close', (status) => resolveRun({ status, stdout, stderr }));
  });
}

describe('check-generated-files-protected: sem base de comparação resolvível', () => {
  it('não reporta PASS silencioso quando HEAD~1 não existe (repo de 1 commit)', async () => {
    const { root, typesPath } = singleCommitRepoWithGeneratedFile();
    // Reduz um arquivo "gerado" em 80% sem commitar — exatamente o cenário
    // que o gate deveria capturar, se conseguisse comparar.
    writeFileSync(typesPath, 'line1\n', 'utf8');

    const { status, stdout, stderr } = await runScript(root);

    // Não pode afirmar "nenhuma redução" (PASS) quando a comparação nunca rodou.
    expect(stdout).not.toMatch(/nenhuma redução/);
    expect(stderr).toMatch(/sem base de comparação|inconclusiva/);
    expect(status).toBe(2);
  });
});
