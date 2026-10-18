/**
 * P200-E038 — testa loadAllowlist() e filterDiff() de scripts/drift-baseline.mjs
 *
 * Rodar: node --test tests/scripts/drift-allowlist.test.mjs
 *
 * Cobre:
 *  1. Entrada válida (específica, com objeto nomeado) é aceita.
 *  2. Entrada genérica demais é rejeitada (mutation test: se validação sumir, falha).
 *  3. Regex inválida é rejeitada (com indicação de linha).
 *  4. Entrada que casaria com ALLOWLIST_PROBE é rejeitada.
 *  5. filterDiff() remove linhas que casam e mantém as demais.
 *  6. DDL multi-linha: statement com quebra é tratado por linha (comportamento atual).
 *  7. O arquivo supabase/baseline/drift-allowlist.txt existente é válido.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadAllowlist, filterDiff } from '../../scripts/drift-baseline.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..', '..');
const ALLOWLIST_PATH = resolve(ROOT, 'supabase', 'baseline', 'drift-allowlist.txt');

// ─── 1. Entradas válidas ──────────────────────────────────────────────────────

describe('loadAllowlist — entradas válidas', () => {
  it('aceita regex específica com objeto nomeado entre aspas', () => {
    const text = '^alter table "public"."audit_log" owner to "postgres";';
    assert.doesNotThrow(() => loadAllowlist(text));
    const [re] = loadAllowlist(text);
    assert.ok(re.test('alter table "public"."audit_log" owner to "postgres";'));
  });

  it('ignora linhas vazias e comentários', () => {
    const text = '# comentário\n\n^alter table "public"."audit_log" enable row level security;';
    const result = loadAllowlist(text);
    assert.equal(result.length, 1);
  });

  it('aceita múltiplas entradas válidas sem lançar', () => {
    const text = [
      '^comment on table "public"."audit_log" is',
      '^alter table "public"."audit_log" owner to "postgres";',
    ].join('\n');
    assert.doesNotThrow(() => loadAllowlist(text));
    assert.equal(loadAllowlist(text).length, 2);
  });
});

// ─── 2. Entradas genéricas demais ────────────────────────────────────────────

describe('loadAllowlist — entradas genéricas rejeitadas (mutation test)', () => {
  it('rejeita entrada sem objeto nomeado entre aspas', () => {
    assert.throws(() => loadAllowlist('^alter table public.my_table'), /entrada genérica demais/);
  });

  it('rejeita entrada com só schema NON_OBJECT_NAMES entre aspas', () => {
    // "public" é NON_OBJECT_NAMES; não identifica um objeto específico
    assert.throws(() => loadAllowlist('^grant select on table "public"'), /entrada genérica demais/);
  });

  it('rejeita entrada que casaria string vazia (.*)', () => {
    assert.throws(() => loadAllowlist('.*'), /entrada genérica demais|regex inválida/);
  });

  it('rejeita entrada com classe de caracteres (genérica)', () => {
    // [A-Z]+ contém colchetes — é regex com classe de caracteres
    assert.throws(
      () => loadAllowlist('^create [A-Z]+ "public"."my_table"'),
      /entrada genérica demais|regex inválida/,
    );
  });
});

// ─── 3. Regex inválida ────────────────────────────────────────────────────────

describe('loadAllowlist — regex inválida', () => {
  it('rejeita regex com grupo não fechado', () => {
    // "(broken" cria grupo não fechado OU é detectado como regex genérica
    assert.throws(() => loadAllowlist('^alter table "public"."test_broken"('));
  });
});

// ─── 4. Entradas que casariam ALLOWLIST_PROBE são rejeitadas ─────────────────

describe('loadAllowlist — probes', () => {
  it('rejeita ^create table "public"."__drift_probe__"', () => {
    assert.throws(
      () => loadAllowlist('^create table "public"."__drift_probe__"'),
      /entrada genérica demais/,
    );
  });

  it('rejeita ^drop function "public"."__drift_probe__"\\(\\)', () => {
    // A expressão com \(\) casaria a probe → rejeitada como genérica
    assert.throws(
      () => loadAllowlist('^drop function "public"."__drift_probe__"\\(\\)'),
      /entrada genérica demais/,
    );
  });
});

// ─── 5. filterDiff ────────────────────────────────────────────────────────────

describe('filterDiff', () => {
  const DIFF = [
    'alter table "public"."audit_log" owner to "postgres";',
    'create index "idx_audit_log_user" on "public"."audit_log" using btree ("user_id");',
    'grant select on table "public"."audit_log" to "anon";',
  ].join('\n');

  it('remove linhas que casam com a allowlist', () => {
    const allowlist = loadAllowlist('^alter table "public"."audit_log" owner to "postgres";');
    const residue = filterDiff(DIFF, allowlist);
    assert.ok(!residue.includes('owner to "postgres"'));
    assert.ok(residue.includes('idx_audit_log_user'));
    assert.ok(residue.includes('grant select'));
  });

  it('retorna diff intacto quando allowlist é vazia', () => {
    const residue = filterDiff(DIFF, []);
    assert.equal(residue.trim(), DIFF.trim());
  });

  it('retorna string vazia quando todas as linhas são filtradas', () => {
    const allowlist = loadAllowlist(
      [
        '^alter table "public"."audit_log" owner to "postgres";',
        '^create index "idx_audit_log_user" on "public"."audit_log"',
        '^grant select on table "public"."audit_log" to "anon";',
      ].join('\n'),
    );
    const residue = filterDiff(DIFF, allowlist);
    assert.equal(residue.trim(), '');
  });
});

// ─── 6. DDL multi-linha (comportamento atual: filtra por linha) ───────────────

describe('filterDiff — DDL com quebra de linha', () => {
  it('filtra cada linha individualmente (comportamento atual)', () => {
    const multiLine = [
      'alter table "public"."products"',
      '  add column "qty" integer;',
    ].join('\n');
    // Entrada de allowlist que cobre só a 1ª linha
    const allowlist = loadAllowlist('^alter table "public"."products"$');
    const residue = filterDiff(multiLine, allowlist);
    // A 2ª linha (sem prefixo que case) permanece no resíduo
    assert.ok(residue.includes('add column'));
  });
});

// ─── 7. Allowlist real existente é válida ─────────────────────────────────────

describe('supabase/baseline/drift-allowlist.txt', () => {
  it('arquivo existe', () => {
    assert.ok(existsSync(ALLOWLIST_PATH), `Arquivo não encontrado: ${ALLOWLIST_PATH}`);
  });

  it('todas as entradas passam loadAllowlist sem erro', () => {
    const text = readFileSync(ALLOWLIST_PATH, 'utf8');
    assert.doesNotThrow(() => loadAllowlist(text));
  });
});
