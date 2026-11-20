// Contrato estático das correções feitas depois da verificação adversarial do
// endurecimento das tabelas de frete (20261120030000) e dos rollbacks.
//
// O comportamento foi provado em PostgreSQL 16 local, com os mesmos arquivos
// (apagar o usuário → updated_by NULL; rollback das 4 versões no mesmo dia,
// duas vezes; nome só com TAB recusado). Aqui não há banco: os testes impedem
// que a linha que carrega cada correção suma numa edição futura.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const ler = (caminho: string) => readFileSync(resolve(process.cwd(), caminho), 'utf8');

/** Linhas de código, sem recuo, sem linha vazia e sem comentário SQL. */
const linhasDeCodigo = (sql: string) =>
  sql
    .split('\n')
    .map((linha) => linha.trim())
    .filter((linha) => linha !== '' && !linha.startsWith('--'));

function corpoDaFuncao(sql: string, nome: string) {
  const inicio = sql.indexOf(`CREATE OR REPLACE FUNCTION public.${nome}()`);
  const abre = sql.indexOf('AS $$', inicio);
  const fecha = sql.indexOf('$$;', abre);
  if (inicio < 0 || abre < 0 || fecha < 0) throw new Error(`função ${nome} não encontrada`);
  return linhasDeCodigo(sql.slice(abre + 'AS $$'.length, fecha));
}

const HARDEN = ler('supabase/migrations/20261120030000_harden_freight_tables.sql');
const SEED = ler('supabase/migrations/20261120030100_seed_shipping_boxes.sql');
const ROLLBACK_SEED = ler('supabase/rollbacks/20261120030100_rollback.sql');

describe('20261120030000 — guard_freight_settings_row', () => {
  it('só carimba o autor no UPDATE direto, para o ON DELETE SET NULL da FK passar', () => {
    // UPDATE vindo do cliente: pg_trigger_depth() = 1 → carimba auth.uid().
    // SET NULL da FK com auth.users: é um UPDATE disparado por trigger interno,
    // então este trigger roda na profundidade 1 + 1 = 2 → o IF não entra e o
    // NULL fica. `NEW.id := OLD.id` vem ANTES do IF: vale nas duas profundidades.
    expect(corpoDaFuncao(HARDEN, 'guard_freight_settings_row')).toEqual([
      'BEGIN',
      'NEW.id := OLD.id;',
      'IF pg_trigger_depth() = 1 THEN',
      'NEW.updated_by := coalesce(auth.uid(), OLD.updated_by);',
      'END IF;',
      'RETURN NEW;',
      'END;',
    ]);
  });
});

describe('20261120030000 — guard_shipping_boxes_row', () => {
  it('no INSERT de usuário logado gera id e datas; no UPDATE mantém id e created_at', () => {
    expect(corpoDaFuncao(HARDEN, 'guard_shipping_boxes_row')).toEqual([
      'BEGIN',
      "IF TG_OP = 'INSERT' THEN",
      'IF auth.uid() IS NOT NULL THEN',
      'NEW.id := gen_random_uuid();',
      'NEW.created_at := now();',
      'NEW.updated_at := now();',
      'END IF;',
      'RETURN NEW;',
      'END IF;',
      'NEW.id := OLD.id;',
      'NEW.created_at := OLD.created_at;',
      'RETURN NEW;',
      'END;',
    ]);
  });

  it('o trigger dispara em INSERT e em UPDATE', () => {
    expect(HARDEN).toContain(
      'CREATE OR REPLACE TRIGGER guard_shipping_boxes_row\n  BEFORE INSERT OR UPDATE ON public.shipping_boxes\n',
    );
  });
});

