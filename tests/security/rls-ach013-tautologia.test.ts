/**
 * QA Etapa 019 (ACH-013) — Prova da tautologia nas policies RLS
 *
 * Bug: migration 20261022100010_perf_rls_auth_uid_wrapper.sql usa
 *   organization_id IN (SELECT <tabela>.organization_id FROM profiles ...)
 * onde a subquery seleciona a coluna da tabela EXTERNA → X IN (X) → sempre true.
 *
 * Esta suíte tem DUAS camadas:
 *
 * 1. Estática (sem credenciais) — lê o arquivo de migration e afirma que a
 *    última versão da policy NÃO contém o padrão tautológico.
 *    Falha agora porque o bug ainda está no arquivo.
 *    Passará depois das etapas 020-025 (que reescrevem as policies).
 *
 * 2. Runtime (com credenciais) — consulta pg_policies e afirma que o `qual`
 *    de cada policy NÃO contém a referência correlacionada.
 *    Skipped em CI sem env vars.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, it, expect } from 'vitest';
import { createClient } from '@supabase/supabase-js';

// ─── Configuração ────────────────────────────────────────────────────────────

const WRAPPER_MIGRATION = path.resolve(
  'supabase/migrations/20261022100010_perf_rls_auth_uid_wrapper.sql'
);

/** As 6 tabelas com policies tautológicas (ACH-013). */
const TAUTOLOGICAL_TABLES = [
  'attribute_definitions',
  'attribute_groups',
  'material_types',
  'material_variations',
  'supplier_attribute_definitions',
  'supplier_materials',
] as const;

/** Pattern que indica tautologia: outer-table.organization_id dentro de FROM profiles. */
function tautologyPattern(table: string): RegExp {
  return new RegExp(`SELECT\\s+${table}\\.organization_id\\s+FROM\\s+profiles`, 'i');
}

const hasCredentials =
  !!process.env.VITE_SUPABASE_URL &&
  !!process.env.SUPABASE_SERVICE_ROLE_KEY;

// ─── Camada 1: análise estática da migration ─────────────────────────────────

describe('ACH-013: tautologia RLS — análise estática (deve falhar antes de 020-025)', () => {
  let migrationSql: string;
  try {
    migrationSql = readFileSync(WRAPPER_MIGRATION, 'utf8');
  } catch {
    migrationSql = '';
  }

  for (const table of TAUTOLOGICAL_TABLES) {
    it(`${table}: policy NÃO deve usar SELECT ${table}.organization_id FROM profiles`, () => {
      // Este teste FALHA enquanto o bug existe.
      // Passará após as etapas 020-025 reescreverem as policies.
      const pattern = tautologyPattern(table);
      const found = pattern.test(migrationSql);
      expect(
        found,
        `TAUTOLOGIA DETECTADA: ${table} ainda usa "SELECT ${table}.organization_id FROM profiles" ` +
          `na migration ${WRAPPER_MIGRATION}. Isso torna a policy sempre verdadeira (X IN (X)). ` +
          `Corrija em etapa 02x substituindo por user_organizations ou profiles.organization_id.`
      ).toBe(false);
    });
  }
});

// ─── Camada 2: verificação runtime em pg_policies ────────────────────────────

describe.skipIf(!hasCredentials)(
  'ACH-013: tautologia RLS — verificação runtime em pg_policies',
  () => {
    const supabase = hasCredentials
      ? createClient(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
      : null;

    for (const table of TAUTOLOGICAL_TABLES) {
      it(`${table}: pg_policies.qual não deve conter referência correlacionada`, async () => {
        const { data, error } = await supabase!
          .from('pg_policies')
          .select('policyname, qual, with_check')
          .eq('schemaname', 'public')
          .eq('tablename', table);

        expect(error, `Erro ao consultar pg_policies para ${table}`).toBeNull();

        for (const row of data ?? []) {
          const haystack = `${row.qual ?? ''} ${row.with_check ?? ''}`;
          const pattern = tautologyPattern(table);
          expect(
            pattern.test(haystack),
            `TAUTOLOGIA EM PRODUÇÃO: policy "${row.policyname}" em ${table} usa ` +
              `"SELECT ${table}.organization_id FROM profiles" → sempre verdadeiro`
          ).toBe(false);
        }
      });
    }
  }
);
