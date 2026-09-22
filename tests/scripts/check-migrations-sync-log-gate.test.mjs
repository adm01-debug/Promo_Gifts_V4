// PLANO_DBA E48 — testa scripts/check-migrations-sync-log-gate.mjs, o gate
// que exige uma linha de recibo em supabase/MIGRATIONS_SYNC_LOG.md (versão
// entre crases markdown, em qualquer tabela do arquivo) para toda migration
// nova/modificada tocada por uma PR. É 100% local/git — sem credencial
// Supabase — então os testes cobrem as funções puras (extração de versão,
// extração de registradas, avaliação do gate) e o `runCheck` fim-a-fim com
// `diffOutput`/`logContent` injetados (sem depender de um git real).
import { afterEach, describe, expect, it } from 'vitest';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { CHECK_RESULT_STATUS } from '../../scripts/check-result-contract.mjs';
import {
  changedMigrationFilenames,
  evaluateSyncLogGate,
  extractMigrationVersion,
  extractRegisteredVersions,
  resolveBaseRef,
  runCheck,
} from '../../scripts/check-migrations-sync-log-gate.mjs';

// Caminho composto em runtime: os nomes abaixo são fixtures deliberadamente
// inexistentes e não devem ser confundidos com referências documentais reais.
const migrationPath = (filename) => ['supabase', 'migrations', filename].join('/');

const temporaryRoots = [];
afterEach(() => {
  for (const root of temporaryRoots.splice(0)) rmSync(root, { recursive: true, force: true });
});

function tempDir(prefix) {
  const root = mkdtempSync(join(tmpdir(), prefix));
  temporaryRoots.push(root);
  return root;
}

// ─── extractMigrationVersion ────────────────────────────────────────────────

describe('extractMigrationVersion', () => {
  it('extrai o prefixo canônico de 14 dígitos', () => {
    expect(extractMigrationVersion('20260916155725_catalog_stats.sql')).toBe('20260916155725');
  });

  it('extrai um prefixo malformado de 19 dígitos (achado real da E09)', () => {
    expect(
      extractMigrationVersion('2026062311292414001_add_full_path_readable_propagation_triggers.sql'),
    ).toBe('2026062311292414001');
  });

  it('devolve null quando o nome não começa com dígitos seguidos de "_"', () => {
    expect(extractMigrationVersion('README.sql')).toBeNull();
    expect(extractMigrationVersion('bugalert1_sem_prefixo.sql')).toBeNull();
  });
});

// ─── extractRegisteredVersions ──────────────────────────────────────────────

describe('extractRegisteredVersions', () => {
  it('extrai versões canônicas e não-canônicas entre crases', () => {
    const log = [
      '| `20260916155725` | ... |',
      '| `20260623_bugalert1` | ... |',
      '| `2026062311292414001` | ... |',
    ].join('\n');
    const versions = extractRegisteredVersions(log);
    expect(versions).toEqual(
      new Set(['20260916155725', '20260623_bugalert1', '2026062311292414001']),
    );
  });

  it('não confunde um hash SHA-256/MD5 entre crases com uma versão', () => {
    const log = [
      '| `20260916155725` | `c03d47ba1092d52f69f53f24c0fd4a4bda564df820c78a5bf3d36c8f349cab1d` |',
      '| `—` | `295937419d88bdce784aba42f37ef5e4` |',
    ].join('\n');
    const versions = extractRegisteredVersions(log);
    // só a versão real deve ser capturada — os dois hashes têm letras a-f
    // misturadas com dígitos e não batem no padrão \d{8,19}(_palavra)*.
    expect(versions).toEqual(new Set(['20260916155725']));
  });

  it('devolve conjunto vazio para um log sem nenhuma versão registrada', () => {
    expect(extractRegisteredVersions('# Log vazio\n\nsem tabelas ainda.')).toEqual(new Set());
  });
});

// ─── changedMigrationFilenames ──────────────────────────────────────────────

describe('changedMigrationFilenames', () => {
  it('filtra só .sql dentro de supabase/migrations/ e remove o prefixo do diretório', () => {
    const diff = [
      migrationPath('20260917120000_add_foo.sql'),
      'supabase/MIGRATIONS_SYNC_LOG.md',
      'src/App.tsx',
      migrationPath('README.md'),
      '',
    ].join('\n');
    expect(changedMigrationFilenames(diff)).toEqual(['20260917120000_add_foo.sql']);
  });

  it('devolve array vazio para diff vazio', () => {
    expect(changedMigrationFilenames('')).toEqual([]);
  });
});

// ─── evaluateSyncLogGate ─────────────────────────────────────────────────────

