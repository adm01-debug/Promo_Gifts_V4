/**
 * Invalidação de cache das telas de orçamento.
 *
 * A coluna "itens" da lista, o widget de pedidos de desconto e o limite de
 * desconto do vendedor leem o MESMO dado que as mutations de orçamento alteram,
 * cada um com a própria chave. Invalidar só `['quotes']` deixava esses números
 * mostrando o estado anterior por 30–60 s (ACH-036, ACH-041).
 */
import type { QueryClient } from '@tanstack/react-query';

/**
 * Chaves de leitura dependentes de dados de orçamento. `['quotes']` cobre por
 * prefixo as variações (`['quotes', userId, scope]`, `['quotes', 'viewed-map']`).
 * `SELLER_DISCOUNT_LIMITS_KEY` e `['my-discount-requests-widget']` estão
 * duplicadas aqui porque os módulos donos não podem ser importados por este
 * arquivo sem criar ciclo; o teste do arquivo garante que continuam iguais.
 */
export const QUOTE_DEPENDENT_QUERY_KEYS: ReadonlyArray<readonly unknown[]> = [
  ['quotes'],
  ['quote-item-counts'],
  ['my-discount-requests-widget'],
  ['seller-discount-limits'],
];

type QueryInvalidator = Pick<QueryClient, 'invalidateQueries'>;

/** Invalida, de uma vez, tudo que depende de dados de orçamento. */
export function invalidateQuoteCaches(queryClient: QueryInvalidator): void {
  for (const queryKey of QUOTE_DEPENDENT_QUERY_KEYS) {
    void queryClient.invalidateQueries({ queryKey });
  }
}
