import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const VERSION = '20261120041000';
const read = (relative: string): string => readFileSync(resolve(process.cwd(), relative), 'utf8');

const migration = read(`supabase/migrations/${VERSION}_production_lead_time_calendar.sql`);
const rollback = read(`supabase/rollbacks/${VERSION}_rollback.sql`);

// Feriados nacionais esperados. Móveis a partir da Páscoa (Meeus/Gauss):
// 2026 = 05/04 → Carnaval -48 = 16/02 e -47 = 17/02; Sexta-feira Santa -2 = 03/04; Corpus Christi +60 = 04/06.
// 2027 = 28/03 → Carnaval 08/02 e 09/02; Sexta-feira Santa 26/03; Corpus Christi 27/05.
const FIXED_2026_2027 = [
  ['01-01', 'Confraternização Universal'],
  ['04-21', 'Tiradentes'],
  ['05-01', 'Dia do Trabalho'],
  ['09-07', 'Independência do Brasil'],
  ['10-12', 'Nossa Senhora Aparecida'],
  ['11-02', 'Finados'],
  ['11-15', 'Proclamação da República'],
  ['11-20', 'Consciência Negra'],
  ['12-25', 'Natal'],
] as const;

const MOVABLE = [
  ['2026-02-16', 'Carnaval (segunda-feira)'],
  ['2026-02-17', 'Carnaval (terça-feira)'],
  ['2026-04-03', 'Sexta-feira Santa'],
  ['2026-06-04', 'Corpus Christi'],
  ['2027-02-08', 'Carnaval (segunda-feira)'],
  ['2027-02-09', 'Carnaval (terça-feira)'],
  ['2027-03-26', 'Sexta-feira Santa'],
  ['2027-05-27', 'Corpus Christi'],
] as const;

const EXPECTED: ReadonlyArray<readonly [string, string]> = [
  ...[2026, 2027].flatMap((year) =>
    FIXED_2026_2027.map(([md, name]) => [`${year}-${md}`, name] as const),
  ),
  ...MOVABLE,
];

const seedRows = [...migration.matchAll(/^\s+\('(\d{4}-\d{2}-\d{2})', '([^']+)'\),?$/gm)].map(
  (m) => [m[1], m[2]] as const,
);

describe('migration do calendário de prazo de produção', () => {
  it('começa apontando para o rollback', () => {
    expect(migration.split('\n')[0]).toBe(
      `-- Rollback: supabase/rollbacks/${VERSION}_rollback.sql`,
    );
  });

  it('semeia 26 feriados: 2 anos x (9 fixos + 4 móveis)', () => {
    expect(seedRows).toHaveLength(26);
    expect(new Set(seedRows.map(([day]) => day)).size).toBe(26);
  });

  it.each(EXPECTED)('semeia %s (%s)', (day, name) => {
    expect(seedRows).toContainEqual([day, name]);
  });

  it('o seed é idempotente', () => {
    expect(migration).toContain('ON CONFLICT (day) DO NOTHING');
  });

  it('cria a coluna production_days com CHECK nomeado de 0 a 365', () => {
    expect(migration).toContain('ADD COLUMN IF NOT EXISTS production_days integer');
    expect(migration).toContain('print_area_techniques_production_days_check');
    expect(migration).toContain(
      'CHECK (production_days IS NULL OR (production_days >= 0 AND production_days <= 365))',
    );
  });

  it('valida a descrição do feriado: não vazia e até 120 caracteres', () => {
    expect(migration).toContain("CHECK (description ~ '\\S' AND length(description) <= 120)");
  });

  it('declara as tabelas sem soft delete com a justificativa do gate', () => {
    expect(migration).toMatch(
      /-- soft-delete-exempt: .+\nCREATE TABLE IF NOT EXISTS public\.business_calendar/,
    );
  });

  it('liga RLS e cria as quatro policies no padrão de shipping_boxes', () => {
    expect(migration).toContain('ALTER TABLE public.business_calendar ENABLE ROW LEVEL SECURITY');
    expect(migration).toMatch(/business_calendar_select_authenticated[\s\S]*?USING \(true\)/);
    expect(migration).toMatch(
      /business_calendar_insert_admin[\s\S]*?WITH CHECK \(public\.is_admin\(\)\)/,
    );
    expect(migration).toMatch(
      /business_calendar_update_admin[\s\S]*?USING \(public\.is_admin\(\)\)\s+WITH CHECK \(public\.is_admin\(\)\)/,
    );
    expect(migration).toMatch(
      /business_calendar_delete_admin[\s\S]*?USING \(public\.is_admin\(\)\)/,
    );
  });

  it('tira o acesso de PUBLIC e anon e concede o mínimo', () => {
    expect(migration).toContain(
      'REVOKE ALL ON public.business_calendar FROM PUBLIC, anon, authenticated;',
    );
    expect(migration).toContain(
      'GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_calendar TO authenticated;',
    );
    expect(migration).toContain(
      'GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_calendar TO service_role;',
    );
    expect(migration).not.toMatch(/GRANT[^;]*business_calendar[^;]*\b(anon|PUBLIC)\b/);
  });

  it('comenta products.lead_time_days como prazo do fornecedor', () => {
    expect(migration).toContain('COMMENT ON COLUMN public.products.lead_time_days IS');
    expect(migration).toContain('Prazo de liberação do fornecedor em dias úteis.');
  });
});

describe('rollback do calendário de prazo de produção', () => {
  it('guarda as duas tabelas em backup com RLS e sem acesso, antes de remover', () => {
    expect(rollback).toContain("'_backup_business_calendar_'");
    expect(rollback).toContain("'_backup_print_area_techniques_production_days_'");
    expect(rollback).toContain('ENABLE ROW LEVEL SECURITY');
    expect(rollback).toContain('REVOKE ALL ON public.%I FROM PUBLIC, anon, authenticated');
    // Trava total antes de cada cópia: UPDATE concorrente não fica fora do backup.
    expect(rollback).toContain('LOCK TABLE public.business_calendar IN ACCESS EXCLUSIVE MODE;');
    expect(rollback).toContain('LOCK TABLE public.print_area_techniques IN ACCESS EXCLUSIVE MODE;');
    expect(rollback.indexOf('LOCK TABLE public.business_calendar')).toBeLessThan(
      rollback.indexOf('AS TABLE public.business_calendar'),
    );
    expect(rollback.indexOf('CREATE TABLE public.%I AS')).toBeLessThan(
      rollback.indexOf('DROP TABLE public.business_calendar'),
    );
  });

  it('usa o primeiro nome de backup livre e confere a contagem antes do DROP', () => {
    expect(rollback).toContain('WHILE to_regclass');
    expect(rollback).toContain('IF esperadas <> copiadas THEN');
    expect(rollback).toContain('RAISE EXCEPTION');
    expect(rollback.indexOf('IF esperadas <> copiadas THEN')).toBeLessThan(
      rollback.indexOf('DROP COLUMN production_days'),
    );
  });

  it('remove tabela, constraint e coluna e devolve o comentário anterior', () => {
    expect(rollback).toContain('DROP TABLE public.business_calendar');
    expect(rollback).toContain(
      'DROP CONSTRAINT IF EXISTS print_area_techniques_production_days_check',
    );
    expect(rollback).toContain('DROP COLUMN production_days');
    expect(rollback).toContain(
      'Prazo de produção em dias úteis. 82% preenchido (NULL=herda fornecedor). Valores: 2 ou 3.',
    );
  });
});
