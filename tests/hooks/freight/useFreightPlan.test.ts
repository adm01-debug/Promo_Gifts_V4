/**
 * `useFreightPlan`. Mocka o cliente (produtos) e os serviços (caixas e
 * parâmetros); o motor roda de verdade. Trava: estados, recálculo só quando a
 * chave muda, `computedAt`/`itemsHash` injetados, item avulso e produto não
 * encontrado como faltantes.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { waitFor } from '@testing-library/react';

import type * as FreightSettingsServiceModule from '@/services/freightSettingsService';
import type * as ShippingBoxServiceModule from '@/services/shippingBoxService';

const h = vi.hoisted(() => ({
  products: new Map<string, Record<string, unknown>>(),
  productFetches: 0,
  productsError: null as { message: string; code: string } | null,
  boxes: { listActive: vi.fn() },
  settings: { get: vi.fn() },
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        in: (_column: string, ids: string[]) => ({
          overrideTypes: () => {
            h.productFetches += 1;
            if (h.productsError) return Promise.resolve({ data: null, error: h.productsError });
            return Promise.resolve({
              data: ids.flatMap((id) => {
                const row = h.products.get(id);
                return row ? [row] : [];
              }),
              error: null,
            });
          },
        }),
      }),
    }),
  },
}));
vi.mock('@/services/shippingBoxService', async (importOriginal) => ({
  ...(await importOriginal<typeof ShippingBoxServiceModule>()),
  shippingBoxService: h.boxes,
}));
vi.mock('@/services/freightSettingsService', async (importOriginal) => ({
  ...(await importOriginal<typeof FreightSettingsServiceModule>()),
  freightSettingsService: h.settings,
}));

import { useFreightPlan, type UseFreightPlanInput } from '@/hooks/freight';
import { computeItemsHash } from '@/lib/freight';
import { LINHA_CADERNETA, LINHA_SQUEEZE } from '@/lib/freight/__tests__/fixtures/items';
import type { FreightSettingsRow } from '@/services/freightSettingsService';
import type { ShippingBoxRow } from '@/services/shippingBoxService';
import { renderHookWithProviders } from '../_helpers/render-hook-providers';

/** Caixa P real: externa 27 × 33 × 33, parede 3 mm → interna 26,4 × 32,4 × 32,4; 10 kg. */
const CAIXA_P_LINHA: ShippingBoxRow = {
  id: 'box-p',
  code: 'P',
  name: 'Caixa P',
  outer_height_cm: 27,
  outer_width_cm: 33,
  outer_length_cm: 33,
  wall_thickness_mm: 3,
  inner_height_cm: 26.4,
  inner_width_cm: 32.4,
  inner_length_cm: 32.4,
  empty_weight_g: 0,
  max_weight_g: 10000,
  fill_factor: 0.9,
  is_active: true,
  sort_order: 1,
  created_at: '2026-11-19T21:30:00Z',
  updated_at: '2026-11-19T21:30:00Z',
  deleted_at: null,
};

