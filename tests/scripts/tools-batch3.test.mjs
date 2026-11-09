/** Regressão (lote 3): ferramentas pequenas com falha silenciosa ou crash por ambiente. */
import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';

const ROOT = resolve(import.meta.dirname, '../..');
const dirs = [];
afterAll(() => dirs.forEach((d) => rmSync(d, { recursive: true, force: true })));

function sandbox(files, name = 'repo') {
  const base = mkdtempSync(join(tmpdir(), 'tools3-'));
  dirs.push(base);
  const dir = join(base, name);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'package.json'), '{"type":"module"}');
  for (const f of files) {
    mkdirSync(dirname(join(dir, f)), { recursive: true });
    cpSync(join(ROOT, f), join(dir, f));
  }
  return { base, dir };
}
const run = (cmd, args, cwd, env = {}) =>
  spawnSync(cmd, args, { cwd, encoding: 'utf8', env: { PATH: process.env.PATH, ...env } });

describe('inventario: caminho com espaço e acento', () => {
  it('gerar-rotas não escapa o caminho (%20/%C3%A7) nem cria diretório "%…"', () => {
    const { base, dir } = sandbox(['scripts/inventario/gerar-rotas.mjs'], 'dir com espaço ç');
    const r = run('node', ['scripts/inventario/gerar-rotas.mjs'], dir);
    // o caminho dentro da mensagem de erro/IO tem de estar decodificado (a URL file:// do stack trace pode ter %20)
    const ioPaths = [...r.stderr.matchAll(/(?:scandir|open|mkdir) '([^']+)'/g)].map((m) => m[1]);
    expect(ioPaths.filter((p) => /%20|%C3/.test(p))).toEqual([]);
    expect(readdirSync(base).filter((n) => n.includes('%'))).toEqual([]);
    expect(existsSync(join(base, 'dir%20com'))).toBe(false);
  });
});

describe('simulate-daily-flows', () => {
  it('--scale=abc → exit 2 (antes: "0 cenários, 0 falhas ✅", exit 0)', () => {
    const { dir } = sandbox(['scripts/simulate-daily-flows.mjs']);
    const r = run('node', ['scripts/simulate-daily-flows.mjs', '--scale=abc'], dir);
    expect(r.status).toBe(2);
    expect(r.stderr).toContain('--scale inválido');
  });
  it('--scale=1 continua rodando', () => {
    const { dir } = sandbox(['scripts/simulate-daily-flows.mjs']);
    expect(run('node', ['scripts/simulate-daily-flows.mjs', '--scale=1'], dir).status).toBe(0);
  });
});

describe('build-drafts-pr-comment lê a tabela real do DRAFTS_STATUS.md', () => {
  it('conta drafts 🟡 mesmo com slug seguido de <br> e tokens', () => {
    const { dir } = sandbox(['scripts/build-drafts-pr-comment.mjs']);
    mkdirSync(join(dir, 'qa/migrations-draft'), { recursive: true });
    writeFileSync(
      join(dir, 'qa/migrations-draft/DRAFTS_STATUS.md'),
      '| Rascunho | Slug | Cand | Status |\n| --- | --- | --- | --- |\n' +
        '| `2026-06-19_kit_dimensions_backfill.sql` | `kit_dimensions_backfill`<br>`kit` `dimensions` `backfill` | _(nenhum match)_ | 🟡 não promovido |\n',
    );
    const r = run('node', ['scripts/build-drafts-pr-comment.mjs'], dir);
    expect(r.status, r.stderr).toBe(0);
    expect(r.stdout).toContain('1 🟡');
    expect(readFileSync(join(dir, 'qa/migrations-draft/PR_COMMENT.md'), 'utf8')).toContain('2026-06-19_kit_dimensions_backfill.sql');
  });
});

describe('update-baseline.sh falha quando o playwright falha', () => {
  it('sem npx no PATH → exit != 0 e sem "✅ Baselines atualizados"', () => {
    const { dir } = sandbox(['scripts/update-baseline.sh']);
    const r = spawnSync('/bin/bash', ['scripts/update-baseline.sh'], { cwd: dir, encoding: 'utf8', env: { PATH: '/nonexistent' } });
    expect(r.status).not.toBe(0);
    expect(r.stdout).not.toContain('✅ Baselines atualizados');
  });
});

describe('fix_migrations_idempotent.py', () => {
  it('sem supabase/migrations ao lado do script → exit 2 (antes: "Files to process: 0", exit 0)', () => {
    const { dir } = sandbox(['scripts/fix_migrations_idempotent.py']);
    const r = run('python3', ['-I', 'scripts/fix_migrations_idempotent.py'], dir);
    expect(r.status).toBe(2);
  });
});

describe('ai-context: fixtures não herdam commit.gpgsign global', () => {
  it('gerar.unit.mjs passa mesmo com gpgsign=true e assinador inexistente', () => {
    const r = spawnSync('node', ['--test', 'scripts/ai-context/gerar.unit.mjs'], {
      cwd: ROOT,
      encoding: 'utf8',
      env: {
        PATH: process.env.PATH,
        GIT_CONFIG_COUNT: '2',
        GIT_CONFIG_KEY_0: 'commit.gpgsign',
        GIT_CONFIG_VALUE_0: 'true',
        GIT_CONFIG_KEY_1: 'gpg.program',
        GIT_CONFIG_VALUE_1: '/bin/false',
      },
    });
    expect(r.status, r.stdout.slice(-400) + r.stderr.slice(-300)).toBe(0);
  }, 120_000);
});
