// Contrato do rollback que scripts/freight/seed-shipping-boxes.mjs gera para o seed das caixas, e dos
// dois arquivos commitados (migration e rollback), que têm de ser a saída do gerador sem retoque.
//
// O comportamento em banco foi provado em PostgreSQL 16 local com os mesmos arquivos (caixa igual
// cadastrada antes do seed fica; aplicar → desfazer duas vezes no mesmo dia deixa dois backups). Aqui
// não há banco: os testes prendem o texto que carrega cada correção.
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import {
  gerarRollbackSql,
  gerarSql,
  parseCsv,
  validarCaixas,
} from '../../scripts/freight/seed-shipping-boxes.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const ler = (caminho) => readFileSync(join(ROOT, caminho), 'utf8');
const CAIXAS_REAIS = validarCaixas(parseCsv(ler('scripts/freight/caixas.csv')));
const VERSION = '20261120090000';
const MIGRATION = '20261120090000_seed_shipping_boxes';

// A caixa P já validada (retorno de validarCaixas): 27 × 33 × 33 cm, parede 3 mm, 10 kg = 10000 g.
const P_VALIDADA = {
  code: 'P',
  name: 'Caixa P',
  outer_height_cm: '27.00',
  outer_width_cm: '33.00',
  outer_length_cm: '33.00',
  wall_thickness_mm: 3,
  empty_weight_g: 0,
  max_weight_g: 10000,
  fill_factor: '0.90',
  is_active: true,
  sort_order: 1,
};

