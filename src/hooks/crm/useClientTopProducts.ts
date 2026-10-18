import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { fetchAllPages } from '@/lib/db/fetch-all-pages';

interface ProductStat {
  sku: string | null;
  name: string;
  image: string | null;
  totalQuantity: number;
  totalValue: number;
  orderCount: number;
}

export function useClientTopProducts(clientId?: string) {
  return useQuery({
    queryKey: ['client-top-products', clientId],
    queryFn: async () => {
      if (!clientId) return [];

      // BUG-CLIENTTOPPRODUCTS-ORDERS-SELECT-SILENT-FAIL FIX: { data: orders } without error
      // check — RLS failure silently returned [] causing queryFn to succeed with empty data.
      // rls-allow: filtrado por client_id; RLS aplica seller scope
      const orders = await fetchAllPages<{ id: string }>((from, to) =>
        supabase
          .from('orders')
          .select('id')
          .eq('client_id', clientId)
          .order('id', { ascending: true })
          .range(from, to),
      );

      if (!orders.length) return [];

      const orderIds = orders.map((o) => o.id);

      // BUG-CLIENTTOPPRODUCTS-ITEMS-SELECT-SILENT-FAIL FIX: { data: items } without error
      // check — failure silently returned [] instead of letting TanStack Query retry.
      // `.in()` com centenas de ids estoura a querystring do PostgREST — lotes de 200.
      const items: Array<{
        product_sku: string | null;
        product_name: string | null;
        product_image_url: string | null;
        quantity: number | null;
        unit_price: number | null;
      }> = [];
      for (let i = 0; i < orderIds.length; i += 200) {
        const idBatch = orderIds.slice(i, i + 200);
        const batch = await fetchAllPages<{
          product_sku: string | null;
          product_name: string | null;
          product_image_url: string | null;
          quantity: number | null;
          unit_price: number | null;
        }>((from, to) =>
          supabase
            .from('order_items')
            .select('product_sku, product_name, product_image_url, quantity, unit_price')
            .in('order_id', idBatch)
            .order('id', { ascending: true })
            .range(from, to),
        );
        items.push(...batch);
      }

      if (!items.length) return [];

      const productStats = items.reduce<Record<string, ProductStat>>((acc, item) => {
        const key = item.product_sku || item.product_name;
        if (!key) return acc;
        if (!acc[key]) {
          acc[key] = {
            sku: item.product_sku,
            name: item.product_name || '',
            image: item.product_image_url,
            totalQuantity: 0,
            totalValue: 0,
            orderCount: 0,
          };
        }
        acc[key].totalQuantity += item.quantity ?? 0;
        acc[key].totalValue += (item.quantity ?? 0) * (item.unit_price ?? 0);
        acc[key].orderCount++;
        return acc;
      }, {});

      return Object.values(productStats)
        .sort((a, b) => b.totalValue - a.totalValue)
        .slice(0, 10);
    },
    enabled: !!clientId,
    staleTime: 10 * 60 * 1000,
  });
}
