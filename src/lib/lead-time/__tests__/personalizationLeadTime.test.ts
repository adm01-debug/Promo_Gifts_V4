import { describe, expect, it } from 'vitest';
import { resolvePersonalizationLeadTime } from '../personalizationLeadTime';
import type { PersonalizationInput, PersonalizationLookup } from '../types';

const ITEM = { productId: 'p1', quantity: 100 };
const TABELA_A = 'tab-a';
const TABELA_B = 'tab-b';

const lookup: PersonalizationLookup = {
  techniques: [
    { productId: 'p1', locationCode: 'frente', tabelaPrecoId: TABELA_A, productionDays: 4 },
    { productId: 'p1', locationCode: 'verso', tabelaPrecoId: TABELA_A, productionDays: null },
    { productId: 'p1', locationCode: 'tampa', tabelaPrecoId: TABELA_B, productionDays: -1 },
  ],
  bands: [
    { tabelaPrecoId: TABELA_A, minQuantity: 1, maxQuantity: 99, leadTimeDays: 3 },
    { tabelaPrecoId: TABELA_A, minQuantity: 100, maxQuantity: 499, leadTimeDays: 5 },
    { tabelaPrecoId: TABELA_A, minQuantity: 500, maxQuantity: null, leadTimeDays: 7 },
    { tabelaPrecoId: TABELA_B, minQuantity: 1, maxQuantity: null, leadTimeDays: null },
  ],
};

const one = (
  techniqueId: string,
  locationCode: string | null,
  quantity: number | null,
): PersonalizationInput => ({
  techniqueId,
  locationCode,
  quantity,
});

function daysOf(
  personalizations: PersonalizationInput[],
  rule: 'max' | 'sum',
  item = ITEM,
  source = lookup,
) {
  const result = resolvePersonalizationLeadTime(item, personalizations, source, rule);
  return result.ok
    ? { days: result.value.days, source: result.value.source }
    : { error: result.issue.code };
}

