import { addBusinessDays } from './businessDays';
import { resolvePersonalizationLeadTime } from './personalizationLeadTime';
import { resolveSupplierLeadTime } from './supplierLeadTime';
import type {
  IsoDate,
  ItemLeadTime,
  LeadTimeIssue,
  LeadTimeResult,
  ProductionLeadSettings,
  ProductionLeadTime,
  QuoteLeadTimeInput,
} from './types';

function blocked(missing: LeadTimeIssue[], perItem: ItemLeadTime[]): ProductionLeadTime {
  return { status: 'dados_insuficientes', perItem, totalDays: null, readyDate: null, missing };
}

/** Prazo total 0: pronto no próprio dia se for útil; senão no próximo dia útil (nunca promete data parada). */
function firstBusinessDayFrom(
  start: IsoDate,
  holidays: readonly IsoDate[],
): LeadTimeResult<IsoDate> {
  const previous = addBusinessDays(start, -1, holidays);
  return previous.ok ? addBusinessDays(previous.value, 1, holidays) : previous;
}

/**
 * Prazo de produção do pedido. Por item: fornecedor + personalização + folga
 * interna. O pedido espera o item mais demorado (`isCritical`; empate marca
 * todos). Começa na aprovação (ou em `today`) e pula fins de semana e feriados.
 * Qualquer dado faltante bloqueia: sem `readyDate` e com `missing` preenchido.
 */
export function computeProductionLeadTime(
  quote: QuoteLeadTimeInput,
  settings: ProductionLeadSettings,
  holidays: readonly IsoDate[],
  today: IsoDate,
): ProductionLeadTime {
  if (
    quote === null ||
    quote === undefined ||
    !Array.isArray(quote.items) ||
    settings === null ||
    settings === undefined ||
    quote.items.some((item) => item === null || item === undefined)
  ) {
    return blocked(
      [
        {
          code: 'invalid_input',
          message: 'O orçamento, os itens e a configuração do prazo são obrigatórios.',
          productId: null,
        },
      ],
      [],
    );
  }
  if (quote.items.length === 0) {
    return blocked(
      [
        {
          code: 'invalid_input',
          message: 'O orçamento não tem itens para calcular o prazo.',
          productId: null,
        },
      ],
      [],
    );
  }
  if (!Number.isInteger(settings.internalBufferDays) || settings.internalBufferDays < 0) {
    return blocked(
      [
        {
          code: 'invalid_input',
          message: 'A folga interna precisa ser um número inteiro de dias úteis, zero ou maior.',
          productId: null,
        },
      ],
      [],
    );
  }

  const missing: LeadTimeIssue[] = [];
  const perItem: ItemLeadTime[] = [];
  for (const item of quote.items) {
    const supplier = resolveSupplierLeadTime(item.product, item.supplier);
    if (!supplier.ok) missing.push(supplier.issue);
    if (!item.product) continue;
    const personalization = resolvePersonalizationLeadTime(
      { productId: item.product.productId, quantity: item.quantity },
      item.personalizations,
      settings.lookup,
      settings.multiPersonalizationRule,
    );
    if (!personalization.ok) missing.push(...personalization.issues);
    if (!supplier.ok || !personalization.ok) continue;
    perItem.push({
      productId: item.product.productId,
      supplierDays: supplier.value.days,
      supplierSource: supplier.value.source,
      personalizationDays: personalization.value.days,
      personalizationSource: personalization.value.source,
      bufferDays: settings.internalBufferDays,
      total: supplier.value.days + personalization.value.days + settings.internalBufferDays,
      isCritical: false,
    });
  }
  if (missing.length > 0) return blocked(missing, perItem);

  const totalDays = Math.max(...perItem.map((entry) => entry.total));
  const marked = perItem.map((entry) => ({ ...entry, isCritical: entry.total === totalDays }));
  const start = quote.approvedOn ?? today;
  const ready =
    totalDays === 0
      ? firstBusinessDayFrom(start, holidays)
      : addBusinessDays(start, totalDays, holidays);
  if (!ready.ok) return blocked([ready.issue], marked);
  return { status: 'ok', perItem: marked, totalDays, readyDate: ready.value, missing: [] };
}
