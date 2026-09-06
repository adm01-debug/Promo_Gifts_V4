/**
 * Lançado por `useSellerCarts` quando o UPDATE condicionado por
 * `seller_carts.version` afeta 0 linhas: outra aba ou dispositivo salvou o
 * carrinho antes. O cache já foi invalidado ao lançar.
 */
export class CartVersionConflictError extends Error {
  readonly code = 'VERSION_CONFLICT';
  constructor() {
    super(
      'Este carrinho foi alterado em outra aba ou dispositivo. A lista foi atualizada — revise e tente de novo.',
    );
    this.name = 'CartVersionConflictError';
  }
}
