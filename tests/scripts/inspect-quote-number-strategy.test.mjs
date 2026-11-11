/**
 * Tests for scripts/inspect-quote-number-strategy.mjs
 *
 * O script é um comando READ-ONLY de diagnóstico (não é gate de CI): roda
 * 6 consultas via `psql -At -F '|' -c <sql>` e imprime o resultado para um
 * humano ler. Não aceita argv, não lê arquivos, só honra PGHOST/PGUSER/
 * PGPASSWORD/PGDATABASE (padrão psql).
 *
 * Achado real, com evidência de execução (ver auditoria desta sessão):
 * `q()` montava o comando com `execSync(\`psql ... -c ${JSON.stringify(sql)}\`)`.
 * As consultas #3, #4, #5 e #6 são template strings MULTILINHA. `JSON.stringify`
 * escapa cada quebra de linha real para os dois caracteres literais `\` + `n`;
 * dentro de aspas duplas o shell (`sh -c`) NÃO desfaz esse escape, então o
 * `psql` recebia o SQL com um `\n` literal no meio do texto — erro de sintaxe
 * sempre, mesmo com banco saudável e credenciais corretas. Isso quebrava as
 * 4 seções mais importantes do script (índices, constraints, gap detector de
 * duplicidade e sequência por ano): o "gap detector" nunca detectava nada,
 * nem no caso positivo nem no negativo, pois a query sempre explodia antes.
 *
 * Reproduzido via Postgres local real (sem tocar o banco de produção) e via
 * um `psql` fake isolado (este teste) que expõe o mesmo sintoma sem precisar
 * de rede: ele falha com "syntax error" sempre que recebe, no argumento da
 * query, os dois caracteres literais `\n` em vez de uma quebra de linha real.
 *
 * Correção: troca `execSync` (string via shell) por `execFileSync` (argv em
 * array, sem shell) — a string da query chega ao `psql` exatamente como foi
 * escrita, newline real incluído, sem round-trip de escaping.
 */

import assert from 'node:assert/strict';
import { chmodSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { describe, test } from 'vitest';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const SCRIPT = join(ROOT, 'scripts/inspect-quote-number-strategy.mjs');

// `psql` fake: inspeciona o argv que realmente chegou (não uma string de
// shell). Se o argumento da query (depois de `-c`) contiver os dois
// caracteres literais `\` + `n`, simula o erro real do psql para SQL
// corrompido por escaping indevido. Caso contrário, responde com dados
// fixos, reconhecendo a query pelo trecho característico de cada seção do
// script sob teste.
const FAKE_PSQL = `#!/usr/bin/env node
const args = process.argv.slice(2);
const cIdx = args.indexOf('-c');
const sql = args[cIdx + 1] ?? '';

if (sql.includes('\\\\n')) {
  process.stderr.write('psql: ERROR:  syntax error at or near "\\\\"\\n');
  process.exit(1);
}

if (/pg_get_functiondef/.test(sql)) {
  process.stdout.write('FAKE_FUNCTION_DEF_OK\\n');
} else if (/pg_indexes/.test(sql)) {
  process.stdout.write("uniq_quotes_quote_number|CREATE UNIQUE INDEX ... quote_number\\n");
} else if (/pg_constraint/.test(sql)) {
  process.stdout.write('');
} else if (/GROUP BY quote_number/.test(sql)) {
  process.stdout.write('');
} else if (/split_part\\(quote_number,'\\/',2\\)/.test(sql)) {
  process.stdout.write('25|2|10001/25|10002/25\\n');
} else {
  process.stdout.write('');
}
process.exit(0);
`;

function runScriptWithFakePsql() {
  const binDir = mkdtempSync(join(tmpdir(), 'fake-psql-'));
  const binPath = join(binDir, 'psql');
  writeFileSync(binPath, FAKE_PSQL);
  chmodSync(binPath, 0o755);

  try {
    const result = spawnSync(process.execPath, [SCRIPT], {
      encoding: 'utf8',
      env: {
        PATH: `${binDir}:${process.env.PATH ?? ''}`,
        PGHOST: 'fake-host',
        PGUSER: 'fake-user',
        PGPASSWORD: 'fake-pass',
        PGDATABASE: 'fake-db',
      },
    });
    return { ...result, output: `${result.stdout}${result.stderr}` };
  } finally {
    rmSync(binDir, { recursive: true, force: true });
  }
}

describe('inspect-quote-number-strategy', () => {
  test('não corrompe queries multilinha ao montar o comando psql (sem erro de sintaxe)', () => {
    const { status, output } = runScriptWithFakePsql();

    assert.equal(status, 0, `script deveria sair 0 (read-only, nunca falha); saída:\n${output}`);
    assert.ok(
      !/syntax error/i.test(output),
      `nenhuma das 6 seções deveria produzir erro de sintaxe do psql; saída:\n${output}`,
    );
    assert.ok(
      !output.includes('ERR:'),
      `nenhuma seção deveria cair no catch do q() com o psql fake íntegro; saída:\n${output}`,
    );
  });

  test('seção 3 (índices) chega íntegra ao psql e mostra o índice encontrado', () => {
    const { output } = runScriptWithFakePsql();
    assert.ok(
      output.includes('uniq_quotes_quote_number'),
      `seção de índices deveria mostrar o índice retornado pelo psql fake; saída:\n${output}`,
    );
  });

  test('seção 5 (gap detector) chega íntegra: zero duplicidades reporta "nenhuma duplicidade"', () => {
    const { output } = runScriptWithFakePsql();
    assert.ok(
      output.includes('nenhuma duplicidade'),
      `gap detector deveria reportar ausência de duplicidade quando a query roda OK; saída:\n${output}`,
    );
  });

  test('seção 6 (sequência por ano) chega íntegra e mostra a linha retornada', () => {
    const { output } = runScriptWithFakePsql();
    assert.ok(
      output.includes('10001/25') && output.includes('10002/25'),
      `seção de sequência por ano deveria mostrar os dados retornados pelo psql fake; saída:\n${output}`,
    );
  });
});
