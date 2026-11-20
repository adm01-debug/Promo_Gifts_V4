/**
 * businessCalendarService — contrato com `public.business_calendar`.
 * O cliente Supabase vira um builder que grava cada chamada; o teste confere
 * filtros, ordem e payload enviados ao PostgREST.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

type Result = { data: unknown; error: unknown };
interface Call {
  table: string;
  ops: Array<[string, unknown[]]>;
}

const h = vi.hoisted(() => {
  const state: {
    calls: Call[];
    responder: (c: Call) => Result;
    loggerError: ReturnType<typeof vi.fn>;
  } = {
    calls: [],
    responder: (_c: Call) => ({ data: [], error: null }),
    loggerError: vi.fn(),
  };
  return state;
});

vi.mock('@/integrations/supabase/client', () => {
  function builder(table: string) {
    const call: Call = { table, ops: [] };
    h.calls.push(call);
    const proxy: Record<string, unknown> = {};
    for (const m of ['select', 'insert', 'update', 'delete', 'eq', 'gte', 'lte', 'order']) {
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

import { BusinessCalendarError, businessCalendarService } from '@/services/businessCalendarService';

const argsOf = (c: Call, op: string) => c.ops.filter(([m]) => m === op).map(([, args]) => args);
const pgError = (code: string, message: string) => ({ code, message, details: null, hint: '' });

async function capture(promise: Promise<unknown>): Promise<unknown> {
  return promise.then(
    () => null,
    (err: unknown) => err,
  );
}

beforeEach(() => {
  h.calls = [];
  h.responder = () => ({ data: [{ day: '2026-11-20' }], error: null });
  h.loggerError.mockClear();
});

describe('leitura', () => {
  it('listByYear filtra de 01/01 a 31/12 do ano e ordena por data', async () => {
    h.responder = () => ({ data: [{ day: '2026-01-01', description: 'Ano Novo' }], error: null });
    const rows = await businessCalendarService.listByYear(2026);
    expect(rows).toHaveLength(1);
    const call = h.calls[0];
    expect(call.table).toBe('business_calendar');
    expect(argsOf(call, 'gte')[0]).toEqual(['day', '2026-01-01']);
    expect(argsOf(call, 'lte')[0]).toEqual(['day', '2026-12-31']);
    expect(argsOf(call, 'order')[0]).toEqual(['day', { ascending: true }]);
  });

  it('listAll não filtra por data', async () => {
    h.responder = () => ({ data: null, error: null });
    expect(await businessCalendarService.listAll()).toEqual([]);
    expect(argsOf(h.calls[0], 'gte')).toHaveLength(0);
  });

  it('erro de leitura vira mensagem PT-BR sem vazar a do banco', async () => {
    h.responder = () => ({ data: null, error: pgError('XX000', 'boom interno') });
    const err = await capture(businessCalendarService.listAll());
    expect(err).toBeInstanceOf(BusinessCalendarError);
    expect(err instanceof Error && err.message).toBe('Não foi possível carregar os feriados.');
    expect(h.loggerError).toHaveBeenCalledOnce();
  });
});

describe('escrita', () => {
  it('create envia só data e nome (sem espaços nas pontas)', async () => {
    await businessCalendarService.create({ day: '2026-12-24', description: '  Véspera  ' });
    expect(argsOf(h.calls[0], 'insert')[0]).toEqual([
      { day: '2026-12-24', description: 'Véspera' },
    ]);
  });

  it('create com data repetida (23505) diz a data em dd/mm/aaaa', async () => {
    h.responder = () => ({ data: null, error: pgError('23505', 'duplicate key') });
    const err = await capture(
      businessCalendarService.create({ day: '2026-12-24', description: 'X' }),
    );
    expect(err).toMatchObject({ reason: 'duplicate_day' });
    expect(err instanceof Error && err.message).toContain('24/12/2026');
  });

  it('create sem linha devolvida (RLS negou em silêncio) vira erro de permissão', async () => {
    h.responder = () => ({ data: [], error: null });
    const err = await capture(
      businessCalendarService.create({ day: '2026-12-24', description: 'X' }),
    );
    expect(err).toMatchObject({ reason: 'permission' });
  });

  it('nome fora do CHECK (23514) vira invalid', async () => {
    h.responder = () => ({ data: null, error: pgError('23514', 'check') });
    const err = await capture(businessCalendarService.updateDescription('2026-11-20', ' '));
    expect(err).toMatchObject({ reason: 'invalid' });
  });

  it('updateDescription filtra pela data e grava o nome aparado', async () => {
    await businessCalendarService.updateDescription('2026-11-20', ' Consciência Negra ');
    const call = h.calls[0];
    expect(argsOf(call, 'update')[0]).toEqual([{ description: 'Consciência Negra' }]);
    expect(argsOf(call, 'eq')[0]).toEqual(['day', '2026-11-20']);
  });

  it.each([
    ['updateDescription', () => businessCalendarService.updateDescription('2026-11-20', 'X')],
    ['remove', () => businessCalendarService.remove('2026-11-20')],
  ])('%s com 0 linhas afetadas vira not_applied', async (_nome, executar) => {
    h.responder = () => ({ data: [], error: null });
    expect(await capture(executar())).toMatchObject({ reason: 'not_applied' });
  });

  it('remove apaga pela data', async () => {
    await businessCalendarService.remove('2026-11-20');
    const call = h.calls[0];
    expect(argsOf(call, 'delete')).toHaveLength(1);
    expect(argsOf(call, 'eq')[0]).toEqual(['day', '2026-11-20']);
  });

  it('erro de permissão do banco (42501) vira permission', async () => {
    h.responder = () => ({ data: null, error: pgError('42501', 'permission denied') });
    const err = await capture(businessCalendarService.remove('2026-11-20'));
    expect(err).toMatchObject({ reason: 'permission' });
  });
});
