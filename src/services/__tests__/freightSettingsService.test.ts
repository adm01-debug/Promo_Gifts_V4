/**
 * freightSettingsService — contrato com `public.freight_settings` (linha única).
 *
 * O cliente Supabase é trocado por um builder que grava cada chamada (`ops`),
 * então o teste confere o que seria enviado ao PostgREST. O detector de RLS
 * (`isRlsDenialError`) é o real.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

type Result = { data: unknown; error: unknown };
interface Call {
  table: string;
  ops: Array<[string, unknown[]]>;
}

const h = vi.hoisted(() => ({
  calls: [] as Call[],
  responder: ((_c: Call): Result => ({ data: [], error: null })) as (c: Call) => Result,
  loggerError: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => {
  function builder(table: string) {
    const call: Call = { table, ops: [] };
    h.calls.push(call);
    const proxy: Record<string, unknown> = {};
    for (const m of ['select', 'insert', 'update', 'delete', 'upsert', 'eq', 'maybeSingle']) {
      proxy[m] = (...args: unknown[]) => {
        call.ops.push([m, args]);
        return proxy;
      };
    }
    proxy.then = (resolve: (r: Result) => unknown, reject: (e: unknown) => unknown) =>
      Promise.resolve(h.responder(call)).then(resolve, reject);
    return proxy;
  }
  return { supabase: { from: (t: string) => builder(t) } };
});

vi.mock('@/lib/logger', () => ({ logger: { error: h.loggerError } }));

import {
  FreightSettingsError,
  freightSettingsService,
  type FreightSettingsRow,
  type FreightSettingsWrite,
} from '@/services/freightSettingsService';

const opNames = (c: Call) => c.ops.map(([m]) => m);
const argsOf = (c: Call, op: string) => c.ops.filter(([m]) => m === op).map(([, args]) => args);
const firstArg = (c: Call, op: string) => argsOf(c, op)[0]?.[0];
/** O payload como vai no corpo da requisição: JSON descarta campo `undefined`. */
const sentPayload = (c: Call, op: string): unknown => JSON.parse(JSON.stringify(firstArg(c, op)));

const pgError = (code: string, message: string) => ({ code, message, details: '', hint: '' });

/** A linha como nasce na migration, com os padrões confirmados pelo dono. */
const LINHA: FreightSettingsRow = {
  id: true,
  origin_cep: '03377-000',
  cubic_divisor_correios: 6000,
  cubic_divisor_rodoviario: 3333,
  default_fill_factor: 0.9,
  internal_buffer_days: 0,
  multi_personalization_rule: 'max',
  updated_at: '2026-11-19T21:31:00Z',
  updated_by: null,
};

const TODOS_OS_CAMPOS: FreightSettingsWrite = {
  origin_cep: '01310-100',
  cubic_divisor_correios: 5000,
  cubic_divisor_rodoviario: 3000,
  default_fill_factor: 0.85,
  internal_buffer_days: 2,
  multi_personalization_rule: 'sum',
};

async function capture(promise: Promise<unknown>): Promise<FreightSettingsError> {
  const outcome = await promise.then(
    () => null,
    (err: unknown) => err,
  );
  expect(outcome).toBeInstanceOf(FreightSettingsError);
  return outcome as FreightSettingsError;
}

beforeEach(() => {
  h.calls = [];
  h.responder = () => ({ data: [{ id: true }], error: null });
  h.loggerError.mockClear();
});

describe('freightSettingsService.get', () => {
  it('lê a linha única pelo id = true', async () => {
    h.responder = () => ({ data: LINHA, error: null });
    const row = await freightSettingsService.get();

    expect(row).toEqual(LINHA);
    expect(h.calls).toHaveLength(1);
    expect(h.calls[0].table).toBe('freight_settings');
    expect(opNames(h.calls[0])).toEqual(['select', 'eq', 'maybeSingle']);
    expect(argsOf(h.calls[0], 'select')).toEqual([['*']]);
    expect(argsOf(h.calls[0], 'eq')).toEqual([['id', true]]);
  });

  it('devolve null quando a linha não está visível', async () => {
    h.responder = () => ({ data: null, error: null });
    expect(await freightSettingsService.get()).toBeNull();
  });

  it('erro do banco vira mensagem amigável, sem texto técnico', async () => {
    const original = pgError('57014', 'canceling statement due to timeout');
    h.responder = () => ({ data: null, error: original });
    const err = await capture(freightSettingsService.get());

    expect(err.reason).toBe('unknown');
    expect(err.message).toBe('Não foi possível carregar os parâmetros de frete.');
    expect(err.cause).toBe(original);
    expect(h.loggerError).toHaveBeenCalledTimes(1);
  });
});

