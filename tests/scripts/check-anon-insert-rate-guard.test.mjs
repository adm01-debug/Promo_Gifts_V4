import { afterEach, describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  computeMissingGuards,
  loadManifest,
  migrationCreatesGuard,
  REQUIRED_TABLES,
  validateManifest,
} from '../../scripts/check-anon-insert-rate-guard.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const SCRIPT = resolve(ROOT, 'scripts/check-anon-insert-rate-guard.mjs');
const temporaryRoots = [];

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) rmSync(root, { recursive: true, force: true });
});

function tempDir(prefix) {
  const root = mkdtempSync(join(tmpdir(), prefix));
  temporaryRoots.push(root);
  return root;
}

function liveRows() {
  return REQUIRED_TABLES.map((entry) => ({ ...entry, enabled: 'O' }));
}

describe('validateManifest', () => {
  it('aceita o contrato exato das sete tabelas sem tratar data preenchida como prova', () => {
    expect(validateManifest(loadManifest())).toEqual([]);
  });

  it('rejeita tabela ausente, duplicada, inesperada ou com trigger incorreto', () => {
    const manifest = loadManifest();
    manifest.tables = manifest.tables.filter((entry) => entry.table_name !== 'kill_switch_hits');
    manifest.tables.push({ ...REQUIRED_TABLES[0] });
    manifest.tables[1] = { ...manifest.tables[1], trigger_name: 'fn_anon_insert_rate_guard' };
    manifest.tables.push({ ...REQUIRED_TABLES[0], table_name: 'unplanned_table' });

    const problems = validateManifest(manifest);
    expect(problems).toContain('tabela kill_switch_hits não documentada no manifest');
    expect(problems.some((problem) => problem.includes('duplicada'))).toBe(true);
    expect(problems).toContain('catalog_analytics: trigger_name deve ser trg_anon_rate_guard');
    expect(problems).toContain('tabela inesperada no manifest: unplanned_table');
  });
});

describe('computeMissingGuards', () => {
  it('aceita os triggers ativos em modo origin ou always', () => {
    const rows = liveRows();
    rows[0].enabled = 'A';
    expect(computeMissingGuards(rows)).toEqual([]);
  });

  it('reprova trigger ausente, desabilitado, em outra tabela ou chamando outra função', () => {
    const rows = liveRows();
    rows.splice(0, 1);
    rows[1].enabled = 'D';
    rows[2].function_name = 'other_function';

    expect(computeMissingGuards(rows).map((entry) => entry.table_name)).toEqual([
      'analytics_events',
      'product_views',
      'search_analytics',
    ]);
  });
});

describe('migrationCreatesGuard', () => {
  const requirement = REQUIRED_TABLES.find((entry) => entry.table_name === 'kill_switch_hits');

  it('reconhece apenas migration que cria trigger BEFORE INSERT usando a função esperada', () => {
    const sql = `
      DROP TRIGGER IF EXISTS trg_anon_rate_guard ON public.kill_switch_hits;
      CREATE TRIGGER trg_anon_rate_guard BEFORE INSERT ON public.kill_switch_hits
      FOR EACH ROW EXECUTE FUNCTION public.fn_anon_insert_rate_guard('120');
    `;
    expect(migrationCreatesGuard(sql, requirement)).toBe(true);
    expect(migrationCreatesGuard(sql.replace('public.fn_anon_insert_rate_guard', 'public.other'), requirement)).toBe(false);
    expect(migrationCreatesGuard(sql.replace('BEFORE INSERT', 'AFTER INSERT'), requirement)).toBe(false);
    expect(migrationCreatesGuard(
      'CREATE TRIGGER trg_anon_rate_guard BEFORE INSERT ON public.kill_switch_hits; SELECT public.fn_anon_insert_rate_guard();',
      requirement,
    )).toBe(false);
  });
});

describe('CLI --from-file', () => {
  it('passa somente quando os sete triggers existem e estão ativos', () => {
    const dir = tempDir('anon-rate-guard-pass-');
    const path = join(dir, 'triggers.json');
    writeFileSync(path, JSON.stringify(liveRows()));

    const result = spawnSync('node', [SCRIPT, '--gate', `--from-file=${path}`], {
      cwd: ROOT,
      encoding: 'utf8',
    });
    expect(result.status).toBe(0);
    expect(result.stdout + result.stderr).toContain('passed');
  });

  it('falha quando kill_switch_hits não tem o trigger esperado', () => {
    const dir = tempDir('anon-rate-guard-missing-');
    const path = join(dir, 'triggers.json');
    const rows = liveRows().filter((entry) => entry.table_name !== 'kill_switch_hits');
    writeFileSync(path, JSON.stringify(rows));

    const result = spawnSync('node', [SCRIPT, '--gate', `--from-file=${path}`], {
      cwd: ROOT,
      encoding: 'utf8',
    });
    expect(result.status).toBe(1);
    expect(result.stdout + result.stderr).toContain('kill_switch_hits');
  });

  it('não converte ausência de credenciais live em sucesso no modo gate', () => {
    const env = { ...process.env };
    delete env.SUPABASE_ACCESS_TOKEN;
    delete env.SUPABASE_PROJECT_REF;
    const result = spawnSync('node', [SCRIPT, '--gate'], { cwd: ROOT, env, encoding: 'utf8' });
    expect(result.status).toBe(2);
    expect(result.stdout + result.stderr).toContain('inconclusive');
  });

});