describe('resolvePersonalizationLeadTime', () => {
  it('prazo registrado vence a tabela: frente = 4 (a faixa 100..499 diria 5)', () => {
    expect(daysOf([one(TABELA_A, 'frente', 100)], 'max')).toEqual({
      days: 4,
      source: 'registered',
    });
  });

  it('registrado sem production_days cai na tabela: verso com 100 un = faixa 100..499 = 5', () => {
    expect(daysOf([one(TABELA_A, 'verso', 100)], 'max')).toEqual({
      days: 5,
      source: 'price_table',
    });
  });

  it('sem linha cadastrada para o local usa a tabela pela técnica: lateral com 100 un = 5', () => {
    expect(daysOf([one(TABELA_A, 'lateral', 100)], 'max')).toEqual({
      days: 5,
      source: 'price_table',
    });
  });

  it.each([
    // faixas de TABELA_A: 1..99 -> 3 | 100..499 -> 5 | 500..sem teto -> 7
    [1, 3], // mínimo inclusivo da 1ª faixa
    [99, 3], // máximo inclusivo da 1ª faixa
    [100, 5], // mínimo inclusivo da 2ª faixa (99 já era da 1ª)
    [499, 5], // máximo inclusivo da 2ª faixa
    [500, 7], // mínimo inclusivo da faixa sem teto
    [100000, 7], // sem teto aceita qualquer quantidade
  ])('limites inclusivos das faixas: %i un = %i dias úteis', (quantity, esperado) => {
    expect(daysOf([one(TABELA_A, 'verso', quantity)], 'max')).toEqual({
      days: esperado,
      source: 'price_table',
    });
  });

  it('quantidade da personalização nula usa a do item: item de 500 un = 7', () => {
    expect(
      daysOf([one(TABELA_A, 'verso', null)], 'max', { productId: 'p1', quantity: 500 }),
    ).toEqual({
      days: 7,
      source: 'price_table',
    });
  });

  it('regra max: frente 4 (registrado) e verso 5 (tabela) -> max(4, 5) = 5, origem da mais demorada', () => {
    expect(daysOf([one(TABELA_A, 'frente', 100), one(TABELA_A, 'verso', 100)], 'max')).toEqual({
      days: 5,
      source: 'price_table',
    });
  });

  it('regra sum: frente 4 + verso 5 = 9', () => {
    expect(daysOf([one(TABELA_A, 'frente', 100), one(TABELA_A, 'verso', 100)], 'sum')).toEqual({
      days: 9,
      source: 'price_table',
    });
  });

  it('empate de prazos mantém a origem da primeira: 4 (registrado) e 4 (registrado) -> max 4', () => {
    expect(daysOf([one(TABELA_A, 'frente', 10), one(TABELA_A, 'frente', 10)], 'max')).toEqual({
      days: 4,
      source: 'registered',
    });
  });

  it('empate com origens diferentes vale a primeira: 4 (registrado, frente) e 4 (tabela 100..499 com prazo 4) -> registered', () => {
    const tied: PersonalizationLookup = {
      techniques: [
        { productId: 'p1', locationCode: 'frente', tabelaPrecoId: TABELA_A, productionDays: 4 },
      ],
      bands: [{ tabelaPrecoId: TABELA_A, minQuantity: 1, maxQuantity: null, leadTimeDays: 4 }],
    };
    const registeredFirst = [one(TABELA_A, 'frente', 100), one(TABELA_A, 'verso', 100)];
    expect(daysOf(registeredFirst, 'max', ITEM, tied)).toEqual({ days: 4, source: 'registered' });
    expect(daysOf([...registeredFirst].reverse(), 'max', ITEM, tied)).toEqual({
      days: 4,
      source: 'price_table',
    });
  });

  it('sem personalização: 0 dias, sem origem', () => {
    expect(daysOf([], 'sum')).toEqual({ days: 0, source: null });
  });

  it('devolve cada entrada com técnica, local, dias e origem', () => {
    const result = resolvePersonalizationLeadTime(
      ITEM,
      [one(TABELA_A, 'frente', 100)],
      lookup,
      'max',
    );
    expect(result).toEqual({
      ok: true,
      value: {
        days: 4,
        source: 'registered',
        entries: [{ techniqueId: TABELA_A, locationCode: 'frente', days: 4, source: 'registered' }],
      },
    });
  });

  it('faixas repetidas (dimensionais) com prazos diferentes valem o maior: max(3, 6) = 6', () => {
    const dimensional: PersonalizationLookup = {
      techniques: [],
      bands: [
        { tabelaPrecoId: TABELA_A, minQuantity: 1, maxQuantity: 50, leadTimeDays: 3 },
        { tabelaPrecoId: TABELA_A, minQuantity: 1, maxQuantity: 50, leadTimeDays: 6 },
        { tabelaPrecoId: TABELA_A, minQuantity: 1, maxQuantity: 50, leadTimeDays: null },
      ],
    };
    expect(daysOf([one(TABELA_A, null, 10)], 'max', ITEM, dimensional)).toEqual({
      days: 6,
      source: 'price_table',
    });
  });

  it.each([
    ['sem faixa para a quantidade (tabela de outra técnica)', one('tab-x', 'frente', 100)],
    ['faixa sem prazo cadastrado (prazo_dias nulo)', one(TABELA_B, 'frente', 10)],
  ])('faltante: %s', (_nome, personalization) => {
    const result = resolvePersonalizationLeadTime(ITEM, [personalization], lookup, 'max');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issue.code).toBe('personalization_lead_time');
      expect(result.issue.productId).toBe('p1');
    }
  });

  it('faltante em uma de duas personalizações bloqueia o item inteiro', () => {
    expect(daysOf([one(TABELA_A, 'frente', 100), one('tab-x', 'verso', 100)], 'max')).toEqual({
      error: 'personalization_lead_time',
    });
  });

  it.each([
    ['prazo registrado negativo', one(TABELA_B, 'tampa', 100), lookup, ITEM],
    ['quantidade zero', one(TABELA_A, 'verso', 0), lookup, ITEM],
    ['quantidade fracionada', one(TABELA_A, 'verso', 2.5), lookup, ITEM],
    [
      'prazo da tabela fracionado',
      one(TABELA_A, null, 10),
      {
        techniques: [],
        bands: [{ tabelaPrecoId: TABELA_A, minQuantity: 1, maxQuantity: null, leadTimeDays: 1.5 }],
      },
      ITEM,
    ],
  ])('entrada inválida devolve erro: %s', (_nome, personalization, source, item) => {
    expect(daysOf([personalization], 'max', item, source)).toEqual({ error: 'invalid_input' });
  });

  it('acumula as pendências de TODAS as personalizações do item: 2 faltantes -> 2 issues, issue = a primeira', () => {
    const result = resolvePersonalizationLeadTime(
      ITEM,
      [one('tab-x', 'A', 10), one(TABELA_A, 'frente', 100), one('tab-y', 'B', 20)],
      lookup,
      'max',
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues).toHaveLength(2);
      expect(result.issue).toBe(result.issues[0]);
      expect(result.issues[0]?.message).toContain('no local "A"');
      expect(result.issues[1]?.message).toContain('no local "B"');
    }
  });

  it('prazo cadastrado com quantidade inválida também é erro: frente (4 dias) com -5 un', () => {
    expect(daysOf([one(TABELA_A, 'frente', -5)], 'max')).toEqual({ error: 'invalid_input' });
    expect(daysOf([one(TABELA_A, 'frente', 0)], 'max')).toEqual({ error: 'invalid_input' });
  });

  it.each([
    ['5 e -1', [5, -1]],
    ['5 e 2.5', [5, 2.5]],
  ])('faixa inválida que casa junto com uma válida não some: prazos %s', (_nome, prazos) => {
    const dirty: PersonalizationLookup = {
      techniques: [],
      bands: prazos.map((leadTimeDays) => ({
        tabelaPrecoId: TABELA_A,
        minQuantity: 1,
        maxQuantity: 50,
        leadTimeDays,
      })),
    };
    expect(daysOf([one(TABELA_A, null, 10)], 'max', ITEM, dirty)).toEqual({
      error: 'invalid_input',
    });
  });

  it.each([['avg'], [undefined], [null]])(
    'regra fora de max|sum (%s) é invalid_input, não vira max',
    (rule) => {
      // @ts-expect-error entrada fora do tipo, de propósito
      const result = resolvePersonalizationLeadTime(
        ITEM,
        [one(TABELA_A, 'frente', 100)],
        lookup,
        rule,
      );
      expect(result.ok).toBe(false);
      expect(!result.ok && result.issue.code).toBe('invalid_input');
    },
  );

  it('entradas nulas são devolvidas como invalid_input, nunca lançadas', () => {
    const fn = resolvePersonalizationLeadTime;
    const personalizations = [one(TABELA_A, 'frente', 100)];
    const results = [
      // @ts-expect-error entrada fora do tipo, de propósito
      fn(null, personalizations, lookup, 'max'),
      // @ts-expect-error entrada fora do tipo, de propósito
      fn(ITEM, null, lookup, 'max'),
      // @ts-expect-error entrada fora do tipo, de propósito
      fn(ITEM, [null], lookup, 'max'),
      // @ts-expect-error entrada fora do tipo, de propósito
      fn(ITEM, personalizations, null, 'max'),
      // @ts-expect-error entrada fora do tipo, de propósito
      fn(ITEM, personalizations, { techniques: null, bands: [] }, 'max'),
      // @ts-expect-error entrada fora do tipo, de propósito
      fn(ITEM, personalizations, { techniques: [], bands: undefined }, 'max'),
    ];
    for (const result of results) {
      expect(result.ok).toBe(false);
      expect(!result.ok && result.issue.code).toBe('invalid_input');
    }
  });

  it('mensagem do faltante traz o local quando há local', () => {
    const result = resolvePersonalizationLeadTime(
      ITEM,
      [one('tab-x', 'frente', 100)],
      lookup,
      'max',
    );
    expect(!result.ok && result.issue.message).toContain('no local "frente"');
  });
});
