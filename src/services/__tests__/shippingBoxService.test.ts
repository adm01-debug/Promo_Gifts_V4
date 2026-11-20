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

const h = vi.hoisted(() => {
  const calls: Call[] = [];
  const responder: (c: Call) => Result = () => ({ data: [], error: null });
  return { calls, responder, loggerError: vi.fn() };
});

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

const pgError = (code: string, message: string, details: string | null = '') => ({
  code,
  message,
  details,
  hint: '',
});

/**
 * O 23505 como o banco responde a um admin, com a RLS ligada: `details` vem
 * NULO. O `Key (code)=(G) already exists.` só aparece para quem ignora a RLS.
 */
const duplicadoSobRls = () =>
  pgError(
    '23505',
    'duplicate key value violates unique constraint "shipping_boxes_code_unique_active"',
    null,
  );

const NADA_ALTERADO =
  'Nada foi alterado: a caixa foi modificada por outra pessoa ou você não tem permissão. A lista foi atualizada; abra a caixa de novo.';

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
  if (!(outcome instanceof ShippingBoxError)) {
    throw new Error(`esperava ShippingBoxError, veio ${String(outcome)}`);
  }
  return outcome;
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
  it('update: envia só o que mudou, só em caixa viva com aquele id, e pede o id de volta', async () => {
    await shippingBoxService.update('box-p', { is_active: false });

    expect(h.calls[0].table).toBe('shipping_boxes');
    expect(opNames(h.calls[0])).toEqual(['update', 'eq', 'is', 'select']);
    expect(sentPayload(h.calls[0], 'update')).toEqual({ is_active: false });
    expect(argsOf(h.calls[0], 'eq')).toEqual([['id', 'box-p']]);
    expect(argsOf(h.calls[0], 'is')).toEqual([['deleted_at', null]]);
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

    // Só em caixa viva: excluir de novo não regrava a data da primeira exclusão.
    expect(opNames(h.calls[0])).toEqual(['update', 'eq', 'is', 'select']);
    expect(firstArg(h.calls[0], 'update')).toEqual({ deleted_at: '2026-11-19T23:05:00.000Z' });
    expect(argsOf(h.calls[0], 'eq')).toEqual([['id', 'box-p']]);
    expect(argsOf(h.calls[0], 'is')).toEqual([['deleted_at', null]]);
    expect(argsOf(h.calls[0], 'select')).toEqual([['id']]);
  });

  it('restore: limpa deleted_at, só em caixa excluída', async () => {
    await shippingBoxService.restore('box-p', 'P');

    expect(opNames(h.calls[0])).toEqual(['update', 'eq', 'not', 'select']);
    expect(firstArg(h.calls[0], 'update')).toEqual({ deleted_at: null });
    expect(argsOf(h.calls[0], 'eq')).toEqual([['id', 'box-p']]);
    expect(argsOf(h.calls[0], 'not')).toEqual([['deleted_at', 'is', null]]);
    expect(argsOf(h.calls[0], 'select')).toEqual([['id']]);
  });
});

/** As quatro escritas, para os casos de erro que valem para todas. */
const ESCRITAS = [
  ['create', () => shippingBoxService.create(CAIXA_P)],
  ['update', () => shippingBoxService.update('box-p', { code: 'P' })],
  ['softDelete', () => shippingBoxService.softDelete('box-p')],
  ['restore', () => shippingBoxService.restore('box-p', 'P')],
] as const;

/** As três que alteram uma caixa que já existe. */
const ALTERACOES = ESCRITAS.filter(([nome]) => nome !== 'create');

describe('shippingBoxService — erros de escrita', () => {
  it.each([
    ['create', () => shippingBoxService.create({ ...CAIXA_P, code: 'G' })],
    ['update de code', () => shippingBoxService.update('box-p', { code: 'G' })],
    ['restore', () => shippingBoxService.restore('box-g-antiga', 'G')],
  ] as const)(
    '%s: 23505 como o banco responde sob RLS (details nulo) cita o código informado',
    async (_nome, escrever) => {
      h.responder = () => ({ data: null, error: duplicadoSobRls() });
      const err = await capture(escrever());

      expect(err.reason).toBe('duplicate_code');
      expect(err.message).toBe(
        'Já existe uma caixa com o código G. Caixas inativas também contam.',
      );
      expect(h.loggerError).not.toHaveBeenCalled();
    },
  );

  it('23505 com details (quem ignora a RLS): vale o código que o banco apontou', async () => {
    h.responder = () => ({
      data: null,
      error: pgError('23505', 'duplicate key value', 'Key (code)=(GG) already exists.'),
    });
    const err = await capture(shippingBoxService.restore('box-g-antiga', 'G'));

    expect(err.message).toBe('Já existe uma caixa com o código GG. Caixas inativas também contam.');
  });

  it('23505 em update que não troca o código: mensagem sem inventar o código', async () => {
    h.responder = () => ({ data: null, error: duplicadoSobRls() });
    const err = await capture(shippingBoxService.update('box-p', { name: 'Caixa P2' }));

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
    // Limites novos do banco: medida externa de 0,01 a 300 cm e peso máximo até 100 kg.
    expect(err.message).toContain('0,01 a 300 cm');
    expect(err.message).toContain('até 100 kg');
    expect(err.message).not.toContain('shipping_boxes');
  });

  it('create: 0 linhas sem erro vira permission', async () => {
    h.responder = () => ({ data: [], error: null });
    const err = await capture(shippingBoxService.create(CAIXA_P));

    expect(err.reason).toBe('permission');
    expect(err.message).toBe(
      'Sem permissão para alterar caixas de transporte. Apenas administradores podem salvar.',
    );
  });

  it.each(ALTERACOES)(
    '%s: 0 linhas sem erro (RLS em silêncio ou caixa mudada por outro admin) vira not_applied',
    async (_nome, escrever) => {
      h.responder = () => ({ data: [], error: null });
      const err = await capture(escrever());

      expect(err.reason).toBe('not_applied');
      expect(err.message).toBe(NADA_ALTERADO);
    },
  );

  it.each(ALTERACOES)('%s: data nula sem erro também vira not_applied', async (_nome, escrever) => {
    h.responder = () => ({ data: null, error: null });
    const err = await capture(escrever());

    expect(err.reason).toBe('not_applied');
    expect(err.message).toBe(NADA_ALTERADO);
  });

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
    ['restore', () => shippingBoxService.restore('box-p', 'P'), 'restaurar'],
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