describe('freightSettingsService.update', () => {
  it('faz UPDATE em id = true, grava updated_by e pede o id de volta', async () => {
    await freightSettingsService.update(TODOS_OS_CAMPOS, 'user-1');

    expect(h.calls).toHaveLength(1);
    expect(h.calls[0].table).toBe('freight_settings');
    expect(opNames(h.calls[0])).toEqual(['update', 'eq', 'select']);
    expect(sentPayload(h.calls[0], 'update')).toEqual({ ...TODOS_OS_CAMPOS, updated_by: 'user-1' });
    expect(argsOf(h.calls[0], 'eq')).toEqual([['id', true]]);
    expect(argsOf(h.calls[0], 'select')).toEqual([['id']]);
  });

  it('envia só o que mudou, mais updated_by', async () => {
    await freightSettingsService.update({ cubic_divisor_correios: 5000 }, 'user-2');

    expect(sentPayload(h.calls[0], 'update')).toEqual({
      cubic_divisor_correios: 5000,
      updated_by: 'user-2',
    });
  });

  it.each(['id', 'updated_at'])(
    'o payload não tem a chave %s, mesmo recebendo a linha inteira',
    async (campo) => {
      await freightSettingsService.update(
        { ...LINHA, multi_personalization_rule: 'max' },
        'user-1',
      );
      expect(firstArg(h.calls[0], 'update')).not.toHaveProperty(campo);
    },
  );

  it('nunca usa upsert, insert nem delete', async () => {
    await freightSettingsService.update(TODOS_OS_CAMPOS, 'user-1');

    expect(opNames(h.calls[0])).not.toContain('upsert');
    expect(opNames(h.calls[0])).not.toContain('insert');
    expect(opNames(h.calls[0])).not.toContain('delete');
  });

  it.each([
    ['lista vazia', []],
    ['data nula', null],
  ])('0 linhas sem erro (%s) vira permission: a RLS nega em silêncio', async (_caso, data) => {
    h.responder = () => ({ data, error: null });
    const err = await capture(freightSettingsService.update(TODOS_OS_CAMPOS, 'user-1'));

    expect(err.reason).toBe('permission');
    expect(err.message).toBe(
      'Sem permissão para alterar os parâmetros de frete. Apenas administradores podem salvar.',
    );
  });

  it('42501 (RLS com erro) vira permission', async () => {
    h.responder = () => ({
      data: null,
      error: pgError(
        '42501',
        'new row violates row-level security policy for table "freight_settings"',
      ),
    });
    const err = await capture(freightSettingsService.update(TODOS_OS_CAMPOS, 'user-1'));

    expect(err.reason).toBe('permission');
    expect(err.message).not.toContain('row-level');
  });

  it('23514 (CHECK violado) vira invalid', async () => {
    h.responder = () => ({
      data: null,
      error: pgError(
        '23514',
        'new row for relation "freight_settings" violates check constraint "freight_settings_origin_cep_check"',
      ),
    });
    const err = await capture(freightSettingsService.update({ origin_cep: '0331000' }, 'user-1'));

    expect(err.reason).toBe('invalid');
    expect(err.message).toContain('Parâmetros fora do permitido');
    expect(err.message).not.toContain('freight_settings');
    expect(h.loggerError).not.toHaveBeenCalled();
  });

  it('erro genérico vira unknown, guarda a causa e registra no log', async () => {
    const original = pgError('08006', 'connection failure on host db.internal');
    h.responder = () => ({ data: null, error: original });
    const err = await capture(freightSettingsService.update(TODOS_OS_CAMPOS, 'user-1'));

    expect(err.reason).toBe('unknown');
    expect(err.message).toBe('Não foi possível salvar os parâmetros de frete. Tente novamente.');
    expect(err.cause).toBe(original);
    expect(h.loggerError).toHaveBeenCalledTimes(1);
  });
});
