import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  useMultipleTechniquePricing,
  useTechniquePricingOptions,
} from '../useTechniquePricingOptions';

type DeferredCall = { code: string; resolve: (value: unknown) => void };

const state = vi.hoisted(() => ({ calls: [] as DeferredCall[] }));

vi.mock('@/lib/db/postgrest', () => ({
  dbInvoke: vi.fn(
    (args: { filters?: { table_code?: string } }) =>
      new Promise((resolve) => {
        state.calls.push({ code: String(args?.filters?.table_code ?? ''), resolve });
      }),
  ),
}));

const tableRow = (id: string, maxColors: number) => ({
  id,
  composed_code: id,
  price_by_color: true,
  price_by_area: false,
  max_colors: maxColors,
  max_area_width_cm: null,
  max_area_height_cm: null,
  unit_price: 1,
  setup_price: 0,
  min_quantity: null,
});

const respond = async (index: number, rows: unknown[]) => {
  await act(async () => {
    state.calls[index].resolve({ records: rows });
    await Promise.resolve();
  });
};

describe('corrida na busca de tabela de preço (ACH-042)', () => {
  beforeEach(() => {
    state.calls.length = 0;
  });

  it('mantém a tabela da técnica escolhida quando a resposta anterior chega depois', async () => {
    const { result, rerender } = renderHook(
      ({ code }: { code: string | null }) => useTechniquePricingOptions(code),
      { initialProps: { code: 'TEC-A' } },
    );
    expect(state.calls).toHaveLength(1);

    rerender({ code: 'TEC-B' });
    expect(state.calls).toHaveLength(2);

    await respond(1, [tableRow('tabela-b', 5)]);
    await respond(0, [tableRow('tabela-a', 2)]);

    expect(result.current.colorOptions.map((option) => option.value)).toEqual([5]);
  });

  it('não deixa a busca anterior apagar as técnicas que vieram depois', async () => {
    const { result, rerender } = renderHook(
      ({ codes }: { codes: string[] }) => useMultipleTechniquePricing(codes),
      { initialProps: { codes: ['TEC-A'] } },
    );

    rerender({ codes: ['TEC-A', 'TEC-B'] });

    const codes = state.calls.map((call) => call.code);
    expect(codes).toEqual(['TEC-A', 'TEC-A', 'TEC-B']);

    const laterA = codes.lastIndexOf('TEC-A');
    const laterB = codes.lastIndexOf('TEC-B');
    await respond(laterA, [tableRow('tabela-a', 2)]);
    await respond(laterB, [tableRow('tabela-b', 5)]);
    await respond(0, [tableRow('tabela-a-antiga', 9)]);

    expect(result.current.getPricingInfo('TEC-B').colorOptions).toEqual([
      { value: 5, label: '5 cores' },
    ]);
  });
});
