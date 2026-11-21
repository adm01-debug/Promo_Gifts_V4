/**
 * useKitFreightPlan — plano de volumes do kit do kit builder.
 *
 * O kit monta a própria entrada do motor (kitToPackInput, etapa 51): com
 * caixa própria a peça é a caixa fechada (dims externas da caixa, peso =
 * caixa + Σ itens); sem caixa, os itens viram linhas do caminho normal. Por
 * isso o cálculo não passa por useFreightPlan (que só aceita linhas com
 * produto do catálogo): aqui o planFreight recebe os PlanInput já
 * montados, com as mesmas três fontes (medidas, caixas, parâmetros).
 *
 * Kit é por definição misto: kitToPackInput fixa mixMode: 'misturar' e o
 * número de kits vai em options.kitQuantity, igual à tela.
 */
import { useEffect, useMemo, useRef } from 'react';
import { useFreightSettings } from '@/hooks/freight/useFreightSettings';
import { useProductMeasures } from '@/hooks/freight/useProductMeasures';
import { useShippingBoxes } from '@/hooks/freight/useShippingBoxes';
import {
  computeItemsHash,
  kitToPackInput,
  planFreight,
  type FreightPlan,
  type IncompleteItem,
  type PlanOptions,
} from '@/lib/freight';
import { trackFreightPlanComputed } from '@/lib/freight/telemetry';
import type { FreightKit } from '@/lib/freight/fromKit';
import type { UseFreightPlanResult } from './useFreightPlan';

const NO_UNAVAILABLE: UseFreightPlanResult['unavailable'] = [];

function planInsuficiente(
  missing: IncompleteItem[],
  warnings: string[],
  base: Pick<PlanOptions, 'computedAt' | 'itemsHash' | 'kitQuantity' | 'mixMode'>,
): FreightPlan {
  return {
    status: 'dados_insuficientes',
    volumes: [],
    totals: {
      boxesByCode: {},
      grossWeightG: 0,
      volumeM3: 0,
      cubicWeightG: { correios: 0, rodoviario: 0 },
    },
    warnings,
    missing,
    mixMode: base.mixMode,
    computedAt: base.computedAt,
    itemsHash: base.itemsHash,
  };
}

export function useKitFreightPlan(kit: FreightKit, kitQuantity: number): UseFreightPlanResult {
  const productIds = useMemo(() => {
    const ids = new Set<string>();
    for (const item of kit.items) ids.add(item.id);
    if (kit.box) ids.add(kit.box.id);
    return [...ids];
  }, [kit.box, kit.items]);

  const measuresQuery = useProductMeasures(productIds);
  const boxesQuery = useShippingBoxes();
  const settingsQuery = useFreightSettings();

  const { measures } = measuresQuery;
  const { boxes } = boxesQuery;
  const { settings } = settingsQuery;

  const isLoading = measuresQuery.isLoading || boxesQuery.isLoading || settingsQuery.isLoading;
  const loadError =
    (measuresQuery.hasData ? null : measuresQuery.error) ??
    (boxes.length > 0 ? null : boxesQuery.error) ??
    (settings ? null : settingsQuery.error);
  const missingSettings = !isLoading && !loadError && settings === null;

  const computed = useMemo<Pick<UseFreightPlanResult, 'plan' | 'unavailable'>>(() => {
    if (isLoading || loadError || !settings) {
      return { plan: null, unavailable: NO_UNAVAILABLE };
    }

    const resultado = kitToPackInput(kit, kitQuantity, measures);
    const base = {
      mixMode: 'misturar' as const,
      kitQuantity,
      computedAt: new Date().toISOString(),
      itemsHash: computeItemsHash(
        kit.items.map((item) => ({
          productId: item.id,
          quantity: item.quantity * kitQuantity,
        })),
      ),
    };

    if (resultado.status === 'error') {
      return {
        plan: planInsuficiente([], [resultado.error.message], base),
        unavailable: NO_UNAVAILABLE,
      };
    }
    if (resultado.status === 'incomplete') {
      return { plan: planInsuficiente(resultado.missing, [], base), unavailable: NO_UNAVAILABLE };
    }

    return {
      plan: planFreight(resultado.inputs, boxes, base, settings),
      unavailable: NO_UNAVAILABLE,
    };
  }, [isLoading, loadError, settings, kit, kitQuantity, measures, boxes]);

  const plan = computed.plan;
  const prevPlanRef = useRef<FreightPlan | null>(null);
  useEffect(() => {
    if (!plan || plan === prevPlanRef.current) return;
    prevPlanRef.current = plan;
    trackFreightPlanComputed(plan, 'kit');
  }, [plan]);

  const error =
    loadError ??
    (missingSettings ? new Error('Os parâmetros de frete não estão disponíveis.') : null);

  return {
    plan: computed.plan,
    products: measures,
    unavailable: computed.unavailable,
    isLoading,
    error,
  };
}
