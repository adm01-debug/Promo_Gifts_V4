/**
 * Ordena e rotula as opções de frete devolvidas pela cotação (etapa 85).
 *
 * Puro: datas entram como `AAAA-MM-DD`, feriados como lista, nada de relógio.
 * Erro de entrada é **devolvido**, nunca lançado.
 *
 * - `cheapest`: menor preço; empate → menor prazo.
 * - `fastest`: menor prazo; empate → menor preço.
 * - `arrivalDate`: `addBusinessDays(readyDate, transit_business_days)`. O
 *   `delivery_date` que a transportadora possa mandar é ignorado: a chegada
 *   precisa sair do mesmo calendário (feriados da Promo) da data de produção.
 * - `onTime`: só existe com data pedida (`null` sem ela); chega no dia pedido
 *   ou antes.
 * - `recommended`: a mais barata entre as que chegam a tempo; se nenhuma chega,
 *   a mais rápida, e `noneOnTime` fica `true`. Sem data pedida não há prazo a
 *   cumprir (`noneOnTime` é `false`), então a recomendada é a mais barata.
 *
 * Empate total (mesmo preço e mesmo prazo) mantém a ordem em que as opções
 * chegaram.
 */
import { addBusinessDays, type IsoDate } from '@/lib/lead-time';

import type { QuoteOption } from './quoteContract';

export interface RankQuotesParams {
  /** Quando a produção termina e a carga fica pronta para coleta. */
  readyDate: IsoDate;
  /** Data que o cliente pediu; ausente = sem prazo a cumprir. */
  requestedDate?: IsoDate | null;
  holidays: readonly IsoDate[];
}

export interface RankedQuote {
  option: QuoteOption;
  arrivalDate: IsoDate;
  /** `null` quando não há data pedida. */
  onTime: boolean | null;
}

export type RankQuotesResult =
  | {
      status: 'ok';
      /** Por preço crescente (empate: menor prazo). */
      ranked: RankedQuote[];
      cheapest: RankedQuote;
      fastest: RankedQuote;
      recommended: RankedQuote;
      noneOnTime: boolean;
    }
  | { status: 'error'; code: 'invalid_input' | 'no_options'; message: string };

function byPriceThenTransit(a: RankedQuote, b: RankedQuote): number {
  return (
    a.option.price_brl - b.option.price_brl ||
    a.option.transit_business_days - b.option.transit_business_days
  );
}

function byTransitThenPrice(a: RankedQuote, b: RankedQuote): number {
  return (
    a.option.transit_business_days - b.option.transit_business_days ||
    a.option.price_brl - b.option.price_brl
  );
}

function melhorPor(
  compare: (a: RankedQuote, b: RankedQuote) => number,
): (best: RankedQuote, candidate: RankedQuote) => RankedQuote {
  return (best, candidate) => (compare(candidate, best) < 0 ? candidate : best);
}

export function rankQuotes(
  options: readonly QuoteOption[],
  params: RankQuotesParams,
): RankQuotesResult {
  if (options.length === 0) {
    return {
      status: 'error',
      code: 'no_options',
      message: 'A cotação não trouxe nenhuma opção de frete.',
    };
  }

  const negativa = options.find((option) => option.transit_business_days < 0);
  if (negativa) {
    return {
      status: 'error',
      code: 'invalid_input',
      message: `Prazo negativo na opção ${negativa.option_id}: ${negativa.transit_business_days} dias úteis.`,
    };
  }

  const requestedDate = params.requestedDate ?? null;
  if (requestedDate !== null) {
    // Prazo 0 não anda: serve só para validar a data pedida e os feriados.
    const checked = addBusinessDays(requestedDate, 0, params.holidays);
    if (!checked.ok) {
      return { status: 'error', code: 'invalid_input', message: checked.issue.message };
    }
  }

  const all: RankedQuote[] = [];
  for (const option of options) {
    const arrival = addBusinessDays(
      params.readyDate,
      option.transit_business_days,
      params.holidays,
    );
    if (!arrival.ok) {
      return { status: 'error', code: 'invalid_input', message: arrival.issue.message };
    }
    all.push({
      option,
      arrivalDate: arrival.value,
      onTime: requestedDate === null ? null : arrival.value <= requestedDate,
    });
  }

  // `sort` é estável: empate total mantém a ordem de chegada. Nos `reduce`, só
  // um candidato estritamente melhor troca o escolhido, com o mesmo efeito.
  const ranked = [...all].sort(byPriceThenTransit);
  const cheapest = all.reduce(melhorPor(byPriceThenTransit));
  const fastest = all.reduce(melhorPor(byTransitThenPrice));

  const onTime = all.filter((quote) => quote.onTime === true);
  const noneOnTime = requestedDate !== null && onTime.length === 0;
  let recommended = cheapest;
  if (requestedDate !== null) {
    recommended = onTime.length > 0 ? onTime.reduce(melhorPor(byPriceThenTransit)) : fastest;
  }

  return { status: 'ok', ranked, cheapest, fastest, recommended, noneOnTime };
}
