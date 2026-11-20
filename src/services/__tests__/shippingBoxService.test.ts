/**
 * shippingBoxService — contrato com `public.shipping_boxes`.
 *
 * O cliente Supabase é trocado por um builder que grava cada chamada
 * (`ops`), então o teste confere o que seria enviado ao PostgREST: filtros,
 * ordem e payload. O detector de RLS (`isRlsDenialError`) é o real.
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
    for (const m of [
      'select',
      'insert',
      'update',
      'delete',
      'upsert',
      'eq',
      'is',
      'not',
      'order',
    ]) {
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
  ShippingBoxError,
  shippingBoxService,
  type ShippingBoxRow,
  type ShippingBoxWrite,
} from '@/services/shippingBoxService';

const opNames = (c: Call) => c.ops.map(([m]) => m);
const argsOf = (c: Call, op: string) => c.ops.filter(([m]) => m === op).map(([, args]) => args);
const firstArg = (c: Call, op: string) => argsOf(c, op)[0]?.[0];
/** O payload como vai no corpo da requisição: JSON descarta campo `undefined`. */
const sentPayload = (c: Call, op: string): unknown => JSON.parse(JSON.stringify(firstArg(c, op)));

const pgError = (code: string, message: string, details = '') => ({
  code,
  message,
  details,
  hint: '',
});

/** Caixa P real: externa 27 × 33 × 33 cm, parede 3 mm, 10 kg. */
const CAIXA_P: ShippingBoxWrite = {
  code: 'P',
  name: 'Caixa P',
  outer_height_cm: 27,
  outer_width_cm: 33,
  outer_length_cm: 33,
  wall_thickness_mm: 3,
  empty_weight_g: 0,
  max_weight_g: 10000,
  fill_factor: 0.9,
  is_active: true,
  sort_order: 1,
};

/** A mesma caixa como o banco devolve. Internas: 27 − 0,6 = 26,4 e 33 − 0,6 = 32,4. */
const LINHA_P: ShippingBoxRow = {
  ...CAIXA_P,
  id: 'box-p',
  wall_thickness_mm: 3,
  empty_weight_g: 0,
  fill_factor: 0.9,
  is_active: true,
  sort_order: 1,
  inner_height_cm: 26.4,
  inner_width_cm: 32.4,
  inner_length_cm: 32.4,
  created_at: '2026-11-19T21:30:00Z',
  updated_at: '2026-11-19T21:30:00Z',
  deleted_at: null,
};

const CAMPOS_NAO_GRAVAVEIS = [
  'id',
  'inner_height_cm',
  'inner_width_cm',
  'inner_length_cm',
  'created_at',
  'updated_at',
  'deleted_at',
];

async function capture(promise: Promise<unknown>): Promise<ShippingBoxError> {
  const outcome = await promise.then(
    () => null,
    (err: unknown) => err,
  );
  expect(outcome).toBeInstanceOf(ShippingBoxError);
  return outcome as ShippingBoxError;
}

beforeEach(() => {
  h.calls = [];
  h.responder = () => ({ data: [{ id: 'box-p' }], error: null });
  h.loggerError.mockClear();
});

describe('shippingBoxService — listagens', () => {
  it('listActive: só vivas e ativas, por sort_order e code', async () => {
    h.responder = () => ({ data: [LINHA_P], error: null });
    const rows = await shippingBoxService.listActive();

    expect(rows).toEqual([LINHA_P]);
    expect(h.calls).toHaveLength(1);
    expect(h.calls[0].table).toBe('shipping_boxes');
    expect(opNames(h.calls[0])).toEqual(['select', 'is', 'eq', 'order', 'order']);
    expect(argsOf(h.calls[0], 'select')).toEqual([['*']]);
    expect(argsOf(h.calls[0], 'is')).toEqual([['deleted_at', null]]);
    expect(argsOf(h.calls[0], 'eq')).toEqual([['is_active', true]]);
    expect(argsOf(h.calls[0], 'order')).toEqual([
      ['sort_order', { ascending: true }],
      ['code', { ascending: true }],
    ]);
  });

  it('listAll: vivas, sem filtrar is_active', async () => {
    h.responder = () => ({ data: [LINHA_P], error: null });
    const rows = await shippingBoxService.listAll();

    expect(rows).toEqual([LINHA_P]);
    expect(h.calls[0].table).toBe('shipping_boxes');
    expect(opNames(h.calls[0])).toEqual(['select', 'is', 'order', 'order']);
    expect(argsOf(h.calls[0], 'is')).toEqual([['deleted_at', null]]);
    expect(argsOf(h.calls[0], 'order')).toEqual([
      ['sort_order', { ascending: true }],
      ['code', { ascending: true }],
    ]);
  });

  it('listDeleted: só excluídas, da mais recente para a mais antiga', async () => {
    const excluida = { ...LINHA_P, deleted_at: '2026-11-19T22:00:00Z' };
    h.responder = () => ({ data: [excluida], error: null });
    const rows = await shippingBoxService.listDeleted();

    expect(rows).toEqual([excluida]);
    expect(h.calls[0].table).toBe('shipping_boxes');
    expect(opNames(h.calls[0])).toEqual(['select', 'not', 'order', 'order']);
    expect(argsOf(h.calls[0], 'not')).toEqual([['deleted_at', 'is', null]]);
    expect(argsOf(h.calls[0], 'order')).toEqual([
      ['deleted_at', { ascending: false }],
      ['code', { ascending: true }],
    ]);
  });

  it.each([
    ['listActive', () => shippingBoxService.listActive()],
    ['listAll', () => shippingBoxService.listAll()],
    ['listDeleted', () => shippingBoxService.listDeleted()],
  ] as const)('%s: data nula vira lista vazia', async (_nome, listar) => {
    h.responder = () => ({ data: null, error: null });
    expect(await listar()).toEqual([]);
  });

  it.each([
    ['listActive', () => shippingBoxService.listActive()],
    ['listAll', () => shippingBoxService.listAll()],
    ['listDeleted', () => shippingBoxService.listDeleted()],
  ] as const)(
    '%s: erro do banco vira mensagem amigável, sem texto técnico',
    async (_nome, listar) => {
      h.responder = () => ({
        data: null,
        error: pgError('57014', 'canceling statement due to timeout'),
      });
      const err = await capture(listar());

      expect(err.reason).toBe('unknown');
      expect(err.message).toBe('Não foi possível carregar as caixas de transporte.');
      expect(h.loggerError).toHaveBeenCalledTimes(1);
    },
  );
});

