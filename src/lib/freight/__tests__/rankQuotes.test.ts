/**
 * rankQuotes.test.ts — ranking das opções de frete (etapa 85).
 *
 * Calendário usado: 2026-12-03 é quinta-feira. Chegada = pronto + dias úteis:
 *   +1 → sex 04/12 · +2 → seg 07/12 · +4 → qua 09/12 · +6 → sex 11/12.
 */
import { describe, expect, it } from 'vitest';

import type { QuoteOption } from '../quoteContract';
import { rankQuotes } from '../rankQuotes';

const PRONTO = '2026-12-03';

function opcao(id: string, preco: number, dias: number): QuoteOption {
  return {
    carrier: `Transp ${id}`,
    service: 'Rodoviário',
    price_brl: preco,
    transit_business_days: dias,
    option_id: id,
  };
}

const A = opcao('A', 180, 6); // chega 11/12
const B = opcao('B', 220, 4); // chega 09/12
const C = opcao('C', 340, 2); // chega 07/12
const D = opcao('D', 340, 1); // chega 04/12
const QUATRO = [A, B, C, D];

function ok(result: ReturnType<typeof rankQuotes>) {
  if (result.status !== 'ok') throw new Error(`esperava ok, veio ${result.message}`);
  return result;
}

describe('rankQuotes — as 4 opções do plano', () => {
  it('sem data pedida: mais barata A, mais rápida D, recomendada A, onTime nulo', () => {
    const r = ok(rankQuotes(QUATRO, { readyDate: PRONTO, holidays: [] }));

    expect(r.cheapest.option.option_id).toBe('A');
    expect(r.fastest.option.option_id).toBe('D');
    expect(r.recommended.option.option_id).toBe('A');
    expect(r.noneOnTime).toBe(false);
    // C e D empatam em R$ 340: D (1 dia) vem antes de C (2 dias).
    expect(r.ranked.map((q) => q.option.option_id)).toEqual(['A', 'B', 'D', 'C']);
    expect(r.ranked.map((q) => q.onTime)).toEqual([null, null, null, null]);
  });

  it.each([
    ['A', '2026-12-11'], // quinta + 6 úteis: sex, seg, ter, qua, qui, sex
    ['B', '2026-12-09'], // quinta + 4 úteis: sex, seg, ter, qua
    ['C', '2026-12-07'], // quinta + 2 úteis: sex, seg
    ['D', '2026-12-04'], // quinta + 1 útil: sex
  ])('chegada da opção %s é %s', (id, esperada) => {
    const r = ok(rankQuotes(QUATRO, { readyDate: PRONTO, holidays: [] }));
    expect(r.ranked.find((q) => q.option.option_id === id)?.arrivalDate).toBe(esperada);
  });

  it('data pedida 09/12: A atrasa; B, C e D chegam; recomendada = mais barata das que chegam (B)', () => {
    const r = ok(
      rankQuotes(QUATRO, { readyDate: PRONTO, requestedDate: '2026-12-09', holidays: [] }),
    );

    expect(r.ranked.map((q) => [q.option.option_id, q.onTime])).toEqual([
      ['A', false], // 11/12 > 09/12
      ['B', true], // 09/12 ≤ 09/12 (o dia pedido conta)
      ['D', true],
      ['C', true],
    ]);
    expect(r.recommended.option.option_id).toBe('B');
    expect(r.noneOnTime).toBe(false);
  });

  it('data pedida 03/12 (hoje): nenhuma chega; recomendada = mais rápida (D) e noneOnTime', () => {
    const r = ok(
      rankQuotes(QUATRO, { readyDate: PRONTO, requestedDate: '2026-12-03', holidays: [] }),
    );

    expect(r.noneOnTime).toBe(true);
    expect(r.recommended.option.option_id).toBe('D');
    expect(r.ranked.every((q) => q.onTime === false)).toBe(true);
  });

  it('feriado no caminho: com terça 08/12 feriada, B (+4) chega 10/12 e perde a data 09/12', () => {
    // sex 04 (1), seg 07 (2), ter 08 pulada, qua 09 (3), qui 10 (4)
    const r = ok(
      rankQuotes(QUATRO, {
        readyDate: PRONTO,
        requestedDate: '2026-12-09',
        holidays: ['2026-12-08'],
      }),
    );

    expect(r.ranked.find((q) => q.option.option_id === 'B')?.arrivalDate).toBe('2026-12-10');
    expect(r.ranked.find((q) => q.option.option_id === 'B')?.onTime).toBe(false);
    // C (+2) e D (+1) não passam pelo feriado; a mais barata das que chegam é D (340, 1 dia).
    expect(r.recommended.option.option_id).toBe('D');
  });
});