const PARAMETROS: FreightSettingsRow = {
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

const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

function entrada(quantity: number, extras: Partial<UseFreightPlanInput> = {}): UseFreightPlanInput {
  return {
    items: [{ productId: 'caderneta', quantity }],
    mixMode: 'misturar',
    ...extras,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  h.products.clear();
  h.productFetches = 0;
  h.productsError = null;
  h.products.set('caderneta', { ...LINHA_CADERNETA });
  h.products.set('squeeze', { ...LINHA_SQUEEZE });
  h.boxes.listActive.mockResolvedValue([CAIXA_P_LINHA]);
  h.settings.get.mockResolvedValue(PARAMETROS);
});

describe('useFreightPlan', () => {
  it('começa carregando, sem plano, e depois entrega o plano com hash e data injetados', async () => {
    const { result } = renderHookWithProviders(
      (props: UseFreightPlanInput) => useFreightPlan(props),
      {
        initialProps: entrada(10),
      },
    );

    expect(result.current.isLoading).toBe(true);
    expect(result.current.plan).toBeNull();

    await waitFor(() => expect(result.current.plan).not.toBeNull());

    // 10 cadernetas cabem na P (capacidade 64): 1 volume.
    expect(result.current.plan?.status).toBe('ok');
    expect(result.current.plan?.volumes).toHaveLength(1);
    expect(result.current.plan?.itemsHash).toBe(
      computeItemsHash([{ productId: 'caderneta', quantity: 10 }]),
    );
    expect(result.current.plan?.computedAt).toMatch(ISO);
    expect(result.current.products.get('caderneta')?.name).toBe('Caderneta A5');
    expect(result.current.error).toBeNull();
  });

  it('mudar a quantidade recalcula; re-render com o mesmo conteúdo não', async () => {
    const { result, rerender } = renderHookWithProviders(
      (props: UseFreightPlanInput) => useFreightPlan(props),
      { initialProps: entrada(10) },
    );
    await waitFor(() => expect(result.current.plan).not.toBeNull());
    const primeiro = result.current.plan;

    // Lista nova, conteúdo igual: o mesmo objeto de plano, com o mesmo computedAt.
    rerender(entrada(10));
    expect(result.current.plan).toBe(primeiro);

    // 100 cadernetas na P: 64 + 36 = 2 volumes.
    rerender(entrada(100));
    expect(result.current.plan).not.toBe(primeiro);
    expect(result.current.plan?.volumes).toHaveLength(2);
    expect(result.current.plan?.itemsHash).not.toBe(primeiro?.itemsHash);
  });

  it('número de kits multiplica as quantidades e recalcula', async () => {
    const { result, rerender } = renderHookWithProviders(
      (props: UseFreightPlanInput) => useFreightPlan(props),
      { initialProps: entrada(10) },
    );
    await waitFor(() => expect(result.current.plan?.volumes).toHaveLength(1));

    // 10 × 7 kits = 70 cadernetas na P: 64 + 6 = 2 volumes.
    rerender(entrada(10, { kitQuantity: 7 }));
    expect(result.current.plan?.volumes).toHaveLength(2);
  });

  it('a mesma linha repetida soma as quantidades antes de calcular', async () => {
    const { result } = renderHookWithProviders(
      (props: UseFreightPlanInput) => useFreightPlan(props),
      {
        initialProps: {
          items: [
            { productId: 'caderneta', quantity: 60 },
            { productId: 'caderneta', quantity: 40 },
          ],
          mixMode: 'misturar',
        },
      },
    );
    await waitFor(() => expect(result.current.plan).not.toBeNull());

    // 60 + 40 = 100 cadernetas: 64 + 36 = 2 volumes.
    expect(result.current.plan?.volumes).toHaveLength(2);
    expect(result.current.plan?.itemsHash).toBe(
      computeItemsHash([{ productId: 'caderneta', quantity: 100 }]),
    );
  });

  it('item avulso vira faltante com o nome e bloqueia o plano', async () => {
    const { result } = renderHookWithProviders(
      (props: UseFreightPlanInput) => useFreightPlan(props),
      {
        initialProps: {
          items: [
            { productId: 'caderneta', quantity: 10 },
            { productId: null, name: 'Camiseta sob medida', quantity: 5 },
          ],
          mixMode: 'misturar',
        },
      },
    );
    await waitFor(() => expect(result.current.plan).not.toBeNull());

    expect(result.current.plan?.status).toBe('dados_insuficientes');
    expect(result.current.plan?.volumes).toHaveLength(0);
    expect(result.current.plan?.missing).toEqual([
      {
        productId: '',
        name: 'Camiseta sob medida',
        // Mesma ordem do motor: altura, largura, comprimento, peso.
        missing: ['height', 'width', 'length', 'weight'],
      },
    ]);
  });

  it('produto que o banco não devolve é caso próprio: bloqueia o plano, sem lista de medidas', async () => {
    const { result } = renderHookWithProviders(
      (props: UseFreightPlanInput) => useFreightPlan(props),
      {
        initialProps: {
          items: [
            { productId: 'caderneta', quantity: 3 },
            { productId: 'sumiu', name: 'Caneta Azul', quantity: 3 },
          ],
          mixMode: 'misturar',
        },
      },
    );
    await waitFor(() => expect(result.current.plan).not.toBeNull());

    expect(result.current.plan?.status).toBe('dados_insuficientes');
    // A caderneta tem cadastro completo: nada falta nas medidas.
    expect(result.current.plan?.missing).toEqual([]);
    expect(result.current.unavailable).toEqual([{ productId: 'sumiu', name: 'Caneta Azul' }]);
  });

  it('erro de leitura dos produtos vira Error em PT-BR com a causa', async () => {
    h.productsError = { message: 'permission denied for table products', code: '42501' };
    const { result } = renderHookWithProviders(
      (props: UseFreightPlanInput) => useFreightPlan(props),
      { initialProps: entrada(10) },
    );
    await waitFor(() => expect(result.current.error).not.toBeNull());

    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toBe('Não foi possível ler as medidas dos produtos.');
    expect(result.current.plan).toBeNull();
  });

  it('refetch das medidas com dados iguais mantém o mesmo plano e o mesmo computedAt', async () => {
    const { result, queryClient } = renderHookWithProviders(
      (props: UseFreightPlanInput) => useFreightPlan(props),
      { initialProps: entrada(10) },
    );
    await waitFor(() => expect(result.current.plan).not.toBeNull());
    const primeiro = result.current.plan;
    const computedAt = primeiro?.computedAt;
    expect(h.productFetches).toBe(1);

    await queryClient.invalidateQueries({ queryKey: ['product-measures'] });
    await waitFor(() => expect(h.productFetches).toBe(2));
    await waitFor(() => expect(queryClient.isFetching()).toBe(0));

    expect(result.current.plan).toBe(primeiro);
    expect(result.current.plan?.computedAt).toBe(computedAt);
  });

  it('falha em refetch de fundo das caixas não apaga o plano válido', async () => {
    const { result, queryClient } = renderHookWithProviders(
      (props: UseFreightPlanInput) => useFreightPlan(props),
      { initialProps: entrada(10) },
    );
    await waitFor(() => expect(result.current.plan).not.toBeNull());
    const primeiro = result.current.plan;

    h.boxes.listActive.mockRejectedValue(new Error('rede caiu'));
    await queryClient.invalidateQueries({ queryKey: ['shipping-boxes'] });
    await waitFor(() => expect(h.boxes.listActive).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(queryClient.isFetching()).toBe(0));

    expect(result.current.plan).toBe(primeiro);
    expect(result.current.error).toBeNull();
  });

  it('itemsHash usa a quantidade efetiva: kits diferentes geram hash diferente', async () => {
    const { result, rerender } = renderHookWithProviders(
      (props: UseFreightPlanInput) => useFreightPlan(props),
      { initialProps: entrada(10) },
    );
    await waitFor(() => expect(result.current.plan).not.toBeNull());
    expect(result.current.plan?.itemsHash).toBe(
      computeItemsHash([{ productId: 'caderneta', quantity: 10 }]),
    );

    // 10 × 3 kits = 30
    rerender(entrada(10, { kitQuantity: 3 }));
    expect(result.current.plan?.itemsHash).toBe(
      computeItemsHash([{ productId: 'caderneta', quantity: 30 }]),
    );
  });

  it('nome de item avulso com ":" e "|" não colide com outra lista', async () => {
    const { result, rerender } = renderHookWithProviders(
      (props: UseFreightPlanInput) => useFreightPlan(props),
      {
        initialProps: {
          items: [{ productId: null, name: 'x:1|:y', quantity: 2 }],
          mixMode: 'misturar',
        },
      },
    );
    await waitFor(() => expect(result.current.plan).not.toBeNull());
    expect(result.current.plan?.missing.map((item) => item.name)).toEqual(['x:1|:y']);

    // Antes: as duas listas geravam a mesma chave ':x:1|:y:2' e o plano ficava velho.
    rerender({
      items: [
        { productId: null, name: 'x', quantity: 1 },
        { productId: null, name: 'y', quantity: 2 },
      ],
      mixMode: 'misturar',
    });
    expect(result.current.plan?.missing.map((item) => item.name)).toEqual(['x', 'y']);
  });

  it('sem linhas com quantidade: sem plano e sem carregar', async () => {
    const { result } = renderHookWithProviders(
      (props: UseFreightPlanInput) => useFreightPlan(props),
      {
        initialProps: { items: [{ productId: 'caderneta', quantity: 0 }], mixMode: 'misturar' },
      },
    );
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.plan).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('parâmetros de frete ausentes viram erro, sem plano', async () => {
    h.settings.get.mockResolvedValue(null);
    const { result } = renderHookWithProviders(
      (props: UseFreightPlanInput) => useFreightPlan(props),
      {
        initialProps: entrada(10),
      },
    );
    await waitFor(() => expect(result.current.error).not.toBeNull());

    expect(result.current.error?.message).toBe('Os parâmetros de frete não estão disponíveis.');
    expect(result.current.plan).toBeNull();
  });

  it('falha ao ler as caixas vira erro, sem plano', async () => {
    h.boxes.listActive.mockRejectedValue(new Error('falhou'));
    const { result } = renderHookWithProviders(
      (props: UseFreightPlanInput) => useFreightPlan(props),
      {
        initialProps: entrada(10),
      },
    );
    await waitFor(() => expect(result.current.error).not.toBeNull());

    expect(result.current.plan).toBeNull();
  });
});
