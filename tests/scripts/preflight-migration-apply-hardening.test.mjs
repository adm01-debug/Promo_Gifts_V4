/**
 * Regressão dos falsos negativos/positivos do preflight (E063/E066/E067) reproduzidos na revisão.
 */
import { describe, expect, it } from 'vitest';
import {
  detectBlockingDdl,
  detectExtensionWithoutSchema,
  detectSecurityDefinerWithoutPgTemp,
} from '../../scripts/preflight-migration-apply.mjs';

describe('E063 detectBlockingDdl', () => {
  it.each([
    ['begin;\nselect 1;\ncommit;'],
    ['BEGIN TRANSACTION;\nselect 1;'],
    ['select 1;\nabort;'],
    ['START TRANSACTION ISOLATION LEVEL SERIALIZABLE;'],
    ['VACUUM ANALYZE public.t;'],
    ['ALTER SYSTEM SET work_mem = \'1GB\';'],
  ])('bloqueia %#', (sql) => {
    expect(detectBlockingDdl(sql).length).toBeGreaterThan(0);
  });

  it('VACUUM/ALTER SYSTEM bloqueiam mesmo com opt-out transaction: none', () => {
    expect(detectBlockingDdl('VACUUM public.t;', { hasTransactionNoneOptOut: true }).length).toBe(1);
  });

  it.each([
    ['create function f() returns void language plpgsql as $$\nbegin\n  perform 1;\nend;\n$$;'],
    ['-- VACUUM aqui é só comentário\nselect 1;'],
    ['create table t(x int);'],
  ])('não bloqueia SQL legítimo %#', (sql) => {
    expect(detectBlockingDdl(sql)).toEqual([]);
  });
});

describe('E066 detectSecurityDefinerWithoutPgTemp', () => {
  it('pega SECURITY DEFINER escrito DEPOIS do corpo, sem search_path', () => {
    const sql = `create or replace function public.f() returns void as $$ begin perform 1; perform 2; end; $$ language plpgsql security definer;`;
    expect(detectSecurityDefinerWithoutPgTemp(sql)).toEqual(['public.f']);
  });

  it('pega SECURITY DEFINER antes do corpo (comportamento anterior)', () => {
    const sql = `create function public.g() returns void language plpgsql security definer as $$ begin null; end; $$;`;
    expect(detectSecurityDefinerWithoutPgTemp(sql)).toEqual(['public.g']);
  });

  it('aceita search_path com pg_temp, antes ou depois do corpo', () => {
    const before = `create function public.h() returns void language plpgsql security definer set search_path = public, pg_temp as $$ begin null; end; $$;`;
    const after = `create function public.i() returns void as $$ begin null; end; $$ language plpgsql security definer set search_path = public, pg_temp;`;
    expect(detectSecurityDefinerWithoutPgTemp(before)).toEqual([]);
    expect(detectSecurityDefinerWithoutPgTemp(after)).toEqual([]);
  });

  it('search_path sem pg_temp continua reprovado', () => {
    const sql = `create function public.j() returns void as $$ begin null; end; $$ language plpgsql security definer set search_path = public;`;
    expect(detectSecurityDefinerWithoutPgTemp(sql)).toEqual(['public.j']);
  });

  it('função sem SECURITY DEFINER é ignorada, e o texto SECURITY DEFINER dentro do corpo não conta', () => {
    const sql = `create function public.k() returns void as $$ -- security definer\nbegin null; end; $$ language plpgsql;`;
    expect(detectSecurityDefinerWithoutPgTemp(sql)).toEqual([]);
  });
});

describe('E067 detectExtensionWithoutSchema', () => {
  it.each([
    ['CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;'],
    ['create extension pg_trgm with schema extensions;'],
    ['CREATE EXTENSION IF NOT EXISTS "pg_trgm" WITH SCHEMA "extensions";'],
    ['CREATE EXTENSION IF NOT EXISTS pgcrypto\n  WITH SCHEMA extensions\n  VERSION \'1.3\';'],
  ])('aceita a forma correta %#', (sql) => {
    expect(detectExtensionWithoutSchema(sql)).toEqual([]);
  });

  it.each([
    ['CREATE EXTENSION IF NOT EXISTS pg_trgm;', 'pg_trgm'],
    ['CREATE EXTENSION "unaccent";', 'unaccent'],
    ['CREATE EXTENSION pg_trgm WITH SCHEMA public;', 'pg_trgm'],
  ])('reprova sem schema extensions %#', (sql, name) => {
    expect(detectExtensionWithoutSchema(sql)).toEqual([name]);
  });
});