describe('shippingBoxService — create', () => {
  it('insere os 11 campos graváveis, pede o id de volta e o devolve', async () => {
    h.responder = () => ({ data: [{ id: 'box-nova' }], error: null });
    const id = await shippingBoxService.create(CAIXA_P);

    expect(id).toBe('box-nova');
    expect(h.calls[0].table).toBe('shipping_boxes');
    expect(opNames(h.calls[0])).toEqual(['insert', 'select']);
    expect(sentPayload(h.calls[0], 'insert')).toEqual(CAIXA_P);
    expect(argsOf(h.calls[0], 'select')).toEqual([['id']]);
  });

  it('nunca envia inner_*_cm, id nem datas, mesmo recebendo a linha inteira', async () => {
    await shippingBoxService.create(LINHA_P);
    const payload = sentPayload(h.calls[0], 'insert');

    expect(payload).toEqual(CAIXA_P);
    expect(Object.keys(payload as object).sort()).toEqual(Object.keys(CAIXA_P).sort());
  });

  it.each(CAMPOS_NAO_GRAVAVEIS)('o payload de insert não tem a chave %s', async (campo) => {
    await shippingBoxService.create(LINHA_P);
    expect(firstArg(h.calls[0], 'insert')).not.toHaveProperty(campo);
  });

  it('campo opcional ausente não é enviado: vale o padrão do banco', async () => {
    await shippingBoxService.create({
      code: 'M',
      name: 'Caixa M',
      outer_height_cm: 33,
      outer_width_cm: 33,
      outer_length_cm: 47,
      max_weight_g: 20000,
    });

    expect(sentPayload(h.calls[0], 'insert')).toEqual({
      code: 'M',
      name: 'Caixa M',
      outer_height_cm: 33,
      outer_width_cm: 33,
      outer_length_cm: 47,
      max_weight_g: 20000,
    });
  });

  it('nunca usa upsert nem delete', async () => {
    await shippingBoxService.create(CAIXA_P);
    expect(opNames(h.calls[0])).not.toContain('upsert');
    expect(opNames(h.calls[0])).not.toContain('delete');
  });
});

describe('shippingBoxService — update, softDelete e restore', () => {
  it('update: envia só o que mudou, filtra pelo id e pede o id de volta', async () => {
    await shippingBoxService.update('box-p', { is_active: false });

    expect(h.calls[0].table).toBe('shipping_boxes');
    expect(opNames(h.calls[0])).toEqual(['update', 'eq', 'select']);
    expect(sentPayload(h.calls[0], 'update')).toEqual({ is_active: false });
    expect(argsOf(h.calls[0], 'eq')).toEqual([['id', 'box-p']]);
    expect(argsOf(h.calls[0], 'select')).toEqual([['id']]);
  });

  it.each(CAMPOS_NAO_GRAVAVEIS)('o payload de update não tem a chave %s', async (campo) => {
    await shippingBoxService.update('box-p', LINHA_P);
    expect(firstArg(h.calls[0], 'update')).not.toHaveProperty(campo);
  });

  it('softDelete: grava deleted_at com o instante atual, sem apagar a linha', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-19T23:05:00.000Z'));
    try {
      await shippingBoxService.softDelete('box-p');
    } finally {
      vi.useRealTimers();
    }

    expect(opNames(h.calls[0])).toEqual(['update', 'eq', 'select']);
    expect(firstArg(h.calls[0], 'update')).toEqual({ deleted_at: '2026-11-19T23:05:00.000Z' });
    expect(argsOf(h.calls[0], 'eq')).toEqual([['id', 'box-p']]);
    expect(argsOf(h.calls[0], 'select')).toEqual([['id']]);
  });

  it('restore: limpa deleted_at', async () => {
    await shippingBoxService.restore('box-p');

    expect(opNames(h.calls[0])).toEqual(['update', 'eq', 'select']);
    expect(firstArg(h.calls[0], 'update')).toEqual({ deleted_at: null });
    expect(argsOf(h.calls[0], 'eq')).toEqual([['id', 'box-p']]);
    expect(argsOf(h.calls[0], 'select')).toEqual([['id']]);
  });
});

