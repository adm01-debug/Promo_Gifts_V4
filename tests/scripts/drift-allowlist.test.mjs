// E038: Testa loadAllowlist (entrada genérica, regex inválida com nº de linha)
// e filterDiff (DDL multi-linha agrupado por statement).
// Roda com: node --test tests/scripts/drift-allowlist.test.mjs
import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { loadAllowlist, filterDiff } from '../../scripts/drift-baseline.mjs';

describe('loadAllowlist — entrada genérica', () => {
  it('reprova entrada sem identificador qualificado', () => {
    assert.throws(
      () => loadAllowlist('^grant '),
      /genérica demais/,
    );
  });

  it('reprova entrada com regex meta-char não escapado', () => {
    // '.' sem escaping é meta-char de regex — genérica demais
    assert.throws(
      () => loadAllowlist('^alter table public.t'),
      /genérica demais/,
    );
  });

  it('aceita entrada específica com esquema e objeto entre aspas', () => {
    const al = loadAllowlist('^alter table "public"\\."tabela_x" ');
    assert.equal(al.length, 1);
  });
});

describe('loadAllowlist — regex inválida com número de linha', () => {
  it('inclui número de linha no erro de regex inválida (2ª entrada)', () => {
    const allowlistText = [
      '# comentário',
      '^alter table "public"\\."ok_table" ',
      '[regex-invalida-sem-fechar',
    ].join('\n');
    let caught;
    try {
      loadAllowlist(allowlistText);
    } catch (e) {
      caught = e;
    }
    assert.ok(caught, 'Esperava exceção');
    assert.match(caught.message, /linha 2/);
  });

  it('inclui número de linha correto para a 1ª entrada inválida', () => {
    const allowlistText = '[regex-invalida\n';
    let caught;
    try {
      loadAllowlist(allowlistText);
    } catch (e) {
      caught = e;
    }
    assert.ok(caught);
    assert.match(caught.message, /linha 1/);
  });
});

describe('filterDiff — DDL multi-linha agrupado por statement', () => {
  it('remove o statement inteiro quando o cabeçalho casa com a allowlist', () => {
    const diff = [
      'create index "public"."idx_x"',
      '  on "public"."t" (col1);',
      'create table "public"."t2" (id int);',
    ].join('\n');
    const al = loadAllowlist('^create index "public"\\."idx_x"');
    const residue = filterDiff(diff, al);
    assert.equal(residue.length, 1, `Esperado 1 statement, obteve ${residue.length}: ${JSON.stringify(residue)}`);
    assert.ok(residue[0].includes('"t2"'), `Esperado "t2", obteve: ${residue[0]}`);
    assert.ok(!residue.some((s) => s.includes('idx_x')), `"idx_x" não deveria aparecer no resíduo`);
  });

  it('mantém statement multi-linha quando não casa com a allowlist', () => {
    const diff = [
      'create index "public"."idx_y"',
      '  on "public"."t" (col2);',
    ].join('\n');
    const al = loadAllowlist('^alter table "public"\\."t" ');
    const residue = filterDiff(diff, al);
    assert.equal(residue.length, 1);
    assert.ok(residue[0].includes('idx_y'));
  });

  it('linha de continuação de statement removido não vaza como ruído', () => {
    const diff = [
      'alter table "public"."large_table"',
      '  add column status text default \'pendente\';',
      'alter table "public"."other_table"',
      '  add column val int;',
    ].join('\n');
    const al = loadAllowlist('^alter table "public"\\."large_table"');
    const residue = filterDiff(diff, al);
    assert.equal(residue.length, 1, `Esperado 1, obteve: ${JSON.stringify(residue)}`);
    assert.ok(residue[0].includes('"other_table"'));
    assert.ok(!residue.some((s) => s.includes('large_table') || s.includes('pendente')));
  });

  it('compatibilidade: statement single-line com allowlist vazia retorna 1 elemento', () => {
    const r = filterDiff('alter table "public"."t" add column c int;', []);
    assert.equal(r.length, 1);
  });

  it('compatibilidade: "No schema changes found" standalone é removido', () => {
    const r = filterDiff('No schema changes found', []);
    assert.equal(r.length, 0);
  });

  it('compatibilidade: COMMENT com frase "No schema changes found" dentro de aspas é mantido', () => {
    const line = `comment on table "public"."t" is 'No schema changes found';`;
    const r = filterDiff(line, []);
    assert.equal(r.length, 1);
    assert.equal(r[0], line);
  });
});