describe('gerarRollbackSql', () => {
  const rollback = gerarRollbackSql([P_VALIDADA], { version: VERSION, migration: MIGRATION });
  const bloco = rollback.slice(rollback.indexOf('DO $seed$'));

  // O id é o da conta em seed-shipping-boxes.test.mjs: sha256("shipping_boxes:P") começa com
  // 1a43b67a2bea056c2ae0268d914f9d21; o 13º dígito vira 8 e o 17º (2 = 0010) vira a (1010).
  it('bloco da caixa P, escrito à mão: backup no primeiro nome livre, trava, conferência e DELETE', () => {
    expect(bloco).toBe(
      [
        'DO $seed$',
        'DECLARE',
        "  dia text := '_backup_shipping_boxes_' || to_char(now() AT TIME ZONE 'UTC', 'YYYYMMDD');",
        '  b text := dia;',
        '  n integer := 1;',
        '  linhas_tabela bigint;',
        '  linhas_backup bigint;',
        '  apagadas bigint;',
        'BEGIN',
        "  IF to_regclass('public.shipping_boxes') IS NULL THEN",
        "    RAISE NOTICE 'public.shipping_boxes não existe: nada a desfazer.';",
        '    RETURN;',
        '  END IF;',
        '',
        '  -- Primeiro nome livre do dia: _YYYYMMDD, depois _YYYYMMDD_2, _3, ...',
        "  WHILE to_regclass('public.' || b) IS NOT NULL LOOP",
        '    n := n + 1;',
        "    b := dia || '_' || n;",
        '  END LOOP;',
        '',
        '  -- Ninguém grava entre a cópia e o DELETE; a leitura continua liberada.',
        '  LOCK TABLE public.shipping_boxes IN SHARE ROW EXCLUSIVE MODE;',
        '',
        "  EXECUTE format('CREATE TABLE public.%I AS TABLE public.shipping_boxes', b);",
        "  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', b);",
        "  EXECUTE format('REVOKE ALL ON public.%I FROM anon, authenticated', b);",
        '',
        '  SELECT count(*) INTO linhas_tabela FROM public.shipping_boxes;',
        "  EXECUTE format('SELECT count(*) FROM public.%I', b) INTO linhas_backup;",
        '  IF linhas_backup IS DISTINCT FROM linhas_tabela THEN',
        '    RAISE EXCEPTION',
        "      'Rollback recusado: o backup public.% ficou com % linha(s) e public.shipping_boxes tem %. Nada foi apagado.',",
        '      b, linhas_backup, linhas_tabela;',
        '  END IF;',
        '',
        '  DELETE FROM public.shipping_boxes AS c',
        '   USING (VALUES',
        "      ('1a43b67a-2bea-856c-aae0-268d914f9d21', 'P', 'Caixa P', 27.00, 33.00, 33.00, 3, 0, 10000, 0.90, true, 1)",
        '   ) AS s (id, code, name, outer_height_cm, outer_width_cm, outer_length_cm,',
        '           wall_thickness_mm, empty_weight_g, max_weight_g, fill_factor,',
        '           is_active, sort_order)',
        '   WHERE c.id = s.id::uuid',
        '     AND c.deleted_at IS NULL',
        '     AND c.code = s.code',
        '     AND c.name = s.name',
        '     AND c.outer_height_cm = s.outer_height_cm',
        '     AND c.outer_width_cm = s.outer_width_cm',
        '     AND c.outer_length_cm = s.outer_length_cm',
        '     AND c.wall_thickness_mm = s.wall_thickness_mm',
        '     AND c.empty_weight_g = s.empty_weight_g',
        '     AND c.max_weight_g = s.max_weight_g',
        '     AND c.fill_factor = s.fill_factor',
        '     AND c.is_active = s.is_active',
        '     AND c.sort_order = s.sort_order;',
        '  GET DIAGNOSTICS apagadas = ROW_COUNT;',
        "  RAISE NOTICE '% caixa(s) do seed apagada(s). Backup em public.% (% linha(s)).', apagadas, b, linhas_backup;",
        'END $seed$;',
        '',
      ].join('\n'),
    );
  });

  it('cabeçalho: a primeira linha nomeia a migration e tudo antes do bloco é comentário', () => {
    const cabecalho = rollback.slice(0, rollback.indexOf('DO $seed$')).trimEnd().split('\n');
    expect(cabecalho[0]).toBe('-- Rollback: 20261120090000_seed_shipping_boxes');
    expect(cabecalho.every((linha) => linha.startsWith('--'))).toBe(true);
    // A nota da diferença feita à mão saiu: o guard de existência agora é do gerador.
    expect(rollback).not.toMatch(/À MÃO|feita à mão/);
  });

  it('é um bloco só: um DELETE, uma cópia e nada fora da transação do bloco', () => {
    // 1 abertura + 1 fechamento do bloco = 2 marcas $seed$.
    expect(rollback.match(/\$seed\$/g)).toHaveLength(2);
    expect(rollback.match(/DELETE FROM/g)).toHaveLength(1);
    expect(rollback.match(/CREATE TABLE/g)).toHaveLength(1);
    expect(rollback).not.toMatch(/^\s*(?:BEGIN;|COMMIT|ROLLBACK;)/im);
  });

  it('as 4 caixas reais entram no DELETE com os mesmos ids e valores do INSERT da migration', () => {
    const tuplas = (sql) =>
      sql.split('\n').filter((linha) => /^\s+\('[0-9a-f-]{36}', /.test(linha));
    const limpar = (linha) => linha.trim().replace(/,$/, '');
    const doRollback = tuplas(gerarRollbackSql(CAIXAS_REAIS, { version: VERSION })).map(limpar);
    // 4 linhas no CSV (P, M, G, GG) → 4 tuplas em cada arquivo.
    expect(doRollback).toHaveLength(4);
    expect(doRollback).toEqual(tuplas(gerarSql(CAIXAS_REAIS, { version: VERSION })).map(limpar));
  });

  it('aceita nome com $$ e recusa o que fecharia o bloco antes da hora', () => {
    const comCifroes = gerarRollbackSql([{ ...P_VALIDADA, name: 'Caixa $$ P' }], {
      version: VERSION,
    });
    expect(comCifroes).toContain("', 'P', 'Caixa $$ P', 27.00,");
    expect(comCifroes.match(/\$seed\$/g)).toHaveLength(2);
    expect(() =>
      gerarRollbackSql([{ ...P_VALIDADA, name: 'x $seed$; DROP TABLE y; --' }], {
        version: VERSION,
      }),
    ).toThrow('caixa P: o nome não pode conter $seed$');
  });
});

describe('arquivos commitados da 20261120030100', () => {
  it('migration e rollback são a saída do gerador para o CSV real, byte a byte', () => {
    expect(ler('supabase/migrations/20261120030100_seed_shipping_boxes.sql')).toBe(
      gerarSql(CAIXAS_REAIS, { version: '20261120030100' }),
    );
    expect(ler('supabase/rollbacks/20261120030100_rollback.sql')).toBe(
      gerarRollbackSql(CAIXAS_REAIS, {
        version: '20261120030100',
        migration: '20261120030100_seed_shipping_boxes',
      }),
    );
  });
});
