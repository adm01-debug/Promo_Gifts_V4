// Testa scripts/check-migration-path-references.mjs, o gate que garante que
// nenhum arquivo versionado cite um caminho inexistente sob
// supabase/migrations/, supabase/migrations-snapshot/ ou qa/migrations-draft/.
//
// O script resolve ROOT via process.cwd() (não via import.meta.url), então
// o padrão aqui é integração CLI real via spawnSync, com cwd apontando para
// um repo-fixture temporário (precisa ser um repo git de verdade, pois o
// script usa `git ls-files` para filtrar só arquivos rastreados) — mesmo
// padrão de tests/scripts/check-edge-cors-headers.test.mjs.
import { afterEach, describe, expect, it } from 'vitest';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const SCRIPT = resolve(ROOT, 'scripts/check-migration-path-references.mjs');

const temporaryRoots = [];
afterEach(() => {
  for (const dir of temporaryRoots.splice(0)) rmSync(dir, { recursive: true, force: true });
});

function gitRepo() {
  const dir = mkdtempSync(join(tmpdir(), 'migration-refs-gate-'));
  temporaryRoots.push(dir);
  execFileSync('git', ['init', '-q'], { cwd: dir });
  execFileSync('git', ['config', 'user.email', 'a@a.com'], { cwd: dir });
  execFileSync('git', ['config', 'user.name', 'a'], { cwd: dir });
  return dir;
}

function commitAll(dir) {
  execFileSync('git', ['add', '-A'], { cwd: dir });
  execFileSync('git', ['commit', '-qm', 'init', '--allow-empty'], { cwd: dir });
}

function runGate(dir, extraArgs = []) {
  return spawnSync('node', [SCRIPT, ...extraArgs], { cwd: dir, encoding: 'utf8', timeout: 10000 });
}

describe('check-migration-path-references — comportamento básico', () => {
  it('passa (exit 0) quando a referência citada existe no repo', () => {
    const dir = gitRepo();
    mkdirSync(join(dir, 'supabase', 'migrations'), { recursive: true });
    writeFileSync(join(dir, 'supabase', 'migrations', '20260101_x.sql'), '');
    writeFileSync(join(dir, 'docs.md'), 'ver supabase/migrations/20260101_x.sql\n');
    commitAll(dir);

    const r = runGate(dir);
    expect(r.status).toBe(0);
    expect(r.stdout).toMatch(/Nenhuma NOVA referência quebrada/);
  });

  it('falha (exit 1) quando a referência citada em arquivo rastreado não existe', () => {
    const dir = gitRepo();
    writeFileSync(join(dir, 'docs.md'), 'ver supabase/migrations/20260101_inexistente.sql\n');
    commitAll(dir);

    const r = runGate(dir);
    expect(r.status).toBe(1);
    expect(r.stderr).toMatch(/supabase\/migrations\/20260101_inexistente\.sql/);
  });

  it('ignora (exit 0) referência quebrada em arquivo NÃO rastreado pelo git', () => {
    const dir = gitRepo();
    commitAll(dir); // commit vazio, repo git válido
    writeFileSync(join(dir, 'docs.md'), 'ver supabase/migrations/20260101_inexistente.sql\n');
    // sem `git add` — arquivo fica fora de `git ls-files`

    const r = runGate(dir);
    expect(r.status).toBe(0);
  });
});

// ─── regressão: baseline (.migration-refs-baseline.json) corrompida ────────
//
// Antes do fix, um JSON inválido em .migration-refs-baseline.json (ex.: marcas
// de conflito de merge não resolvidas, ou edição manual quebrada — cenário
// plausível neste repo, onde vários agentes rodam `--update-baseline` e podem
// colidir) fazia o `JSON.parse` lançar um SyntaxError não tratado: o processo
// morria com stack trace cru do Node (exit 1, mas sem nenhuma mensagem
// acionável). O fix captura esse erro e imprime uma mensagem clara apontando
// o arquivo e sugerindo a correção, antes de sair com exit 1.
describe('check-migration-path-references — regressão: baseline JSON corrompida', () => {
  it('falha com mensagem clara (não com stack trace cru do Node)', () => {
    const dir = gitRepo();
    writeFileSync(join(dir, 'docs.md'), 'ver supabase/migrations/20260101_x.sql\n');
    mkdirSync(join(dir, 'supabase', 'migrations'), { recursive: true });
    writeFileSync(join(dir, 'supabase', 'migrations', '20260101_x.sql'), '');
    commitAll(dir);
    // baseline com marca de conflito de merge não resolvida
    writeFileSync(
      join(dir, '.migration-refs-baseline.json'),
      '<<<<<<< HEAD\n{"entries":[]}\n=======\n{"entries":[]}\n>>>>>>> outra-branch\n',
    );

    const r = runGate(dir);

    expect(r.status).toBe(1);
    // Sem o fix, isso aparecia no stderr (stack trace cru do Node ao invés
    // de uma mensagem tratada pelo próprio script):
    expect(r.stderr).not.toMatch(/at JSON\.parse/);
    expect(r.stderr).not.toMatch(/ModuleJob\.run/);
    // Mensagem clara e acionável, no padrão do restante do script:
    expect(r.stderr).toMatch(/Baseline ilegível/);
    expect(r.stderr).toMatch(/update-baseline/);
  });
});