describe('rankQuotes — empates e bordas', () => {
  it('mesmo preço: a mais barata é a de menor prazo', () => {
    const r = ok(
      rankQuotes([opcao('X', 100, 5), opcao('Y', 100, 3)], { readyDate: PRONTO, holidays: [] }),
    );
    expect(r.cheapest.option.option_id).toBe('Y');
  });

  it('mesmo prazo: a mais rápida é a de menor preço', () => {
    const r = ok(
      rankQuotes([opcao('X', 300, 2), opcao('Y', 250, 2)], { readyDate: PRONTO, holidays: [] }),
    );
    expect(r.fastest.option.option_id).toBe('Y');
  });

  it('empate total mantém a ordem de chegada', () => {
    const r = ok(
      rankQuotes([opcao('X', 100, 2), opcao('Y', 100, 2)], { readyDate: PRONTO, holidays: [] }),
    );
    expect(r.ranked.map((q) => q.option.option_id)).toEqual(['X', 'Y']);
    expect(r.cheapest.option.option_id).toBe('X');
    expect(r.fastest.option.option_id).toBe('X');
  });

  it('uma só opção é tudo ao mesmo tempo', () => {
    const r = ok(rankQuotes([A], { readyDate: PRONTO, holidays: [] }));
    expect([r.cheapest, r.fastest, r.recommended]).toEqual([r.ranked[0], r.ranked[0], r.ranked[0]]);
  });

  it('trânsito 0 chega no mesmo dia', () => {
    const r = ok(
      rankQuotes([opcao('Z', 90, 0)], { readyDate: PRONTO, requestedDate: PRONTO, holidays: [] }),
    );
    expect(r.recommended.arrivalDate).toBe(PRONTO);
    expect(r.recommended.onTime).toBe(true);
  });

  it('requestedDate null equivale a sem data', () => {
    const r = ok(rankQuotes(QUATRO, { readyDate: PRONTO, requestedDate: null, holidays: [] }));
    expect(r.recommended.onTime).toBeNull();
  });

  it('não altera a lista recebida', () => {
    const entrada = [...QUATRO];
    rankQuotes(entrada, { readyDate: PRONTO, holidays: [] });
    expect(entrada).toEqual(QUATRO);
  });
});

describe('rankQuotes — erro de entrada devolvido, nunca lançado', () => {
  it('lista vazia', () => {
    expect(rankQuotes([], { readyDate: PRONTO, holidays: [] })).toEqual({
      status: 'error',
      code: 'no_options',
      message: 'A cotação não trouxe nenhuma opção de frete.',
    });
  });

  it('prazo negativo é recusado: andaria para trás (pronto 03/12 chegaria 02/12)', () => {
    expect(rankQuotes([A, opcao('N', 100, -1)], { readyDate: PRONTO, holidays: [] })).toEqual({
      status: 'error',
      code: 'invalid_input',
      message: 'Prazo negativo na opção N: -1 dias úteis.',
    });
  });

  it.each([
    ['data de produção inválida', { readyDate: '2026-13-01', holidays: [] }],
    ['data pedida inválida', { readyDate: PRONTO, requestedDate: '09/12/2026', holidays: [] }],
    ['feriado inválido', { readyDate: PRONTO, holidays: ['amanhã'] }],
    [
      'feriado inválido com data pedida',
      { readyDate: PRONTO, requestedDate: PRONTO, holidays: ['amanhã'] },
    ],
  ])('%s', (_nome, params) => {
    const r = rankQuotes(QUATRO, params);
    expect(r).toMatchObject({ status: 'error', code: 'invalid_input' });
  });

  it('prazo de trânsito fracionado', () => {
    const r = rankQuotes([opcao('F', 100, 1.5)], { readyDate: PRONTO, holidays: [] });
    expect(r).toMatchObject({ status: 'error', code: 'invalid_input' });
  });
});
