/**
 * Aba inicial do painel de estoque usada como default de `useListUrlState`.
 *
 * Distingue dois cenários:
 * 1. URL já tem ?tab → devolve 'overview' (default estável do app) para que a
 *    normalização do hook mantenha qualquer valor diferente de 'overview' (ex:
 *    'reliability') intacto — preservando URLs compartilháveis.
 * 2. URL não tem ?tab → devolve a preferência salva (localStorage) como valor
 *    inicial, sem envolver a normalização (não há parâmetro para remover).
 */
export function initialStockTab<T extends string>(
  reliabilityFlag: boolean,
  readPref: () => T,
  search = typeof window !== 'undefined' ? window.location.search : '',
): T | 'overview' {
  if (!reliabilityFlag) return 'overview';
  if (new URLSearchParams(search).has('tab')) return 'overview';
  return readPref();
}
