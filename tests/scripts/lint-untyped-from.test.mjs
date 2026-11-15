/**
 * Tests for scripts/lint-untyped-from.sh
 *
 * O script cruza chamadas untypedFrom("tabela") em src/ contra as tabelas
 * presentes em src/integrations/supabase/types.ts, pra evitar a regressão
 * do colapso de 2026-05-24 (tabelas inexistentes chamadas via untypedFrom
 * quebravam features em silêncio).
 *
 * Regressão coberta por este arquivo: o passo 2 (extração das tabelas do
 * types.ts gerado) usava `grep ... | sed ... | sort -u > "$tmp_schema"`
 * SEM o `|| true` que o passo 1 (chamadas untypedFrom) já tinha. Sob
 * `set -euo pipefail`, se o types.ts tiver 0 linhas no formato esperado
 * (arquivo vazio, corrompido, ou corrompido por CRLF — o que quebra o
 * `\{$` da regex), o grep retorna 1, a pipeline falha e o script aborta
 * IMEDIATAMENTE via `set -e`, antes de imprimir qualquer coisa: CI falha
 * com exit code != 0 e ZERO stdout/stderr, sem nenhuma das mensagens de
 * diagnóstico que o script foi desenhado pra mostrar (nem o ✅ de sucesso
 * quando não há chamadas untypedFrom, nem o ::error:: explicando a causa).
 * O teste "não falha silenciosamente quando types.ts tem zero tabelas
 * reconhecidas" prova a regressão: falharia (stdout vazio) sem o fix.
 */

import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const script = resolve(root, 'scripts/lint-untyped-from.sh');

const VALID_TYPES_TS = `export type Database = {
  public: {
    Tables: {
      products: {
        Row: {}
      }
      orders: {
        Row: {}
      }
    }
    Views: {
      kit_component_media: {
        Row: {}
      }
    }
  }
}
`;

function withRepo(run) {
  const dir = mkdtempSync(join(tmpdir(), 'lint-untyped-from-'));
  try {
    mkdirSync(join(dir, 'src/integrations/supabase'), { recursive: true });
    mkdirSync(join(dir, 'src/pages'), { recursive: true });
    writeFileSync(join(dir, 'src/integrations/supabase/types.ts'), VALID_TYPES_TS);
    run({
      dir,
      writeTypes: (content) =>
        writeFileSync(join(dir, 'src/integrations/supabase/types.ts'), content),
      writeSource: (name, content) => writeFileSync(join(dir, 'src/pages', name), content),
    });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

function runScript(dir) {
  try {
    const stdout = execFileSync('bash', [script, dir], { encoding: 'utf8', stdio: 'pipe' });
    return { status: 0, stdout };
  } catch (error) {
    return { status: error.status, stdout: error.stdout?.toString() ?? '' };
  }
}

describe('lint-untyped-from.sh — comportamento esperado', () => {
  it('passa (exit 0) quando não há chamadas untypedFrom()', () => {
    withRepo(({ dir }) => {
      const result = runScript(dir);
      expect(result.status).toBe(0);
      expect(result.stdout).toMatch(/Nenhuma chamada untypedFrom/);
    });
  });

  it('passa (exit 0) quando toda tabela chamada existe no schema', () => {
    withRepo(({ dir, writeSource }) => {
      writeSource('foo.ts', 'untypedFrom("orders").select("*");\n');
      const result = runScript(dir);
      expect(result.status).toBe(0);
      expect(result.stdout).toMatch(/Todas as 1 tabelas/);
    });
  });

  it('falha (exit 1) e explica a causa quando a tabela não existe no schema', () => {
    withRepo(({ dir, writeSource }) => {
      writeSource('foo.ts', 'untypedFrom("ghost_table").select("*");\n');
      const result = runScript(dir);
      expect(result.status).toBe(1);
      expect(result.stdout).toMatch(/::error::1 tabela\(s\)/);
      expect(result.stdout).toContain('ghost_table');
    });
  });

  it('passa (exit 0) com aviso quando a tabela ausente está na allowlist', () => {
    withRepo(({ dir, writeTypes, writeSource }) => {
      // kit_component_media está na ALLOWLIST do script; types.ts aqui não a
      // contém (simula o cenário real: types.ts desatualizado).
      writeTypes(VALID_TYPES_TS.replace(/\s*kit_component_media: \{\s*Row: \{\}\s*\}\n/, ''));
      writeSource('foo.ts', 'untypedFrom("kit_component_media").select("*");\n');
      const result = runScript(dir);
      expect(result.status).toBe(0);
      expect(result.stdout).toMatch(/allowlist/);
    });
  });

  it('falha (exit 2) com mensagem clara quando types.ts não existe', () => {
    withRepo(({ dir }) => {
      rmSync(join(dir, 'src/integrations/supabase/types.ts'));
      const result = runScript(dir);
      expect(result.status).toBe(2);
      expect(result.stdout).toMatch(/types\.ts não encontrado/);
    });
  });
});

describe('lint-untyped-from.sh — regressão: types.ts com zero tabelas reconhecidas', () => {
  // Cobre tanto um types.ts realmente vazio quanto um types.ts corrompido
  // por CRLF (quebra o `\{$` da regex de extração do schema): em ambos os
  // casos a extração do schema não casa nenhuma linha.

  it('não falha silenciosamente quando types.ts está vazio e não há chamadas untypedFrom', () => {
    withRepo(({ dir, writeTypes }) => {
      writeTypes('');
      const result = runScript(dir);
      // Antes do fix: grep sem match no passo do schema abortava o script
      // via `set -e` (pipefail) ANTES de qualquer `echo` — stdout vazio e
      // exit code 1, sem nenhum diagnóstico.
      expect(result.stdout).not.toBe('');
      expect(result.stdout).toMatch(/lint-untyped-from/);
      expect(result.status).toBe(0);
      expect(result.stdout).toMatch(/Nenhuma chamada untypedFrom/);
    });
  });

  it('reporta ::error:: (não crasha em silêncio) quando types.ts vazio e há chamada untypedFrom', () => {
    withRepo(({ dir, writeTypes, writeSource }) => {
      writeTypes('');
      writeSource('foo.ts', 'untypedFrom("products").select("*");\n');
      const result = runScript(dir);
      expect(result.stdout).not.toBe('');
      expect(result.status).toBe(1);
      expect(result.stdout).toMatch(/::error::1 tabela\(s\)/);
      expect(result.stdout).toMatch(/database\.types\.ts está desatualizado/);
    });
  });

  it('não falha silenciosamente quando types.ts está corrompido por CRLF', () => {
    withRepo(({ dir, writeTypes, writeSource }) => {
      // CRLF em todas as linhas quebra a âncora `\{$` da regex do schema,
      // então nenhuma tabela é reconhecida — mesmo efeito de um arquivo vazio.
      writeTypes(VALID_TYPES_TS.split('\n').join('\r\n'));
      writeSource('foo.ts', 'untypedFrom("products").select("*");\n');
      const result = runScript(dir);
      expect(result.stdout).not.toBe('');
      expect(result.status).toBe(1);
      expect(result.stdout).toMatch(/::error::1 tabela\(s\)/);
    });
  });
});
