// PLANO_DBA E15 — testa scripts/preflight-migration-apply.mjs, a checagem
// somente-leitura usada pelos jobs `preflight`/`post-check` de
// .github/workflows/db-apply-migration.yml antes/depois de aplicar uma
// migration única.
//
// Mesmo padrão de tests/scripts/check-anon-write-grants.test.mjs (E22):
// funções puras testadas por unidade + integração CLI real sem credenciais
// (static-pass / inconclusive), sem tocar em nenhum banco.
import { afterEach, describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  detectBlockingDdl,
  detectNonTransactionalDdl,
  evaluatePreflight,
  findMigrationFiles,
  hasRollbackHeader,
  parseOptOut,
} from '../../scripts/preflight-migration-apply.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const SCRIPT = resolve(ROOT, 'scripts/preflight-migration-apply.mjs');

const temporaryRoots = [];
afterEach(() => {
  for (const root of temporaryRoots.splice(0)) rmSync(root, { recursive: true, force: true });
});

function tempMigrationsDir() {
  const root = mkdtempSync(join(tmpdir(), 'preflight-migrations-'));
  temporaryRoots.push(root);
  return root;
}

const ROLLBACK_HEADER = '-- Rollback: DROP VIEW public.example;\n';

// ─── findMigrationFiles ─────────────────────────────────────────────────────

describe('findMigrationFiles', () => {
  it('devolve [] quando nenhum arquivo bate com o prefixo', () => {
    const dir = tempMigrationsDir();
    writeFileSync(join(dir, '20260101000000_other.sql'), 'select 1;');
    expect(findMigrationFiles('20260102000000', dir)).toEqual([]);
  });

  it('encontra exatamente um arquivo quando o prefixo é único', () => {
    const dir = tempMigrationsDir();
    writeFileSync(join(dir, '20260101000000_create_view.sql'), 'select 1;');
    expect(findMigrationFiles('20260101000000', dir)).toEqual(['20260101000000_create_view.sql']);
  });

  it('encontra múltiplos arquivos em colisão de prefixo (caso E10)', () => {
    const dir = tempMigrationsDir();
    writeFileSync(join(dir, '20260101000000_a.sql'), 'select 1;');
    writeFileSync(join(dir, '20260101000000_b.sql'), 'select 2;');
    expect(findMigrationFiles('20260101000000', dir)).toEqual([
      '20260101000000_a.sql',
      '20260101000000_b.sql',
    ]);
  });

  it('devolve [] quando o diretório não existe', () => {
    expect(findMigrationFiles('20260101000000', '/tmp/nao-existe-preflight')).toEqual([]);
  });
});

// ─── hasRollbackHeader ──────────────────────────────────────────────────────

describe('hasRollbackHeader', () => {
  it('reconhece "-- Rollback:" no cabeçalho', () => {
    expect(hasRollbackHeader(`${ROLLBACK_HEADER}CREATE VIEW public.example AS SELECT 1;`)).toBe(true);
  });

  it('é case-insensitive', () => {
    expect(hasRollbackHeader('-- ROLLBACK: drop it\nselect 1;')).toBe(true);
  });

  it('devolve false sem cabeçalho de rollback', () => {
    expect(hasRollbackHeader('-- apenas um comentário qualquer\nselect 1;')).toBe(false);
  });

  it('ignora "-- Rollback:" fora das primeiras N linhas', () => {
    const filler = Array.from({ length: 45 }, () => '-- linha de preenchimento').join('\n');
    expect(hasRollbackHeader(`${filler}\n-- Rollback: drop it\n`)).toBe(false);
  });
});

// ─── detectNonTransactionalDdl ──────────────────────────────────────────────

describe('detectNonTransactionalDdl', () => {
  it('devolve [] para SQL transacional normal', () => {
    expect(detectNonTransactionalDdl('CREATE VIEW public.x AS SELECT 1;')).toEqual([]);
  });

  it('detecta CREATE INDEX CONCURRENTLY', () => {
    expect(detectNonTransactionalDdl('CREATE INDEX CONCURRENTLY idx_x ON public.t(a);').length).toBe(1);
  });

  it('detecta VACUUM e ALTER SYSTEM juntos', () => {
    expect(detectNonTransactionalDdl('VACUUM public.t;\nALTER SYSTEM SET x = 1;').length).toBe(2);
  });
});

// ─── evaluatePreflight ──────────────────────────────────────────────────────

