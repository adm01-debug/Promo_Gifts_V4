/**
 * Conferência do total do pedido (`orders`) contra a soma dos itens
 * (`order_items`).
 *
 * Leitura apenas. Os pedidos do PromoGifts são gravados por sistema externo
 * (decisão de produto "Caminho C", PR #99 — a UI de pedidos saiu e as tabelas
 * `orders`/`order_items` ficaram como ponte). Este serviço existe para que,
 * quando essa integração escrever em `orders`, o total gravado possa ser
 * conferido contra os itens antes de virar número de negócio.
 *
 * Tipos alinhados ao schema real de produção (`doufsxqlfjyuvxuezpln`):
 * `orders.total` e `order_items.subtotal` são NOT NULL; `orders.status`,
 * `order_items.order_id` e `order_items.product_name` são nullable.
 */
import { supabase } from '@/integrations/supabase/client';

export interface OrderLookupItem {
  id: string;
  order_id: string | null;
  product_id: string | null;
  product_name: string | null;
  quantity: number;
  unit_price: number;
  discount_amount: number | null;
  personalization_cost: number | null;
  subtotal: number;
  created_at: string;
}

export interface OrderLookup {
  id: string;
  order_number: string;
  status: string | null;
  total: number;
  subtotal: number | null;
  shipping_cost: number | null;
  tax_amount: number | null;
  discount_amount: number | null;
  created_at: string;
  updated_at: string;
  items: OrderLookupItem[];
  /** Soma arredondada dos `subtotal` dos itens do pedido. */
  computedItemsSubtotal: number;
  /** Total que o pedido deveria ter: itens − desconto + frete + imposto. */
  expectedCheckoutTotal: number;
  /** `false` quando o total gravado não fecha com os itens. */
  checkoutConsistent: boolean;
}

/** Arredondamento monetário de 2 casas (half-up), igual ao usado em orçamentos. */
const round2 = (value: number): number => Math.round((value + Number.EPSILON) * 100) / 100;

export const orderService = {
  /**
   * Busca um pedido visível para o usuário atual e confere o total.
   * Retorna `null` quando o pedido não existe ou a RLS não o expõe.
   */
  async fetchOrderForCurrentSeller(orderId: string): Promise<OrderLookup | null> {
    const { data: order, error: orderError } = await supabase
      // rls-allow: policy orders_select escopa por can_view_all_sales() OR (supervisor + org) OR seller_id = auth.uid() — lookup por id devolve null quando o pedido não é do vendedor.
      .from('orders')
      .select(
        'id, order_number, status, total, subtotal, shipping_cost, tax_amount, discount_amount, created_at, updated_at',
      )
      .eq('id', orderId)
      .maybeSingle();

    if (orderError) throw orderError;
    if (!order) return null;

    const { data: items, error: itemsError } = await supabase
      .from('order_items')
      .select(
        'id, order_id, product_id, product_name, quantity, unit_price, discount_amount, personalization_cost, subtotal, created_at',
      )
      .eq('order_id', orderId)
      .order('created_at', { ascending: true });

    if (itemsError) throw itemsError;

    const normalizedItems: OrderLookupItem[] = items ?? [];
    const computedItemsSubtotal = round2(
      normalizedItems.reduce((sum, item) => sum + item.subtotal, 0),
    );
    const expectedCheckoutTotal = round2(
      computedItemsSubtotal -
        (order.discount_amount ?? 0) +
        (order.shipping_cost ?? 0) +
        (order.tax_amount ?? 0),
    );

    return {
      ...order,
      items: normalizedItems,
      computedItemsSubtotal,
      expectedCheckoutTotal,
      checkoutConsistent: round2(order.total) === expectedCheckoutTotal,
    };
  },
};
