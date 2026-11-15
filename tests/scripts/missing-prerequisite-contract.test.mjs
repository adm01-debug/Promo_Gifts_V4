/**
 * Contrato "pré-requisito ausente" (scripts/lib/missing-prerequisite.{mjs,sh}).
 *
 * Regressão coberta: scripts que saíam `static-pass`/exit 0 incondicional quando
 * faltava relatório, credencial, Docker ou Deno — no CI o gate passava sem verificar,
 * e a guarda do alvo de migration aceitava até project ref não canônico.
 */
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  isStrictRun,
  resolveMissingPrerequisite,
} from '../../scripts/lib/missing-prerequisite.mjs';

const ROOT = resolve(import.meta.dirname, '../..');

/** Ambiente limpo: sem CI/REQUIRE_LIVE herdados do runner e sem credenciais. */
function cleanEnv(extra = {}) {
  const env = { PATH: process.env.PATH, HOME: process.env.HOME ?? '' };
  return { ...env, ...extra };
}

function run(command, args, env, cwd = ROOT) {
  return spawnSync(command, args, {
    cwd,
    env: cleanEnv(env),
    encoding: 'utf8',
    input: '',
    timeout: 60_000,
  });
}

describe('isStrictRun', () => {
  it.each([
    [{}, [], false],
    [{ CI: 'true' }, [], true],
    [{ CI: '1' }, [], true],
    [{ GITHUB_ACTIONS: 'true' }, [], true],
    [{ REQUIRE_LIVE: '1' }, [], true],
    [{}, ['--require-live'], true],
    [{ CI: 'false' }, [], false],
    [{ CI: '' }, [], false],
    [{ REQUIRE_LIVE: '0' }, [], false],
  ])('env=%j argv=%j → %s', (env, argv, expected) => {
    expect(isStrictRun(argv, env)).toBe(expected);
  });
});

describe('resolveMissingPrerequisite', () => {
  it('fora do CI devolve static-pass explícito com exit 0', () => {
    const outcome = resolveMissingPrerequisite('gate-x', 'relatório ausente', {
      exitCode: 2,
      argv: [],
      env: {},
    });
    expect(outcome).toMatchObject({ strict: false, exitCode: 0, stream: 'stdout' });
    expect(outcome.lines[0]).toContain('[gate-x] static-pass: relatório ausente');
  });

  it('em modo estrito falha fechado com o exit code do script', () => {
    const outcome = resolveMissingPrerequisite('gate-x', 'relatório ausente', {
      exitCode: 2,
      hint: 'rode o build',
      argv: [],
      env: { CI: 'true' },
    });
    expect(outcome).toMatchObject({ strict: true, exitCode: 2, stream: 'stderr' });
    expect(outcome.lines.join('\n')).toContain('pré-requisito ausente: relatório ausente');
    expect(outcome.lines.join('\n')).toContain('rode o build');
  });

  it('nunca devolve exit 0 em modo estrito, mesmo se o chamador pedir 0', () => {
    const outcome = resolveMissingPrerequisite('gate-x', 'x', {
      exitCode: 0,
      argv: [],
      env: { REQUIRE_LIVE: '1' },
    });
    expect(outcome.exitCode).toBe(1);
  });
});