describe('evaluatePreflight — modo padrão (pré-aplicação)', () => {
  it('passa quando arquivo único, rollback presente, ainda não no ledger', () => {
    const result = evaluatePreflight({
      version: '20260101000000',
      files: ['20260101000000_x.sql'],
      sqlContent: `${ROLLBACK_HEADER}CREATE VIEW public.x AS SELECT 1;`,
      isInLedger: false,
      expectApplied: false,
    });
    expect(result.ok).toBe(true);
    expect(result.problems).toEqual([]);
  });

  it('falha quando nenhum arquivo é encontrado', () => {
    const result = evaluatePreflight({
      version: '20260101000000',
      files: [],
      sqlContent: null,
      isInLedger: false,
      expectApplied: false,
    });
    expect(result.ok).toBe(false);
    expect(result.problems.some((p) => p.includes('nenhum arquivo'))).toBe(true);
  });

  it('falha em colisão de prefixo (mais de um arquivo)', () => {
    const result = evaluatePreflight({
      version: '20260101000000',
      files: ['20260101000000_a.sql', '20260101000000_b.sql'],
      sqlContent: null,
      isInLedger: false,
      expectApplied: false,
    });
    expect(result.ok).toBe(false);
    expect(result.problems.some((p) => p.includes('colidem'))).toBe(true);
  });

  it('falha sem cabeçalho de rollback', () => {
    const result = evaluatePreflight({
      version: '20260101000000',
      files: ['20260101000000_x.sql'],
      sqlContent: 'CREATE VIEW public.x AS SELECT 1;',
      isInLedger: false,
      expectApplied: false,
    });
    expect(result.ok).toBe(false);
    expect(result.problems.some((p) => p.includes('rollback'))).toBe(true);
  });

  it('falha quando a versão já está no ledger (reaplicação)', () => {
    const result = evaluatePreflight({
      version: '20260101000000',
      files: ['20260101000000_x.sql'],
      sqlContent: `${ROLLBACK_HEADER}CREATE VIEW public.x AS SELECT 1;`,
      isInLedger: true,
      expectApplied: false,
    });
    expect(result.ok).toBe(false);
    expect(result.problems.some((p) => p.includes('já está em'))).toBe(true);
  });

  it('CONCURRENTLY sem opt-out bloqueia (E63)', () => {
    const result = evaluatePreflight({
      version: '20260101000000',
      files: ['20260101000000_x.sql'],
      sqlContent: `${ROLLBACK_HEADER}CREATE INDEX CONCURRENTLY idx_x ON public.t(a);`,
      isInLedger: false,
      expectApplied: false,
    });
    expect(result.ok).toBe(false);
    expect(result.problems.some((p) => p.toLowerCase().includes('concurrently'))).toBe(true);
    // nonTransactionalDdl ainda está presente para backwards compat
    expect(result.nonTransactionalDdl.length).toBe(1);
  });

  it('CONCURRENTLY com opt-out completo passa (E63)', () => {
    const optOutHeader = `${ROLLBACK_HEADER}-- transaction: none\n-- approved-by: joaquim\n`;
    const result = evaluatePreflight({
      version: '20260101000000',
      files: ['20260101000000_x.sql'],
      sqlContent: `${optOutHeader}CREATE INDEX CONCURRENTLY idx_x ON public.t(a);`,
      isInLedger: false,
      expectApplied: false,
    });
    expect(result.ok).toBe(true);
  });
});

// ─── parseOptOut ────────────────────────────────────────────────────────────

describe('parseOptOut (E63)', () => {
  it('devolve false/null quando não há opt-out', () => {
    const r = parseOptOut('SELECT 1;');
    expect(r.transactionNone).toBe(false);
    expect(r.approvedBy).toBeNull();
  });

  it('detecta transaction: none', () => {
    expect(parseOptOut('-- transaction: none\n-- approved-by: joaquim\n').transactionNone).toBe(true);
  });

  it('detecta approved-by', () => {
    expect(parseOptOut('-- approved-by: joaquim').approvedBy).toBe('joaquim');
  });

  it('só transaction: none sem approved-by não configura opt-out completo', () => {
    const r = parseOptOut('-- transaction: none\n');
    expect(r.transactionNone).toBe(true);
    expect(r.approvedBy).toBeNull();
  });

  it('ignora opt-out fora das primeiras 40 linhas', () => {
    const filler = Array.from({ length: 42 }, () => '-- linha').join('\n');
    const r = parseOptOut(`${filler}\n-- transaction: none\n-- approved-by: joaquim\n`);
    expect(r.transactionNone).toBe(false);
  });
});