describe('evaluateSyncLogGate', () => {
  it('FALHA quando um arquivo de migration alterado não tem versão registrada no log', () => {
    const result = evaluateSyncLogGate({
      changedFilenames: ['20260917120000_add_foo.sql'],
      logContent: '| `20260916155725` | ... |',
    });
    expect(result.ok).toBe(false);
    expect(result.missing).toEqual([
      { filename: '20260917120000_add_foo.sql', version: '20260917120000', reason: 'version_not_registered' },
    ]);
  });

  it('PASSA quando a versão do arquivo alterado está registrada no log', () => {
    const result = evaluateSyncLogGate({
      changedFilenames: ['20260916155725_catalog_stats.sql'],
      logContent: '| `20260916155725` | `catalog_stats_price_range_top_colors_materials` | ... |',
    });
    expect(result.ok).toBe(true);
    expect(result.missing).toEqual([]);
  });

  it('sinaliza version_unparseable para um nome de arquivo sem prefixo numérico', () => {
    const result = evaluateSyncLogGate({
      changedFilenames: ['sem_prefixo_numerico.sql'],
      logContent: '| `20260916155725` | ... |',
    });
    expect(result.ok).toBe(false);
    expect(result.missing).toEqual([
      { filename: 'sem_prefixo_numerico.sql', version: null, reason: 'version_unparseable' },
    ]);
  });

  it('avalia múltiplos arquivos independentemente (mistura de presente/ausente)', () => {
    const result = evaluateSyncLogGate({
      changedFilenames: ['20260916155725_a.sql', '20260917000000_b.sql'],
      logContent: '| `20260916155725` | ... |',
    });
    expect(result.ok).toBe(false);
    expect(result.checkedCount).toBe(2);
    expect(result.missing).toHaveLength(1);
    expect(result.missing[0].version).toBe('20260917000000');
  });
});

// ─── resolveBaseRef ──────────────────────────────────────────────────────────

describe('resolveBaseRef', () => {
  it('usa GITHUB_BASE_REF quando presente (evento pull_request em CI)', () => {
    expect(resolveBaseRef({ GITHUB_BASE_REF: 'main' })).toBe('main');
  });

  it('cai para "main" quando nenhuma env var de base está definida', () => {
    expect(resolveBaseRef({})).toBe('main');
  });
});

// ─── runCheck (fim-a-fim, diffOutput/logContent injetados — sem git real) ──

describe('runCheck', () => {
  it('FALHA (status failed) quando um .sql alterado não tem recibo no log', () => {
    const result = runCheck({
      diffOutput: `${migrationPath('20260917120000_add_foo.sql')}\n`,
      logContent: '| `20260916155725` | ... |',
    });
    expect(result.status).toBe(CHECK_RESULT_STATUS.FAILED);
    expect(result.summary).toContain('20260917120000_add_foo.sql');
    expect(result.details.missing).toHaveLength(1);
  });

  it('PASSA (status passed) quando todo .sql alterado tem recibo no log', () => {
    const result = runCheck({
      diffOutput: `${migrationPath('20260916155725_catalog_stats.sql')}\n`,
      logContent: '| `20260916155725` | `catalog_stats_price_range_top_colors_materials` | ... |',
    });
    expect(result.status).toBe(CHECK_RESULT_STATUS.PASSED);
    expect(result.details.changedCount).toBe(1);
  });

  it('PASSA (status passed) quando o diff não toca supabase/migrations/** — gate não se aplica', () => {
    const result = runCheck({
      diffOutput: 'src/App.tsx\nREADME.md\n',
      logContent: '| `20260916155725` | ... |',
    });
    expect(result.status).toBe(CHECK_RESULT_STATUS.PASSED);
    expect(result.details.changedCount).toBe(0);
  });

  it('INCONCLUSIVE quando MIGRATIONS_SYNC_LOG.md não existe no root informado', () => {
    const root = tempDir('promo-gifts-sync-log-gate-nolog-');
    const result = runCheck({ root, diffOutput: `${migrationPath('20260917120000_add_foo.sql')}\n` });
    expect(result.status).toBe(CHECK_RESULT_STATUS.INCONCLUSIVE);
  });

  it('INCONCLUSIVE quando o git diff não pode ser calculado (sem diffOutput injetado, sem repo git real utilizável)', () => {
    const root = tempDir('promo-gifts-sync-log-gate-nogit-');
    mkdirSync(join(root, 'supabase'));
    writeFileSync(join(root, 'supabase', 'MIGRATIONS_SYNC_LOG.md'), '| `20260916155725` | ... |', 'utf8');

    // root não é um repositório git (nem tem origin/main nem HEAD~1) → todos
    // os 3 candidatos de `git diff` falham → inconclusive, não passed/failed.
    const result = runCheck({ root, env: {} });
    expect(result.status).toBe(CHECK_RESULT_STATUS.INCONCLUSIVE);
  });

  it('lê o log real do repositório quando root/diffOutput não são injetados explicitamente (smoke test de integração)', () => {
    // Usa o repo real (cwd do processo de teste) como root, e injeta só o
    // diff — confirma que runCheck lê supabase/MIGRATIONS_SYNC_LOG.md de
    // verdade e que a versão do "último recibo" documentado (E48) está
    // registrada nele.
    const result = runCheck({
      diffOutput: `${migrationPath('20260916155725_catalog_stats_price_range_top_colors_materials.sql')}\n`,
    });
    expect(result.status).toBe(CHECK_RESULT_STATUS.PASSED);
  });
});
