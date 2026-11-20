/**
 * Prazo de personalização por técnica (`print_area_techniques.production_days`),
 * em dias úteis. Vazio grava `null` (usa o prazo da faixa da tabela de preço).
 */
import type { PriceBandInput } from '@/lib/lead-time';

/** Mesmo teto do CHECK da coluna (migration 20261120041000). */
export const PRODUCTION_DAYS_MAX = 365;

export type ProductionDaysParse = { ok: false } | { ok: true; value: number | null };

/** `''` vira `null`; inteiro de 0 a 365 vira número; o resto é inválido. */
export function parseProductionDays(text: string): ProductionDaysParse {
  const trimmed = text.trim();
  if (trimmed === '') return { ok: true, value: null };
  if (!/^\d+$/.test(trimmed)) return { ok: false };
  const value = Number(trimmed);
  return value <= PRODUCTION_DAYS_MAX ? { ok: true, value } : { ok: false };
}

/**
 * Sugestão do campo vazio: o prazo das faixas da tabela de preço da técnica.
 * Um valor só = `tabela: N`; faixas com prazos diferentes = `tabela: 4 a 8`.
 */
export function tableLeadTimePlaceholder(
  bands: readonly PriceBandInput[],
  tabelaPrecoId: string,
): string {
  const days = bands
    .filter((band) => band.tabelaPrecoId === tabelaPrecoId && band.leadTimeDays !== null)
    .map((band) => band.leadTimeDays)
    .filter((value): value is number => value !== null);
  if (days.length === 0) return 'tabela: sem prazo';
  const shortest = Math.min(...days);
  const longest = Math.max(...days);
  return shortest === longest ? `tabela: ${shortest}` : `tabela: ${shortest} a ${longest}`;
}
