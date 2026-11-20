import { describe, expect, it } from 'vitest';
import { computeProductionLeadTime } from '../productionLeadTime';
import type { ProductionLeadSettings, QuoteLeadTimeItem } from '../types';

const TABELA = 'tab-a';
const TODAY = '2026-11-23'; // segunda-feira

function settings(overrides: Partial<ProductionLeadSettings> = {}): ProductionLeadSettings {
  return {
    internalBufferDays: 0,
    multiPersonalizationRule: 'max',
    lookup: {
      techniques: [
        { productId: 'a', locationCode: 'frente', tabelaPrecoId: TABELA, productionDays: 2 },
        { productId: 'b', locationCode: 'frente', tabelaPrecoId: TABELA, productionDays: 8 },
      ],
      bands: [],
    },
    ...overrides,
  };
}

// Item A: fornecedor 3 (padrão) + personalização registrada 2. Item B: fornecedor 5 (exceção) + 8.
const itemA: QuoteLeadTimeItem = {
  quantity: 100,
  product: { productId: 'a', leadTimeDays: null },
  supplier: { defaultLeadTimeDays: 3 },
  personalizations: [{ techniqueId: TABELA, locationCode: 'frente', quantity: null }],
};
const itemB: QuoteLeadTimeItem = {
  quantity: 100,
  product: { productId: 'b', leadTimeDays: 5 },
  supplier: { defaultLeadTimeDays: 3 },
  personalizations: [{ techniqueId: TABELA, locationCode: 'frente', quantity: null }],
};

