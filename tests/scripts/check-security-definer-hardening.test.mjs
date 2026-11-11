<<<<<<< HEAD
/**
 * Regressão: o gate dizia "nenhuma migration nova para validar" em toda PR (checkout raso do
 * Actions não tem origin/<base>) e não via SECURITY DEFINER depois do corpo da função nem
 * `REVOKE … FROM PUBLIC; GRANT … TO anon`.
 */
import { execFileSync, spawnSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';

const ROOT = resolve(import.meta.dirname, '../..');
const dirs = [];
afterAll(() => dirs.forEach((d) => rmSync(d, { recursive: true, force: true })));

const git = (cwd, ...args) =>
  execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', '-c', 'commit.gpgsign=false', ...args], {
    cwd,
    encoding: 'utf8',
    env: { PATH: process.env.PATH, HOME: process.env.HOME ?? '', GIT_CONFIG_GLOBAL: '/dev/null' },
  });

/** Remoto "origin" com main + um branch de PR que adiciona uma migration. Devolve clone raso (como actions/checkout). */
function ciCheckout(migrationSql, { shallow = true } = {}) {
  const base = mkdtempSync(join(tmpdir(), 'secdef-'));
  dirs.push(base);
  const seed = join(base, 'seed');
  mkdirSync(join(seed, 'scripts'), { recursive: true });
  mkdirSync(join(seed, 'supabase/migrations'), { recursive: true });
  cpSync(join(ROOT, 'scripts/check-security-definer-hardening.mjs'), join(seed, 'scripts/check-security-definer-hardening.mjs'));
  writeFileSync(join(seed, 'package.json'), '{"type":"module"}');
  writeFileSync(join(seed, 'supabase/migrations/20260101000000_base.sql'), 'select 1;\n');
  git(seed, 'init', '-q', '-b', 'main');
  git(seed, 'add', '-A');
  git(seed, 'commit', '-q', '-m', 'base');
  git(seed, 'checkout', '-q', '-b', 'pr');
  writeFileSync(join(seed, 'supabase/migrations/20260102000000_nova.sql'), migrationSql);
  git(seed, 'add', '-A');
  git(seed, 'commit', '-q', '-m', 'pr');
  const bare = join(base, 'remote.git');
  git(base, 'clone', '-q', '--bare', seed, bare);
  const work = join(base, 'work');
  git(base, 'clone', '-q', ...(shallow ? ['--depth=1'] : []), '--branch', 'pr', `file://${bare}`, work);
  return work;
}

const run = (cwd, env = {}) =>
  spawnSync('node', ['scripts/check-security-definer-hardening.mjs'], {
    cwd,
    encoding: 'utf8',
    env: { PATH: process.env.PATH, HOME: process.env.HOME ?? '', GIT_CONFIG_GLOBAL: '/dev/null', GITHUB_ACTIONS: 'true', GITHUB_BASE_REF: 'main', ...env },
  });

const longBody = Array.from({ length: 80 }, (_, i) => `  perform ${i};`).join('\n');
const SD_AFTER_BODY = `create or replace function public.f() returns void as $$\nbegin\n${longBody}\nend;\n$$ language plpgsql security definer;\n`;
const SD_OK = `create or replace function public.f() returns void language plpgsql security definer set search_path to public, pg_temp as $$ begin null; end; $$;\nrevoke execute on function public.f() from anon;\n`;

describe('checkout raso de PR (fetch-depth: 1)', () => {
  it('busca a base e valida: SECURITY DEFINER sem hardening reprova (antes: "nenhuma migration nova", exit 0)', () => {
    const r = run(ciCheckout(SD_AFTER_BODY));
    expect(r.status, r.stdout + r.stderr).toBe(1);
    expect(r.stderr).toContain('20260102000000_nova.sql');
  });

  it('migration com hardening completo passa', () => {
    const r = run(ciCheckout(SD_OK));
    expect(r.status, r.stdout + r.stderr).toBe(0);
    expect(r.stdout).toContain('1 migration(s) nova(s) validadas');
  });

  it('REVOKE FROM PUBLIC + GRANT TO anon não conta como revoke de anon', () => {
    const sql = SD_OK.replace('from anon', 'from public') + 'grant execute on function public.f() to anon;\n';
    expect(run(ciCheckout(sql)).status).toBe(1);
  });

  it('comentário "security definer" não torna a função definer', () => {
    const sql = '-- esta função NÃO é security definer\ncreate function public.g() returns int language sql as $$ select 1 $$;\n';
    expect(run(ciCheckout(sql)).status).toBe(0);
  });

  it('em CI, base inalcançável → exit 2 (não "tudo ok")', () => {
    const work = ciCheckout(SD_OK);
    git(work, 'remote', 'set-url', 'origin', 'file:///nao/existe.git');
    const r = run(work);
    expect(r.status).toBe(2);
    expect(r.stderr).toContain('indisponível');
  });
});

describe('clone completo (origin/main presente)', () => {
  it('continua validando via diff de três pontos', () => {
    const work = ciCheckout(SD_AFTER_BODY, { shallow: false });
    expect(run(work).status).toBe(1);
||||||| 1dcb3b6b0e
=======
import { spawn } from "node:child_process";
import { existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

function runCheck(env) {
  return new Promise((resolveRun, rejectRun) => {
    const child = spawn(process.execPath, [resolve(ROOT, "scripts", "check-security-definer-hardening.mjs")], {
      cwd: ROOT,
      env: { PATH: process.env.PATH ?? "", ...env },
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => (stdout += chunk));
    child.stderr.on("data", (chunk) => (stderr += chunk));
    child.once("error", rejectRun);
    child.once("close", (exitCode) => resolveRun({ exitCode, stdout, stderr }));
  });
}

describe("check-security-definer-hardening", () => {
  let marker;

  afterEach(() => {
    if (marker && existsSync(marker)) rmSync(marker);
  });

  it("não executa comando arbitrário quando GITHUB_BASE_REF traz injeção de shell", async () => {
    marker = join(tmpdir(), `secdef-hardening-injection-${process.pid}-${Date.now()}.marker`);
    expect(existsSync(marker)).toBe(false);

    const outcome = await runCheck({
      // Nome de branch malicioso — vindo do ambiente da PR, nunca deve ser
      // interpolado numa shell string sem escape.
      GITHUB_BASE_REF: `main$(touch ${marker})`,
    });

    expect(existsSync(marker)).toBe(false);
    // Sem o remote/ref válido, o script cai no fallback de `git status` e
    // termina normalmente (sem migrations novas neste worktree de teste).
    expect(outcome.exitCode).toBe(0);
>>>>>>> origin/claude/laughing-euler-x5cbhq
  });
});