describe('20261120030000 — CHECK de name', () => {
  it('compara o nome com ele mesmo sem espaço, TAB, LF, CR e NBSP nas pontas', () => {
    expect(HARDEN).toContain(
      "CHECK (name = btrim(name, E' \\t\\n\\r' || chr(160)) AND name <> '' AND char_length(name) <= 80)",
    );
    expect(HARDEN).not.toContain("btrim(name) <> ''");
  });

  it('as 4 caixas do seed passam na regra', () => {
    const nomes = [...SEED.matchAll(/^ {2}\('[A-Z0-9]+', '(?<nome>[^']*)',/gm)].map(
      (m) => m.groups?.nome ?? '',
    );
    // 4 linhas no VALUES do seed (P, M, G, GG) → 4 nomes.
    expect(nomes).toEqual(['Caixa P', 'Caixa M', 'Caixa G', 'Caixa GG']);
    // Mesma regra do CHECK, em JS: nada da lista do btrim nas pontas (U+00A0 é
    // o chr(160)), não vazio, até 80 caracteres. O maior, 'Caixa GG', tem
    // 5 + 1 + 2 = 8 caracteres.
    const naPonta = /^[ \t\n\r\u00a0]|[ \t\n\r\u00a0]$/;
    for (const nome of nomes) {
      expect(naPonta.test(nome)).toBe(false);
      expect(nome.length).toBeGreaterThan(0);
      expect(nome.length).toBeLessThanOrEqual(80);
    }
    expect(Math.max(...nomes.map((nome) => nome.length))).toBe(8);
  });
});

describe.each([
  ['20261119213000', 'shipping_boxes'],
  ['20261119213100', 'freight_settings'],
])('rollback %s — backup no primeiro nome livre', (versao, tabela) => {
  const codigo = linhasDeCodigo(ler(`supabase/rollbacks/${versao}_rollback.sql`)).join('\n');

  it('procura o nome livre em vez de recusar quando o backup do dia existe', () => {
    // n começa em 1 e soma 1 antes de montar o nome: o primeiro nome
    // alternativo é _YYYYMMDD_2 (1 + 1), depois _3, ...
    expect(codigo).toContain(
      [
        "WHILE to_regclass('public.' || b) IS NOT NULL LOOP",
        'n := n + 1;',
        "b := dia || '_' || n;",
        'END LOOP;',
      ].join('\n'),
    );
    expect(codigo).toContain('n integer := 1;');
    expect(codigo).not.toContain('o backup de hoje');
    // Sobra 1 RAISE EXCEPTION: o da contagem do backup diferente da tabela.
    expect(codigo.match(/RAISE EXCEPTION/g)).toHaveLength(1);
  });

  it('só faz o DROP depois de copiar e conferir a contagem', () => {
    const passos = [
      "WHILE to_regclass('public.' || b) IS NOT NULL LOOP",
      `EXECUTE format('CREATE TABLE public.%I AS TABLE public.${tabela}', b);`,
      'IF linhas_backup IS DISTINCT FROM linhas_tabela THEN',
      `DROP TABLE public.${tabela};`,
    ];
    const posicoes = passos.map((passo) => codigo.indexOf(passo));
    expect(posicoes.every((posicao) => posicao >= 0)).toBe(true);
    expect(posicoes).toEqual([...posicoes].sort((a, b) => a - b));
  });
});

describe('rollback 20261120030100 — seed', () => {
  it('confere se a tabela existe antes do DELETE, dentro do mesmo bloco', () => {
    const codigo = linhasDeCodigo(ROLLBACK_SEED).join('\n');
    const guarda = codigo.indexOf(
      [
        'DO $$',
        'BEGIN',
        "IF to_regclass('public.shipping_boxes') IS NULL THEN",
        "RAISE NOTICE 'public.shipping_boxes não existe: nada a desfazer.';",
        'RETURN;',
        'END IF;',
        'DELETE FROM public.shipping_boxes AS b',
      ].join('\n'),
    );
    expect(guarda).toBeGreaterThan(0);
    // O bloco da conferência é o último do arquivo e fecha depois do DELETE.
    expect(codigo.endsWith('AND b.sort_order = s.sort_order;\nEND $$;')).toBe(true);
    // 1 DELETE só: o que está dentro do bloco.
    expect(codigo.match(/DELETE FROM/g)).toHaveLength(1);
  });
});