describe('computeProductionLeadTime', () => {
  it('(3+2) vs (5+8): total 13, crítico é o segundo; pronto em 10/12/2026', () => {
    // A = 3+2+0 = 5 ; B = 5+8+0 = 13 ; pedido = max(5, 13) = 13
    // Segunda 23/11 + 13 úteis: 24,25,26,27 (4) | 30/11,1,2,3,4 (9) | 7,8,9,10 (13) -> quinta 10/12/2026
    const result = computeProductionLeadTime(
      { approvedOn: null, items: [itemA, itemB] },
      settings(),
      [],
      TODAY,
    );
    expect(result.status).toBe('ok');
    expect(result.totalDays).toBe(13);
    expect(result.readyDate).toBe('2026-12-10');
    expect(result.perItem).toEqual([
      {
        productId: 'a',
        supplierDays: 3,
        supplierSource: 'supplier_default',
        personalizationDays: 2,
        personalizationSource: 'registered',
        bufferDays: 0,
        total: 5,
        isCritical: false,
      },
      {
        productId: 'b',
        supplierDays: 5,
        supplierSource: 'product_exception',
        personalizationDays: 8,
        personalizationSource: 'registered',
        bufferDays: 0,
        total: 13,
        isCritical: true,
      },
    ]);
    expect(result.missing).toEqual([]);
  });

  it('folga interna de 1 dia soma em cada item: (3+2+1)=6 e (5+8+1)=14 -> 14, pronto em 11/12/2026', () => {
    // 13 úteis a partir de 23/11 = 10/12 (conta acima); +1 útil = sexta 11/12/2026
    const result = computeProductionLeadTime(
      { approvedOn: null, items: [itemA, itemB] },
      settings({ internalBufferDays: 1 }),
      [],
      TODAY,
    );
    expect(result.perItem.map((item) => item.total)).toEqual([6, 14]);
    expect(result.totalDays).toBe(14);
    expect(result.readyDate).toBe('2026-12-11');
  });

  it('a data de aprovação vale mais que hoje: aprovado 09/11 (segunda) + 13 úteis = 26/11', () => {
    // 10,11,12,13 (4) | 16,17,18,19,20 (9) | 23,24,25,26 (13) -> quinta 26/11/2026
    const result = computeProductionLeadTime(
      { approvedOn: '2026-11-09', items: [itemA, itemB] },
      settings(),
      [],
      TODAY,
    );
    expect(result.readyDate).toBe('2026-11-26');
  });

  it('feriado no caminho empurra a data: feriado 08/12 -> 13º dia útil vira sexta 11/12/2026', () => {
    // mesma contagem, mas ter 08/12 não conta: ...7 (10º), 9 (11º), 10 (12º), 11 (13º)
    const result = computeProductionLeadTime(
      { approvedOn: null, items: [itemA, itemB] },
      settings(),
      ['2026-12-08'],
      TODAY,
    );
    expect(result.readyDate).toBe('2026-12-11');
  });

  it('empate no maior total marca os dois itens como críticos: 5 e 5', () => {
    // duas linhas do mesmo produto: 3+2 = 5 e 3+2 = 5
    const tie: QuoteLeadTimeItem = { ...itemA };
    const result = computeProductionLeadTime(
      { approvedOn: null, items: [itemA, tie] },
      settings(),
      [],
      TODAY,
    );
    expect(result.perItem.map((item) => item.isCritical)).toEqual([true, true]);
  });

  it('item sem personalização: personalização 0 e sem origem; total = fornecedor 3 + folga 0', () => {
    const plain: QuoteLeadTimeItem = { ...itemA, personalizations: [] };
    const result = computeProductionLeadTime(
      { approvedOn: null, items: [plain] },
      settings(),
      [],
      TODAY,
    );
    expect(result.perItem[0]).toMatchObject({
      personalizationDays: 0,
      personalizationSource: null,
      total: 3,
    });
    expect(result.totalDays).toBe(3);
    // 23/11 + 3 úteis = 24, 25, 26 -> quinta 26/11/2026
    expect(result.readyDate).toBe('2026-11-26');
  });

  it('faltante bloqueia: sem prazo do fornecedor do item B, não há data nem total', () => {
    const noSupplier: QuoteLeadTimeItem = {
      ...itemB,
      product: { productId: 'b', leadTimeDays: null },
      supplier: null,
    };
    const result = computeProductionLeadTime(
      { approvedOn: null, items: [itemA, noSupplier] },
      settings(),
      [],
      TODAY,
    );
    expect(result.status).toBe('dados_insuficientes');
    expect(result.readyDate).toBeNull();
    expect(result.totalDays).toBeNull();
    expect(result.missing).toHaveLength(1);
    expect(result.missing[0]).toMatchObject({ code: 'supplier_lead_time', productId: 'b' });
    expect(result.perItem.map((item) => item.productId)).toEqual(['a']);
  });

  it('faltante de fornecedor e de personalização no mesmo item gera 2 pendências', () => {
    const broken: QuoteLeadTimeItem = {
      ...itemB,
      product: { productId: 'b', leadTimeDays: null },
      supplier: null,
      personalizations: [{ techniqueId: 'tab-x', locationCode: 'frente', quantity: null }],
    };
    const result = computeProductionLeadTime(
      { approvedOn: null, items: [broken] },
      settings(),
      [],
      TODAY,
    );
    expect(result.missing.map((issue) => issue.code)).toEqual([
      'supplier_lead_time',
      'personalization_lead_time',
    ]);
  });

  it.each([
    // sábado 14/11 sem feriado: total 0 avança para segunda 16/11
    ['aprovado no sábado', '2026-11-14', [] as string[], '2026-11-16'],
    // sexta 20/11 é feriado: total 0 avança para segunda 23/11 (sáb 21 e dom 22 pulam)
    ['aprovado em feriado (sexta)', '2026-11-20', ['2026-11-20'], '2026-11-23'],
    // sexta 20/11 feriado + segunda 23/11 feriado: 24/11 (terça)
    [
      'feriado seguido de fim de semana e feriado',
      '2026-11-20',
      ['2026-11-20', '2026-11-23'],
      '2026-11-24',
    ],
    // segunda 16/11 é útil: total 0 fica no mesmo dia
    ['aprovado em dia útil', '2026-11-16', [] as string[], '2026-11-16'],
  ])('total 0 nunca promete dia não útil: %s -> %s', (_nome, approvedOn, holidays, esperado) => {
    // fornecedor 0 + personalização 0 + folga 0 = 0
    const zero: QuoteLeadTimeItem = {
      quantity: 1,
      product: { productId: 'z', leadTimeDays: 0 },
      supplier: { defaultLeadTimeDays: 0 },
      personalizations: [],
    };
    const result = computeProductionLeadTime(
      { approvedOn, items: [zero] },
      settings(),
      holidays,
      TODAY,
    );
    expect(result.status).toBe('ok');
    expect(result.totalDays).toBe(0);
    expect(result.readyDate).toBe(esperado);
  });

  it('pendências de todas as personalizações do item entram em missing: 2 locais sem faixa = 2 pendências', () => {
    const broken: QuoteLeadTimeItem = {
      ...itemA,
      personalizations: [
        { techniqueId: 'tab-x', locationCode: 'A', quantity: 10 },
        { techniqueId: 'tab-y', locationCode: 'B', quantity: 20 },
      ],
    };
    const result = computeProductionLeadTime(
      { approvedOn: null, items: [broken] },
      settings(),
      [],
      TODAY,
    );
    expect(result.missing.map((issue) => issue.code)).toEqual([
      'personalization_lead_time',
      'personalization_lead_time',
    ]);
    expect(result.missing.map((issue) => issue.productId)).toEqual(['a', 'a']);
  });

  it('total acima do teto vira dados_insuficientes: fornecedor 3651 dias úteis', () => {
    const absurd: QuoteLeadTimeItem = {
      ...itemA,
      product: { productId: 'a', leadTimeDays: 3651 },
      personalizations: [],
    };
    const result = computeProductionLeadTime(
      { approvedOn: null, items: [absurd] },
      settings(),
      [],
      TODAY,
    );
    expect(result.status).toBe('dados_insuficientes');
    expect(result.missing[0]?.code).toBe('invalid_input');
  });

  it('entradas nulas são devolvidas como invalid_input, nunca lançadas', () => {
    const quote = { approvedOn: null, items: [itemA] };
    const noProduct = { ...itemA, product: null };
    const noList = { ...itemA, personalizations: null };
    const calls = [
      // @ts-expect-error entrada fora do tipo, de propósito
      () => computeProductionLeadTime(null, settings(), [], TODAY),
      // @ts-expect-error entrada fora do tipo, de propósito
      () => computeProductionLeadTime({ approvedOn: null, items: null }, settings(), [], TODAY),
      // @ts-expect-error entrada fora do tipo, de propósito
      () => computeProductionLeadTime({ approvedOn: null, items: [null] }, settings(), [], TODAY),
      // @ts-expect-error entrada fora do tipo, de propósito
      () => computeProductionLeadTime(quote, null, [], TODAY),
      // @ts-expect-error entrada fora do tipo, de propósito
      () => computeProductionLeadTime(quote, settings(), null, TODAY),
      // @ts-expect-error entrada fora do tipo, de propósito
      () => computeProductionLeadTime(quote, { ...settings(), lookup: null }, [], TODAY),
      // @ts-expect-error entrada fora do tipo, de propósito
      () =>
        computeProductionLeadTime({ approvedOn: null, items: [noProduct] }, settings(), [], TODAY),
      // @ts-expect-error entrada fora do tipo, de propósito
      () => computeProductionLeadTime({ approvedOn: null, items: [noList] }, settings(), [], TODAY),
    ];
    for (const call of calls) {
      const result = call();
      expect(result.status).toBe('dados_insuficientes');
      expect(result.readyDate).toBeNull();
      expect(result.missing[0]?.code).toBe('invalid_input');
    }
  });

  it.each([
    ['orçamento sem itens', { approvedOn: null, items: [] }, settings(), [], TODAY],
    [
      'folga interna negativa',
      { approvedOn: null, items: [itemA] },
      settings({ internalBufferDays: -1 }),
      [],
      TODAY,
    ],
    [
      'folga interna fracionada',
      { approvedOn: null, items: [itemA] },
      settings({ internalBufferDays: 0.5 }),
      [],
      TODAY,
    ],
    [
      'data de aprovação inválida',
      { approvedOn: '23/11/2026', items: [itemA] },
      settings(),
      [],
      TODAY,
    ],
    ['feriado inválido', { approvedOn: null, items: [itemA] }, settings(), ['xx'], TODAY],
  ])('entrada inválida é devolvida, não lançada: %s', (_nome, quote, config, holidays, today) => {
    const result = computeProductionLeadTime(quote, config, holidays, today);
    expect(result.status).toBe('dados_insuficientes');
    expect(result.readyDate).toBeNull();
    expect(result.missing[0]?.code).toBe('invalid_input');
  });
});