// ─── detectBlockingDdl ──────────────────────────────────────────────────────

describe('detectBlockingDdl (E63)', () => {
  it('devolve [] para SQL transacional simples', () => {
    expect(detectBlockingDdl('CREATE VIEW public.x AS SELECT 1;')).toEqual([]);
  });

  it('bloqueia CONCURRENTLY sem opt-out', () => {
    const r = detectBlockingDdl('CREATE INDEX CONCURRENTLY idx ON t(a);');
    expect(r.length).toBeGreaterThan(0);
    expect(r[0].toLowerCase()).toContain('concurrently');
  });

  it('não bloqueia CONCURRENTLY com opt-out', () => {
    expect(
      detectBlockingDdl('CREATE INDEX CONCURRENTLY idx ON t(a);', { hasTransactionNoneOptOut: true }),
    ).toEqual([]);
  });

  it('bloqueia BEGIN de topo sem opt-out', () => {
    const r = detectBlockingDdl('BEGIN;\nSELECT 1;\nCOMMIT;');
    expect(r.some((m) => m.toLowerCase().includes('begin'))).toBe(true);
  });

  it('bloqueia ALTER TYPE … ADD VALUE sem opt-out', () => {
    const r = detectBlockingDdl("ALTER TYPE public.status ADD VALUE 'pending';");
    expect(r.some((m) => m.toLowerCase().includes('alter type'))).toBe(true);
  });

  it('bloqueia DROP TABLE sem IF EXISTS mesmo com opt-out', () => {
    const r = detectBlockingDdl('DROP TABLE public.foo;', { hasTransactionNoneOptOut: true });
    expect(r.some((m) => m.toLowerCase().includes('drop sem if exists'))).toBe(true);
  });

  it('não bloqueia DROP TABLE IF EXISTS', () => {
    const r = detectBlockingDdl('DROP TABLE IF EXISTS public.foo;');
    expect(r.filter((m) => m.toLowerCase().includes('drop'))).toHaveLength(0);
  });
});

describe('evaluatePreflight — --expect-applied (pós-aplicação)', () => {
  it('passa quando a versão já está no ledger', () => {
    const result = evaluatePreflight({
      version: '20260101000000',
      files: ['20260101000000_x.sql'],
      sqlContent: `${ROLLBACK_HEADER}CREATE VIEW public.x AS SELECT 1;`,
      isInLedger: true,
      expectApplied: true,
    });
    expect(result.ok).toBe(true);
  });

  it('falha quando a versão NÃO está no ledger', () => {
    const result = evaluatePreflight({
      version: '20260101000000',
      files: ['20260101000000_x.sql'],
      sqlContent: `${ROLLBACK_HEADER}CREATE VIEW public.x AS SELECT 1;`,
      isInLedger: false,
      expectApplied: true,
    });
    expect(result.ok).toBe(false);
    expect(result.problems.some((p) => p.includes('NÃO aparece'))).toBe(true);
  });
});

// ─── Integração: CLI real, sem credenciais ──────────────────────────────────

describe('CLI (sem credenciais Supabase)', () => {
  it('exit 2 sem --version', () => {
    const env = { ...process.env };
    delete env.SUPABASE_ACCESS_TOKEN;
    delete env.SUPABASE_PROJECT_REF;
    const result = spawnSync('node', [SCRIPT], { cwd: ROOT, env, encoding: 'utf8' });
    expect(result.status).toBe(2);
  });

  it('degrada para static-pass (exit 0) com --version mas sem credenciais', () => {
    const env = { ...process.env };
    delete env.SUPABASE_ACCESS_TOKEN;
    delete env.SUPABASE_PROJECT_REF;
    const result = spawnSync('node', [SCRIPT, '--version=99999999999999'], { cwd: ROOT, env, encoding: 'utf8' });
    expect(result.status).toBe(0);
    expect(result.stdout + result.stderr).toContain('static-pass');
  });

  it('degrada para inconclusive (exit 2) com --require-live e sem credenciais', () => {
    const env = { ...process.env };
    delete env.SUPABASE_ACCESS_TOKEN;
    delete env.SUPABASE_PROJECT_REF;
    const result = spawnSync(
      'node',
      [SCRIPT, '--version=99999999999999', '--require-live'],
      { cwd: ROOT, env, encoding: 'utf8' },
    );
    expect(result.status).toBe(2);
    expect(result.stdout + result.stderr).toContain('inconclusive');
  });
});