describe('gates com insumo ausente: static-pass local, falha no CI', () => {
  // check-build-log lê ./build.log do cwd: roda em diretório vazio para o insumo faltar.
  const EMPTY_DIR = mkdtempSync(join(tmpdir(), 'missing-prereq-'));
  // [comando, args, exit code esperado em modo estrito, cwd opcional]
  const cases = [
    ['node', [join(ROOT, 'scripts/check-build-log.mjs')], 1, EMPTY_DIR],
    ['node', ['scripts/check-min-tests-executed.mjs', 'nao-existe/results.json'], 1],
    ['node', ['scripts/validate-ssot-report.mjs', '--file=nao-existe/ssot-report.json'], 2],
    ['node', ['scripts/contract-testing.mjs'], 2],
    ['node', ['scripts/check-supabase-linter.mjs'], 2],
    ['node', ['scripts/verify-quote-number-hardening.mjs'], 1],
    ['bash', ['scripts/test-magazine-sql-contracts.sh'], 1],
    ['bash', ['scripts/uptime-probe.sh'], 1],
  ];

  it.each(cases)('%s %j', (command, args, strictExit, cwd) => {
    const local = run(command, args, {}, cwd);
    expect(local.status, local.stderr).toBe(0);
    expect(local.stdout).toContain('static-pass');

    for (const strictEnv of [{ CI: 'true' }, { GITHUB_ACTIONS: 'true' }, { REQUIRE_LIVE: '1' }]) {
      const strict = run(command, args, strictEnv, cwd);
      expect(strict.status, JSON.stringify(strictEnv)).toBe(strictExit);
      expect(strict.stderr).toContain('pré-requisito ausente');
      expect(strict.stdout).not.toContain('static-pass');
    }
  });
});

describe('validate-migration-target (guarda do alvo de produção) sempre falha fechado', () => {
  const cli = (args, env) => run('node', ['scripts/validate-migration-target.mjs', ...args], env);

  it.each([
    [[], {}],
    [['--version-only'], {}],
    [['--require-live-pooler'], {}],
    [['--target-only'], {}],
    // Projeto legado proibido nunca pode passar por falta de MIGRATION_VERSION/PGHOST.
    [['--version-only'], { SUPABASE_PROJECT_REF: 'pqpdolkaeqlyzpdpbizo' }],
    [['--version-only'], { SUPABASE_PROJECT_REF: 'doufsxqlfjyuvxuezpln' }],
  ])('args=%j env=%j → exit 1 sem static-pass', (args, env) => {
    const result = cli(args, env);
    expect(result.status).toBe(1);
    expect(result.stdout).not.toContain('static-pass');
    expect(result.stderr).toMatch(/MIGRATION_VERSION inválida|Project ref não canônico|ausente/);
  });

  it('aceita versão válida no projeto canônico em --version-only', () => {
    const result = cli(['--version-only'], {
      SUPABASE_PROJECT_REF: 'doufsxqlfjyuvxuezpln',
      MIGRATION_VERSION: '20261109120000',
    });
    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toContain('OK');
  });
});

describe('ratchet: nenhum script emite static-pass fora do contrato', () => {
  const SCRIPT_EXT = /\.(mjs|js|ts|sh|py)$/;
  const CONTRACT =
    /missing-prerequisite|missing_prerequisite|shouldRequireLive|REQUIRE_LIVE|require-live|requireLive|CHECK_RESULT_STATUS/;
  // Exceções revisadas: não são gates com insumo ausente.
  const ALLOWLIST = new Map([
    ['scripts/audit-debug.ts', 'script de DevTools do browser; em Node não há o que verificar'],
    ['scripts/check-result-contract.mjs', 'define o status static-pass do contrato'],
    ['scripts/lib/missing-prerequisite.mjs', 'implementa o contrato'],
    ['scripts/lib/missing-prerequisite.sh', 'implementa o contrato'],
  ]);

  function walk(dir) {
    return readdirSync(dir).flatMap((name) => {
      if (name === '__pycache__' || name === 'node_modules') return [];
      const full = join(dir, name);
      return statSync(full).isDirectory() ? walk(full) : [full];
    });
  }

  it('todo arquivo com "static-pass" usa o helper ou o contrato REQUIRE_LIVE', () => {
    const offenders = walk(join(ROOT, 'scripts'))
      .filter((file) => SCRIPT_EXT.test(file))
      .map((file) => [relative(ROOT, file).split('\\').join('/'), readFileSync(file, 'utf8')])
      .filter(([rel, source]) => source.includes('static-pass') && !ALLOWLIST.has(rel))
      .filter(([, source]) => !CONTRACT.test(source))
      .map(([rel]) => rel);
    expect(offenders, 'use scripts/lib/missing-prerequisite.{mjs,sh}').toEqual([]);
  });
});
