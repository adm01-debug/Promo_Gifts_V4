import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  REQUIRED_TABLES,
  buildTriggerQuery,
  evaluateTriggerRows,
  validateManifest,
} from '../../scripts/check-anon-insert-rate-guard.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const SCRIPT = path.join(ROOT, 'scripts/check-anon-insert-rate-guard.mjs');

function rowsFor(tables = REQUIRED_TABLES) {
  return tables.map(({ table, trigger_name }) => ({
    table_name: table,
    table_exists: true,
    trigger_name: `trigger_${table}`,
    function_name: trigger_name,
    function_schema: 'public',
    trigger_enabled: 'O',
    handles_insert: true,
  }));
}

describe('check-anon-insert-rate-guard', () => {
  it('gera consulta que retorna evidência de todos os triggers, inclusive os inválidos', () => {
    const sql = buildTriggerQuery();

    expect(sql).toContain('pg_trigger');
    expect(sql).toContain("c.relkind IN ('r', 'p')");
    expect(sql).toContain('pn.nspname AS function_schema');
    expect(sql).toContain('tr.tgenabled');
    expect(sql).toContain('(tr.tgtype & 4) = 4 AS handles_insert');
    expect(sql).not.toContain('LIMIT 1');
    expect(sql).not.toContain("t.tgenabled IN ('O', 'A')");
  });

  it('aceita cobertura apenas quando as sete tabelas têm trigger INSERT habilitado com a função esperada', () => {
    expect(evaluateTriggerRows(rowsFor())).toEqual({ problems: [], checked: 7 });
  });

  it.each([
    ['tabela ausente', (rows) => rows.filter((row) => row.table_name !== 'kill_switch_hits')],
    ['trigger desabilitado', (rows) => rows.map((row) => row.table_name === 'analytics_events' ? { ...row, trigger_enabled: 'D' } : row)],
    ['função incorreta', (rows) => rows.map((row) => row.table_name === 'analytics_events' ? { ...row, function_name: 'other_guard' } : row)],
    ['schema incorreto', (rows) => rows.map((row) => row.table_name === 'analytics_events' ? { ...row, function_schema: 'other' } : row)],
    ['trigger sem INSERT', (rows) => rows.map((row) => row.table_name === 'analytics_events' ? { ...row, handles_insert: false } : row)],
  ])('rejeita %s', (_caseName, mutateRows) => {
    const evaluation = evaluateTriggerRows(mutateRows(rowsFor()));
    expect(evaluation.problems).toHaveLength(1);
    expect(evaluation.problems[0]).toMatch(/analytics_events|kill_switch_hits/);
  });

  it('rejeita um manifest sem uma das tabelas obrigatórias', () => {
    const manifest = { tables: REQUIRED_TABLES.slice(0, -1) };
    expect(validateManifest(manifest)).toContain('tabela password_reset_requests não documentada no manifest');
  });

  it('--gate sem credenciais retorna inconclusivo, nunca static-pass', () => {
    const result = spawnSync(process.execPath, [SCRIPT, '--gate'], {
      cwd: ROOT,
      encoding: 'utf8',
      env: { PATH: process.env.PATH },
    });

    expect(result.status).toBe(2);
    expect(result.stderr).toContain('inconclusive');
    expect(result.stderr).not.toContain('static-pass');
    expect(result.stderr).toContain('nenhuma afirmação de cobertura foi feita');
  });

});
