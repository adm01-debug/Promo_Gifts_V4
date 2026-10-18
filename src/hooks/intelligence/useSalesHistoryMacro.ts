/**
 * Hook para Vendas Internas MACRO (agregadas de todos os vendedores/produtos).
 * Consome: quote_items + order_items do banco local.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useSalesScope } from '@/lib/auth/visibility-scope';
import { fetchAllPages } from '@/lib/db/fetch-all-pages';
import { logger } from '@/lib/logger';
import {
  emptyKpis,
  type DailySalesPoint,
  type SalesKpis,
  type SellerRanking,
} from '@/hooks/intelligence/useSalesHistory';

export function useSalesHistoryMacro(days = 30) {
  const { user } = useAuth();
  const scope = useSalesScope();

  return useQuery({
    queryKey: ['sales-history-macro', days, scope, user?.id],
    queryFn: async (): Promise<{ daily: DailySalesPoint[]; kpis: SalesKpis }> => {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);
      const cutoffStr = cutoff.toISOString();

      // Vendedor: pré-filtrar quotes/orders pelo seller_id e só então buscar
      // os items relacionados, evitando baixar 5000 linhas de outros vendedores.
      let scopedQuoteIds: string[] | null = null;
      let scopedOrderIds: string[] | null = null;
      if (scope === 'self' && user?.id) {
        // fetchAllPages: o PostgREST trunca em max-rows (1000) — o .limit(2000)
        // anterior truncava silenciosamente.
        const [myQuotes, myOrders] = await Promise.all([
          fetchAllPages<{ id: string }>((from, to) =>
            supabase
              .from('quotes')
              .select('id')
              .eq('seller_id', user.id)
              .gte('created_at', cutoffStr)
              .order('id', { ascending: true })
              .range(from, to),
          ).catch(() => []),
          fetchAllPages<{ id: string }>((from, to) =>
            supabase
              .from('orders')
              .select('id')
              .eq('seller_id', user.id)
              .gte('created_at', cutoffStr)
              .order('id', { ascending: true })
              .range(from, to),
          ).catch(() => []),
        ]);
        scopedQuoteIds = myQuotes.map((r) => r.id);
        scopedOrderIds = myOrders.map((r) => r.id);
        if (scopedQuoteIds.length === 0 && scopedOrderIds.length === 0) {
          return { daily: [], kpis: emptyKpis() };
        }
      }

      // Fetch quote_items and order_items in parallel — restritos aos ids do vendedor quando aplicável.
      // `.in()` com centenas de ids estoura a querystring do PostgREST — lotes de 200;
      // o cap de 1000 linhas/request exige fetchAllPages em vez de .limit(5000).
      const fetchScopedItems = async <T>(
        table: 'order_items' | 'quote_items',
        fkColumn: 'order_id' | 'quote_id',
        select: string,
        scopedIds: string[] | null,
      ): Promise<T[]> => {
        const idBatches: (string[] | null)[] = [];
        if (scopedIds === null) {
          idBatches.push(null);
        } else if (scopedIds.length === 0) {
          idBatches.push(['__none__']);
        } else {
          for (let i = 0; i < scopedIds.length; i += 200) {
            idBatches.push(scopedIds.slice(i, i + 200));
          }
        }
        const rows: T[] = [];
        for (const batch of idBatches) {
          const page = await fetchAllPages<T>((from, to) => {
            let q = supabase
              .from(table)
              .select(select)
              .gte('created_at', cutoffStr)
              .order('created_at', { ascending: true })
              .order('id', { ascending: true })
              .range(from, to);
            if (batch) q = q.in(fkColumn, batch);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            return q as any;
          });
          rows.push(...page);
        }
        return rows;
      };

      const [quoteItems, orderItems] = await Promise.all([
        fetchScopedItems<{
          quantity: number | null;
          unit_price: number | null;
          subtotal: number | null;
          created_at: string | null;
          quote_id: string;
        }>(
          'quote_items',
          'quote_id',
          'quantity, unit_price, subtotal, created_at, quote_id',
          scopedQuoteIds,
        ).catch(() => []),
        fetchScopedItems<{
          quantity: number | null;
          unit_price: number | null;
          created_at: string | null;
          order_id: string | null;
        }>(
          'order_items',
          'order_id',
          'quantity, unit_price, created_at, order_id',
          scopedOrderIds,
        ).catch(() => []),
      ]);

      // Fetch quotes/orders for seller info + status
      const quoteIds = [...new Set((quoteItems || []).map((q) => q.quote_id))];
      const orderIds = [
        ...new Set((orderItems || []).map((o) => o.order_id).filter(Boolean)),
      ] as string[];

      // `.in()` com centenas de ids estoura a querystring do PostgREST — lotes de 200
      // (o slice(0, 500) anterior ainda gerava URLs acima do limite).
      const fetchDocsByIds = async (
        table: 'orders' | 'quotes',
        ids: string[],
        statuses?: string[],
      ) => {
        const rows: Array<{ id: string; seller_id: string | null; status: string | null }> = [];
        for (let i = 0; i < ids.length; i += 200) {
          let q = supabase
            // rls-allow: filtrado por seller_id explícito
            .from(table)
            .select('id, seller_id, status')
            .in('id', ids.slice(i, i + 200));
          if (statuses) q = q.in('status', statuses);
          const { data, error } = await q;
          if (error) {
            logger.warn(`[useSalesHistoryMacro] ${table} fetch failed:`, error);
            continue;
          }
          rows.push(...(data ?? []));
        }
        return rows;
      };

      const [quotesData, ordersData] = await Promise.all([
        fetchDocsByIds('quotes', quoteIds, [
          'sent',
          'approved',
          'rejected',
          'expired',
          'converted',
        ]),
        fetchDocsByIds('orders', orderIds),
      ]);

      const quotesMap: Record<string, { seller_id: string }> = {};
      for (const q of quotesData) quotesMap[q.id] = { seller_id: q.seller_id ?? '' };

      const ordersMap: Record<string, { seller_id: string }> = {};
      for (const o of ordersData) ordersMap[o.id] = { seller_id: o.seller_id ?? '' };

      // Seller names
      const allSellerIds = [
        ...new Set([
          ...Object.values(quotesMap).map((q) => q.seller_id),
          ...Object.values(ordersMap).map((o) => o.seller_id),
        ]),
      ];
      const sellerNames: Record<string, string> = {};
      if (allSellerIds.length > 0) {
        // BUG-SALESHISTORYMACRO-PROFILES-SELECT-SILENT-FAIL FIX: { data: profiles } without
        // error check — RLS failure silently left seller names as IDs in the chart legend.
        const { data: profiles, error: profErr } = await supabase
          .from('profiles')
          .select('user_id, full_name')
          .in('user_id', allSellerIds);
        if (profErr) {
          logger.warn(
            '[useSalesHistoryMacro] profile enrichment failed — showing user IDs:',
            profErr,
          );
        } else {
          for (const p of profiles || []) {
            if (p.user_id) sellerNames[p.user_id] = p.full_name || 'Vendedor';
          }
        }
      }

      // Aggregate daily
      const dailyMap = new Map<string, DailySalesPoint>();
      for (const qi of quoteItems || []) {
        if (!qi.created_at) continue;
        const date = qi.created_at.substring(0, 10);
        const entry = dailyMap.get(date) || {
          date,
          quotedQty: 0,
          orderedQty: 0,
          quotedValue: 0,
          orderedValue: 0,
          quoteCount: 0,
          orderCount: 0,
        };
        entry.quotedQty += qi.quantity || 0;
        entry.quotedValue += qi.subtotal ?? (qi.quantity ?? 0) * (qi.unit_price ?? 0);
        entry.quoteCount += 1;
        dailyMap.set(date, entry);
      }
      for (const oi of orderItems || []) {
        if (!oi.created_at) continue;
        const date = oi.created_at.substring(0, 10);
        const entry = dailyMap.get(date) || {
          date,
          quotedQty: 0,
          orderedQty: 0,
          quotedValue: 0,
          orderedValue: 0,
          quoteCount: 0,
          orderCount: 0,
        };
        entry.orderedQty += oi.quantity || 0;
        entry.orderedValue += (oi.quantity || 0) * (oi.unit_price || 0);
        entry.orderCount += 1;
        dailyMap.set(date, entry);
      }

      const daily = Array.from(dailyMap.values()).sort((a, b) => a.date.localeCompare(b.date));

      // Seller rankings
      const sellerMap = new Map<string, SellerRanking>();
      for (const qi of quoteItems || []) {
        const sellerId = quotesMap[qi.quote_id]?.seller_id;
        if (!sellerId) continue;
        const s = sellerMap.get(sellerId) || {
          sellerId,
          sellerName: sellerNames[sellerId] || 'Vendedor',
          totalQty: 0,
          totalValue: 0,
          quoteCount: 0,
          orderCount: 0,
        };
        s.totalQty += qi.quantity || 0;
        s.totalValue += qi.subtotal ?? (qi.quantity ?? 0) * (qi.unit_price ?? 0);
        s.quoteCount += 1;
        sellerMap.set(sellerId, s);
      }
      for (const oi of orderItems || []) {
        const sellerId = ordersMap[oi.order_id || '']?.seller_id;
        if (!sellerId) continue;
        const s = sellerMap.get(sellerId) || {
          sellerId,
          sellerName: sellerNames[sellerId] || 'Vendedor',
          totalQty: 0,
          totalValue: 0,
          quoteCount: 0,
          orderCount: 0,
        };
        s.totalQty += oi.quantity || 0;
        s.totalValue += (oi.quantity || 0) * (oi.unit_price || 0);
        s.orderCount += 1;
        sellerMap.set(sellerId, s);
      }

      const topSellers = Array.from(sellerMap.values())
        .sort((a, b) => b.totalValue - a.totalValue)
        .slice(0, 5);
      const totalQuotedQty = daily.reduce((s, d) => s + d.quotedQty, 0);
      const totalOrderedQty = daily.reduce((s, d) => s + d.orderedQty, 0);
      const totalQuotedValue = daily.reduce((s, d) => s + d.quotedValue, 0);
      const totalOrderedValue = daily.reduce((s, d) => s + d.orderedValue, 0);

      const uniqueQuoteIds = new Set((quoteItems || []).map((qi) => qi.quote_id));
      const uniqueOrderIds = new Set(
        (orderItems || []).filter((oi) => oi.order_id).map((oi) => oi.order_id),
      );

      return {
        daily,
        kpis: {
          totalQuotedQty,
          totalOrderedQty,
          totalQuotedValue,
          totalOrderedValue,
          conversionRate:
            uniqueQuoteIds.size > 0 ? (uniqueOrderIds.size / uniqueQuoteIds.size) * 100 : 0,
          uniqueSellers: sellerMap.size,
          avgOrderValue: uniqueOrderIds.size > 0 ? totalOrderedValue / uniqueOrderIds.size : 0,
          topSellers,
        },
      };
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!user,
  });
}
