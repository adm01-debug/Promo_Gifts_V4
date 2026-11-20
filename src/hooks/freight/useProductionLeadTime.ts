/**
 * `useProductionLeadTime` — prazo de produção de um orçamento (dias úteis e data
 * de "pronto para envio"). Só carrega dados; a regra está em `src/lib/lead-time`.
 *
 * Fontes (cada uma com seu cache):
 * - produto e padrão do fornecedor (`products` + `supplier_settings`): 1 hora;
 * - técnicas cadastradas e faixas da tabela de preço: 24 horas;
 * - feriados (`business_calendar`): 24 horas;
 * - folga interna e regra de várias personalizações (`freight_settings`): como os demais parâmetros.
 *
 * Item sem produto vinculado (`quote_items.product_id` nulo) fica fora do cálculo
 * e é contado em `unlinkedItems`, para a tela avisar. Personalização sem técnica
 * entra no cálculo e a biblioteca a devolve como pendência.
 */
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  FREIGHT_QUERY_KEYS,
  LEAD_TIME_STALE_TIME_MS,
  SUPPLIER_LEAD_TIME_STALE_TIME_MS,
} from '@/hooks/freight/keys';
import { useFreightSettings } from '@/hooks/freight/useFreightSettings';
import {
  computeProductionLeadTime,
  type IsoDate,
  type ProductionLeadTime,
  type QuoteLeadTimeItem,
} from '@/lib/lead-time';
import { todayInSaoPaulo } from '@/lib/lead-time/formatDate';
import { businessCalendarService } from '@/services/businessCalendarService';
import { productionLeadTimeService } from '@/services/productionLeadTimeService';

/** Personalização de um item (`quote_item_personalizations`). */
export interface LeadTimePersonalizationInput {
  /** quote_item_personalizations.technique_id (= print_area_techniques.id) */
  techniqueId: string | null;
  /** quote_item_personalizations.location_code */
  locationCode: string | null;
  /** quote_item_personalizations.personalized_quantity (null = quantidade do item) */
  quantity: number | null;
}

/** Item do orçamento (`quote_items`). */
export interface LeadTimeQuoteItemInput {
  productId: string | null;
  quantity: number;
  personalizations: readonly LeadTimePersonalizationInput[];
}

export interface UseProductionLeadTimeInput {
  items: readonly LeadTimeQuoteItemInput[];
  /** Dia civil da aprovação (America/Sao_Paulo); null = o prazo começa hoje. */
  approvedOn: IsoDate | null;
  /** Dia de hoje; omitido, vale o dia atual em America/Sao_Paulo. */
  today?: IsoDate;
}

export interface UseProductionLeadTimeResult {
  /** `null` enquanto carrega, com erro ou sem item vinculado a produto. */
  leadTime: ProductionLeadTime | null;
  /** Itens sem produto vinculado, que ficaram fora do cálculo. */
  unlinkedItems: number;
  isLoading: boolean;
  isError: boolean;
  refetch: () => Promise<unknown>;
}

function uniqueSorted(ids: readonly string[]): string[] {
  return [...new Set(ids)].sort();
}

export function useProductionLeadTime(
  input: UseProductionLeadTimeInput,
): UseProductionLeadTimeResult {
  const { items, approvedOn, today } = input;
  const linked = useMemo(() => items.filter((item) => item.productId !== null), [items]);
  const productIds = useMemo(
    () => uniqueSorted(linked.flatMap((item) => (item.productId === null ? [] : [item.productId]))),
    [linked],
  );
  const enabled = productIds.length > 0;

  const freight = useFreightSettings();
  const suppliers = useQuery({
    queryKey: FREIGHT_QUERY_KEYS.productionLeadTime.suppliers(productIds),
    queryFn: () => productionLeadTimeService.listProductSuppliers(productIds),
    staleTime: SUPPLIER_LEAD_TIME_STALE_TIME_MS,
    enabled,
  });
  const personalization = useQuery({
    queryKey: FREIGHT_QUERY_KEYS.productionLeadTime.personalization(productIds),
    queryFn: () => productionLeadTimeService.getPersonalizationData(productIds),
    staleTime: LEAD_TIME_STALE_TIME_MS,
    enabled,
  });
  const holidays = useQuery({
    queryKey: FREIGHT_QUERY_KEYS.businessCalendar.holidays(),
    queryFn: async () => (await businessCalendarService.listAll()).map((row) => row.day),
    staleTime: LEAD_TIME_STALE_TIME_MS,
    enabled,
  });

  const settingsRow = freight.row;
  const supplierRows = suppliers.data;
  const personalizationData = personalization.data;
  const holidayDays = holidays.data;

  const leadTime = useMemo((): ProductionLeadTime | null => {
    if (!settingsRow || !supplierRows || !personalizationData || !holidayDays) return null;
    if (linked.length === 0) return null;

    const byProduct = new Map(supplierRows.map((row) => [row.productId, row]));
    const tableByTechnique = new Map(
      personalizationData.registrations.map((r) => [r.id, r.technique.tabelaPrecoId]),
    );

    const quoteItems: QuoteLeadTimeItem[] = linked.flatMap((item) => {
      if (item.productId === null) return [];
      const row = byProduct.get(item.productId);
      return [
        {
          quantity: item.quantity,
          product: { productId: item.productId, leadTimeDays: row?.leadTimeDays ?? null },
          supplier: row ? { defaultLeadTimeDays: row.supplierDefaultDays } : null,
          personalizations: item.personalizations.map((p) => ({
            // Sem a linha da técnica, o id vira "técnica desconhecida" e a biblioteca avisa a falta.
            techniqueId: (p.techniqueId !== null && tableByTechnique.get(p.techniqueId)) || '',
            locationCode: p.locationCode,
            quantity: p.quantity,
          })),
        },
      ];
    });

    return computeProductionLeadTime(
      { approvedOn, items: quoteItems },
      {
        internalBufferDays: settingsRow.internal_buffer_days,
        multiPersonalizationRule: settingsRow.multi_personalization_rule === 'sum' ? 'sum' : 'max',
        lookup: {
          techniques: personalizationData.registrations
            .filter((r) => r.isActive)
            .map((r) => r.technique),
          bands: personalizationData.bands,
        },
      },
      holidayDays,
      today ?? todayInSaoPaulo(),
    );
  }, [settingsRow, supplierRows, personalizationData, holidayDays, linked, approvedOn, today]);

  const queries = [suppliers, personalization, holidays];
  return {
    leadTime,
    unlinkedItems: items.length - linked.length,
    isLoading: enabled && (freight.isLoading || queries.some((q) => q.isLoading)),
    isError: freight.isError || queries.some((q) => q.isError),
    refetch: async () => {
      await Promise.all([freight.refetch(), ...queries.map((q) => q.refetch())]);
    },
  };
}
