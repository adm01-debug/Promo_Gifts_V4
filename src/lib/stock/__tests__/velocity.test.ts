import { describe, expect, it } from 'vitest';
import {
  CRITICAL_COVERAGE_DAYS,
  buildVelocityIdentityMap,
  buildVelocityViews,
  classifyVelocity,
  daysOfCoverage,
  filterVelocityViews,
  sortVelocityViews,
  summarizeVelocity,
  type StockVelocityRow,
} from '../velocity';

const row = (over: Partial<StockVelocityRow> = {}): StockVelocityRow => ({
  variant_id: over.variant_id ?? 'var-1',
  product_id: over.product_id ?? 'prod-1',
  avg_daily_depletion_7d: over.avg_daily_depletion_7d ?? 3,
  avg_daily_depletion_30d: over.avg_daily_depletion_30d ?? 3,
  avg_daily_depletion_90d: over.avg_daily_depletion_90d ?? 2,
  raw_avg_depletion_30d: over.raw_avg_depletion_30d ?? 3,
  p99_cap_30d: over.p99_cap_30d ?? 40,
  was_capped: over.was_capped ?? false,
  total_depleted_7d: over.total_depleted_7d ?? 21,
  total_depleted_30d: over.total_depleted_30d ?? 90,
  total_depleted_90d: over.total_depleted_90d ?? 180,
  active_days_30d: over.active_days_30d ?? 20,
});

const stocks = [
  {
    productId: 'prod-1',
    productName: 'Caneca Branca',
    variants: [
      {
        variantId: 'var-1',
        variantSku: 'CAN-BR',
        colorName: 'Branco',
        sizeName: '300ml',
        currentStock: 90,
      },
      { variantId: 'var-2', variantSku: 'CAN-AZ', colorName: 'Azul', currentStock: 4 },
      { variantId: 'var-3', variantSku: 'CAN-VE', currentStock: 7 },
    ],
  },
];

describe('classifyVelocity', () => {
  it('marca 5 un/dia ou mais como alta rotação', () => {
    expect(classifyVelocity(5)).toBe('alta');
    expect(classifyVelocity(34)).toBe('alta');
  });

  it('marca entre 1 e 5 como média rotação', () => {
    expect(classifyVelocity(1)).toBe('media');
    expect(classifyVelocity(4.99)).toBe('media');
  });

  it('marca fração positiva como baixa rotação', () => {
    expect(classifyVelocity(0.4)).toBe('baixa');
  });

  it('trata zero, null, undefined e NaN como sem saída', () => {
    expect(classifyVelocity(0)).toBe('parada');
    expect(classifyVelocity(null)).toBe('parada');
    expect(classifyVelocity(undefined)).toBe('parada');
    expect(classifyVelocity(Number.NaN)).toBe('parada');
  });
});

describe('daysOfCoverage', () => {
  it('divide o estoque atual pelo ritmo de 30 dias', () => {
    expect(daysOfCoverage(90, 3)).toBe(30);
  });

  it('devolve null sem ritmo ou sem estoque conhecido', () => {
    expect(daysOfCoverage(90, 0)).toBeNull();
    expect(daysOfCoverage(null, 3)).toBeNull();
    expect(daysOfCoverage(undefined, 3)).toBeNull();
  });
});