/** As quatro escritas, para os casos de erro que valem para todas. */
const ESCRITAS = [
  ['create', () => shippingBoxService.create(CAIXA_P)],
  ['update', () => shippingBoxService.update('box-p', { code: 'P' })],
  ['softDelete', () => shippingBoxService.softDelete('box-p')],
  ['restore', () => shippingBoxService.restore('box-p')],
] as const;

describe('shippingBoxService — erros de escrita', () => {
  it.each([
    ['create', () => shippingBoxService.create(CAIXA_P)],
    ['update de code', () => shippingBoxService.update('box-g', { code: 'P' })],
    ['restore', () => shippingBoxService.restore('box-p')],
  ] as const)('%s: 23505 vira duplicate_code com o código que colidiu', async (_nome, escrever) => {
    h.responder = () => ({
      data: null,
      error: pgError(
        '23505',
        'duplicate key value violates unique constraint "shipping_boxes_code_unique_active"',
        'Key (code)=(P) already exists.',
      ),
    });
    const err = await capture(escrever());

    expect(err.reason).toBe('duplicate_code');
    expect(err.message).toBe('Já existe uma caixa com o código P. Caixas inativas também contam.');
    expect(h.loggerError).not.toHaveBeenCalled();
  });

  it('23505 sem details: create e update usam o código enviado', async () => {
    h.responder = () => ({ data: null, error: pgError('23505', 'duplicate key value') });

    const naCriacao = await capture(shippingBoxService.create({ ...CAIXA_P, code: 'GG' }));
    expect(naCriacao.message).toBe(
      'Já existe uma caixa com o código GG. Caixas inativas também contam.',
    );

    const naEdicao = await capture(shippingBoxService.update('box-p', { code: 'M' }));
    expect(naEdicao.message).toBe(
      'Já existe uma caixa com o código M. Caixas inativas também contam.',
    );
  });

  it('23505 sem details no restore: mensagem sem inventar o código', async () => {
    h.responder = () => ({ data: null, error: pgError('23505', 'duplicate key value') });
    const err = await capture(shippingBoxService.restore('box-p'));

    expect(err.reason).toBe('duplicate_code');
    expect(err.message).toBe('Já existe uma caixa com este código. Caixas inativas também contam.');
  });

  it.each(ESCRITAS)('%s: 23514 (CHECK violado) vira invalid', async (_nome, escrever) => {
    h.responder = () => ({
      data: null,
      error: pgError(
        '23514',
        'new row for relation "shipping_boxes" violates check constraint "shipping_boxes_inner_height_positive"',
      ),
    });
    const err = await capture(escrever());

    expect(err.reason).toBe('invalid');
    expect(err.message).toContain('Dados da caixa fora do permitido');
    expect(err.message).not.toContain('shipping_boxes');
  });

  it.each(ESCRITAS)(
    '%s: 0 linhas sem erro (RLS em silêncio) vira permission',
    async (_nome, escrever) => {
      h.responder = () => ({ data: [], error: null });
      const err = await capture(escrever());

      expect(err.reason).toBe('permission');
      expect(err.message).toBe(
        'Sem permissão para alterar caixas de transporte. Apenas administradores podem salvar.',
      );
    },
  );

  it.each(ESCRITAS)('%s: 42501 (RLS com erro) vira permission', async (_nome, escrever) => {
    h.responder = () => ({
      data: null,
      error: pgError(
        '42501',
        'new row violates row-level security policy for table "shipping_boxes"',
      ),
    });
    const err = await capture(escrever());

    expect(err.reason).toBe('permission');
    expect(err.message).not.toContain('row-level');
  });

  it.each([
    ['create', () => shippingBoxService.create(CAIXA_P), 'criar'],
    ['update', () => shippingBoxService.update('box-p', { name: 'Caixa P2' }), 'salvar'],
    ['softDelete', () => shippingBoxService.softDelete('box-p'), 'excluir'],
    ['restore', () => shippingBoxService.restore('box-p'), 'restaurar'],
  ] as const)(
    '%s: erro genérico vira unknown, guarda a causa e registra no log',
    async (_nome, escrever, verbo) => {
      const original = pgError('08006', 'connection failure on host db.internal');
      h.responder = () => ({ data: null, error: original });
      const err = await capture(escrever());

      expect(err.reason).toBe('unknown');
      expect(err.message).toBe(`Não foi possível ${verbo} a caixa de transporte. Tente novamente.`);
      expect(err.cause).toBe(original);
      expect(h.loggerError).toHaveBeenCalledTimes(1);
    },
  );
});