describe('buildVelocityViews', () => {
  it('junta o giro com nome de produto e variação do cache de estoque', () => {
    const views = buildVelocityViews([row()], buildVelocityIdentityMap(stocks));
    expect(views).toHaveLength(1);
    expect(views[0]).toMatchObject({
      variantId: 'var-1',
      productName: 'Caneca Branca',
      variantLabel: 'Branco · 300ml',
      currentStock: 90,
      coverageDays: 30,
      band: 'media',
      wasCapped: false,
    });
  });

  it('preserva o bruto e a marca de pico suavizado quando o p99 cortou o giro', () => {
    const views = buildVelocityViews(
      [row({ avg_daily_depletion_30d: 40, raw_avg_depletion_30d: 34000, was_capped: true })],
      buildVelocityIdentityMap(stocks),
    );
    expect(views[0].avg30d).toBe(40);
    expect(views[0].rawAvg30d).toBe(34000);
    expect(views[0].wasCapped).toBe(true);
    expect(views[0].band).toBe('alta');
  });

  it('cai para o SKU quando a variante não tem cor nem tamanho', () => {
    const views = buildVelocityViews(
      [row({ variant_id: 'var-3' })],
      buildVelocityIdentityMap(stocks),
    );
    expect(views[0].variantLabel).toBe('CAN-VE');
    expect(views[0].coverageDays).toBe(2);
  });

  it('prefere cor e tamanho ao SKU quando existem', () => {
    const views = buildVelocityViews(
      [row({ variant_id: 'var-2' })],
      buildVelocityIdentityMap(stocks),
    );
    expect(views[0].variantLabel).toBe('Azul');
    expect(views[0].coverageDays).toBe(1);
  });

  it('não quebra quando a variante não está no cache de estoque', () => {
    const views = buildVelocityViews(
      [row({ variant_id: 'var-orfa' })],
      buildVelocityIdentityMap(stocks),
    );
    expect(views[0].productName).toBe('prod-1');
    expect(views[0].variantLabel).toBe('var-orfa');
    expect(views[0].currentStock).toBeNull();
    expect(views[0].coverageDays).toBeNull();
  });

  it('ignora linha sem variant_id', () => {
    expect(buildVelocityViews([{ ...row(), variant_id: null }], new Map())).toEqual([]);
  });

  it('normaliza null como zero em vez de propagar NaN', () => {
    const views = buildVelocityViews(
      [
        {
          ...row(),
          avg_daily_depletion_30d: null,
          total_depleted_30d: null,
          active_days_30d: null,
        },
      ],
      new Map(),
    );
    expect(views[0].avg30d).toBe(0);
    expect(views[0].totalDepleted30d).toBe(0);
    expect(views[0].activeDays30d).toBe(0);
    expect(views[0].band).toBe('parada');
  });
});

describe('filterVelocityViews e sortVelocityViews', () => {
  const views = buildVelocityViews(
    [
      row({ variant_id: 'var-1', avg_daily_depletion_30d: 3 }),
      row({ variant_id: 'var-2', avg_daily_depletion_30d: 8 }),
      row({ variant_id: 'var-3', product_id: 'prod-2', avg_daily_depletion_30d: 0 }),
    ],
    buildVelocityIdentityMap(stocks),
  );

  it('filtra por faixa', () => {
    expect(filterVelocityViews(views, { bands: ['alta'] }).map((v) => v.variantId)).toEqual([
      'var-2',
    ]);
    expect(
      filterVelocityViews(views, { bands: ['media', 'parada'] }).map((v) => v.variantId),
    ).toEqual(['var-1', 'var-3']);
  });

  it('filtra por texto em produto, variação e id', () => {
    expect(filterVelocityViews(views, { search: 'caneca' })).toHaveLength(3);
    expect(filterVelocityViews(views, { search: 'azul' }).map((v) => v.variantId)).toEqual([
      'var-2',
    ]);
    expect(filterVelocityViews(views, { search: 'var-3' }).map((v) => v.variantId)).toEqual([
      'var-3',
    ]);
    expect(filterVelocityViews(views, { search: 'inexistente' })).toEqual([]);
  });

  it('combina busca e faixa', () => {
    expect(filterVelocityViews(views, { search: 'azul', bands: ['media'] })).toEqual([]);
  });

  it('ordena do maior giro para o menor e mantém o array original intacto', () => {
    expect(sortVelocityViews(views).map((v) => v.variantId)).toEqual(['var-2', 'var-1', 'var-3']);
    expect(views.map((v) => v.variantId)).toEqual(['var-1', 'var-2', 'var-3']);
  });
});

describe('summarizeVelocity', () => {
  it('conta faixas, picos suavizados e cobertura crítica', () => {
    const views = buildVelocityViews(
      [
        row({ variant_id: 'var-1' }),
        row({ variant_id: 'var-2', avg_daily_depletion_30d: 8, was_capped: true }),
        row({ variant_id: 'var-3', avg_daily_depletion_30d: 0 }),
      ],
      buildVelocityIdentityMap(stocks),
    );
    const summary = summarizeVelocity(views);
    expect(summary.total).toBe(3);
    expect(summary.bandCounts).toEqual({ alta: 1, media: 1, baixa: 0, parada: 1 });
    expect(summary.capped).toBe(1);
    expect(summary.withCoverage).toBe(2);
    expect(summary.criticalCoverage).toBe(1);
    expect(CRITICAL_COVERAGE_DAYS).toBe(15);
  });

  it('zera tudo em lista vazia', () => {
    expect(summarizeVelocity([])).toEqual({
      total: 0,
      bandCounts: { alta: 0, media: 0, baixa: 0, parada: 0 },
      capped: 0,
      withCoverage: 0,
      criticalCoverage: 0,
    });
  });
});
