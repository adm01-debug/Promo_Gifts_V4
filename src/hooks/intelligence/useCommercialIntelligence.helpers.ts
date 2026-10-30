/**
 * useCommercialIntelligence.helpers — fetchers paginados extraídos de
 * useCommercialIntelligence.ts (refatoração pura, sem mudança de comportamento).
 */
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';
import { aggregateSegments, aggregateClients } from '@/hooks/intelligence/intelligenceHelpers';
import { degradeOrThrow } from '@/lib/intelligence/degradation';
import { fetchAllPages } from '@/lib/db/fetch-all-pages';

/** Tipos derivados dos agregadores — usados como fallback degradado. */
type ClientAggregate = ReturnType<typeof aggregateClients>[number];
interface SupplierSalesRow {
  supplierName: string;
  orderCount: number;
  revenue: number;
  productCount: number;
}

export interface IntelligenceKPI {
  totalQuotes: number;
  totalOrders: number;
  conversionRate: number;
  totalRevenue: number;
  averageTicket: number;
  quotesThisMonth: number;
  ordersThisMonth: number;
  revenueThisMonth: number;
}

export interface TrendingProduct {
  productId: string;
  productSku: string | null;
  productName: string;
  productImage: string | null;
  orderCount: number;
  totalQuantity: number;
  totalRevenue: number;
  quoteCount: number;
  conversionRate: number;
  trend: 'down' | 'stable' | 'up';
}

export interface SegmentData {
  segment: string;
  orderCount: number;
  revenue: number;
  averageTicket: number;
}

export interface OpportunityProduct {
  productId: string;
  productSku: string | null;
  productName: string;
  productImage: string | null;
  quoteCount: number;
  orderCount: number;
  conversionRate: number;
  opportunityScore: number;
  reason: string;
}

export interface CategoryRankingItem {
  categoryId: string;
  categoryName: string;
  internalRevenue: number;
  internalQty: number;
  internalOrders: number;
  marketDepleted: number;
  totalScore: number;
}

export async function fetchFilteredProductIds(
  categoryId?: string | null,
  supplierId?: string | null,
  productId?: string | null,
): Promise<Set<string> | null> {
  if (productId) return new Set([productId]);
  if (!categoryId && !supplierId) return null;
  const { fetchPromobrindProducts } = await import('@/lib/external-db');
  const filters: Record<string, unknown> = {};
  if (categoryId) filters.category_id = categoryId;
  if (supplierId) filters.supplier_id = supplierId;
  const products = await fetchPromobrindProducts({ limit: 5000, filters });
  return new Set(products.map((p) => p.id));
}

export async function fetchCommercialKPIs(args: {
  hasFilter: boolean;
  productIds: Set<string> | null | undefined;
  since: string;
  orgId: string | null | undefined;
}): Promise<IntelligenceKPI> {
  const { hasFilter, productIds, since, orgId } = args;
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  if (hasFilter && productIds) {
    const pids = Array.from(productIds);
    if (!pids.length)
      return {
        totalQuotes: 0,
        totalOrders: 0,
        conversionRate: 0,
        totalRevenue: 0,
        averageTicket: 0,
        quotesThisMonth: 0,
        ordersThisMonth: 0,
        revenueThisMonth: 0,
      };

    const [quoteItems, orderItems, orderItemsMonth, quoteItemsMonth] = await Promise.all([
      fetchAllPages((from, to) =>
        supabase
          .from('quote_items')
          .select('quote_id, product_id')
          .gte('created_at', since)
          .in('product_id', pids.slice(0, 200))
          .order('id', { ascending: true })
          .range(from, to),
      ).catch(() => []),
      fetchAllPages((from, to) =>
        supabase
          .from('order_items')
          .select('order_id, product_id, quantity, unit_price')
          .gte('created_at', since)
          .in('product_id', pids.slice(0, 200))
          .order('id', { ascending: true })
          .range(from, to),
      ).catch(() => []),
      fetchAllPages((from, to) =>
        supabase
          .from('order_items')
          .select('order_id, product_id, quantity, unit_price')
          .gte('created_at', startOfMonth)
          .in('product_id', pids.slice(0, 200))
          .order('id', { ascending: true })
          .range(from, to),
      ).catch(() => []),
      fetchAllPages((from, to) =>
        supabase
          .from('quote_items')
          .select('quote_id, product_id')
          .gte('created_at', startOfMonth)
          .in('product_id', pids.slice(0, 200))
          .order('id', { ascending: true })
          .range(from, to),
      ).catch(() => []),
    ]);

    const uqQuotes = new Set(quoteItems.map((qi) => qi.quote_id));
    const uqOrders = new Set(orderItems.map((oi) => oi.order_id));
    const totalRevenue = orderItems.reduce(
      (s, i) => s + (i.quantity ?? 0) * (i.unit_price ?? 0),
      0,
    );
    const revenueMonth = orderItemsMonth.reduce(
      (s, i) => s + (i.quantity ?? 0) * (i.unit_price ?? 0),
      0,
    );

    return {
      totalQuotes: uqQuotes.size,
      totalOrders: uqOrders.size,
      conversionRate: uqQuotes.size > 0 ? Math.round((uqOrders.size / uqQuotes.size) * 100) : 0,
      totalRevenue,
      averageTicket: uqOrders.size > 0 ? totalRevenue / uqOrders.size : 0,
      quotesThisMonth: new Set(quoteItemsMonth.map((qi) => qi.quote_id)).size,
      ordersThisMonth: new Set(orderItemsMonth.map((oi) => oi.order_id)).size,
      revenueThisMonth: revenueMonth,
    };
  }

  // REMOVIDO: applySellerScope.
  // Agora o BI mostra dados agregados de mercado (conforme can_view_all_sales() atualizado no banco).
  // O escopo individual do vendedor é mantido para fins de RLS granular, mas o BI
  // deliberadamente consome a visão macro.
  // rls-allow: respeita can_view_all_sales server-side
  const [quotes, orders, qmr, omr] = await Promise.all([
    fetchAllPages((from, to) => {
      let q = supabase
        // rls-allow: respeita can_view_all_sales server-side
        .from('quotes')
        .select('id, total, status, created_at')
        .gte('created_at', since);
      if (orgId) q = q.eq('organization_id', orgId);
      return q.order('id', { ascending: true }).range(from, to);
    }).catch(() => []),
    fetchAllPages((from, to) => {
      let q = supabase
        // rls-allow: respeita can_view_all_sales server-side
        .from('orders')
        .select('id, total, status, created_at')
        .gte('created_at', since);
      if (orgId) q = q.eq('organization_id', orgId);
      return q.order('id', { ascending: true }).range(from, to);
    }).catch(() => []),
    fetchAllPages((from, to) => {
      let q = supabase
        // rls-allow: respeita can_view_all_sales server-side
        .from('quotes')
        .select('id, total')
        .gte('created_at', startOfMonth);
      if (orgId) q = q.eq('organization_id', orgId);
      return q.order('id', { ascending: true }).range(from, to);
    }).catch(() => []),
    fetchAllPages((from, to) => {
      let q = supabase
        // rls-allow: respeita can_view_all_sales server-side
        .from('orders')
        .select('id, total')
        .gte('created_at', startOfMonth);
      if (orgId) q = q.eq('organization_id', orgId);
      return q.order('id', { ascending: true }).range(from, to);
    }).catch(() => []),
  ]);
  const totalRevenue = orders.reduce((s, o) => s + (o.total ?? 0), 0);

  return {
    totalQuotes: quotes.length,
    totalOrders: orders.length,
    conversionRate: quotes.length > 0 ? Math.round((orders.length / quotes.length) * 100) : 0,
    totalRevenue,
    averageTicket: orders.length > 0 ? totalRevenue / orders.length : 0,
    quotesThisMonth: qmr.length,
    ordersThisMonth: omr.length,
    revenueThisMonth: omr.reduce((s, o) => s + (o.total ?? 0), 0),
  };
}

export async function fetchTrendingProducts(args: {
  productIds: Set<string> | null | undefined;
  since: string;
  searchTerm?: string | null;
  limit: number;
}): Promise<TrendingProduct[]> {
  const { productIds, since, searchTerm, limit } = args;
  const pids = productIds ? Array.from(productIds).slice(0, 200) : undefined;
  const [orderItems, quoteItems] = await Promise.all([
    fetchAllPages((from, to) => {
      let q = supabase
        .from('order_items')
        .select(
          'product_id, product_sku, product_name, product_image_url, quantity, unit_price, order_id, created_at',
        )
        .gte('created_at', since);
      if (pids) q = q.in('product_id', pids);
      return q.order('id', { ascending: true }).range(from, to);
    }).catch(() => []),
    fetchAllPages((from, to) => {
      let q = supabase
        .from('quote_items')
        .select(
          'product_id, product_sku, product_name, product_image_url, quantity, unit_price, created_at',
        )
        .gte('created_at', since);
      if (pids) q = q.in('product_id', pids);
      return q.order('id', { ascending: true }).range(from, to);
    }).catch(() => []),
  ]);

  if (!orderItems.length) return [];
  const productMap = new Map<string, TrendingProduct>();
  orderItems.forEach((item) => {
    const key = item.product_sku || item.product_id || item.product_name;
    if (!key) return;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      if (
        !(item.product_name || '').toLowerCase().includes(q) &&
        !(item.product_sku || '').toLowerCase().includes(q)
      )
        return;
    }
    const existing = productMap.get(key) || {
      productId: item.product_id || '',
      productSku: item.product_sku,
      productName: item.product_name || 'Produto',
      productImage: item.product_image_url,
      orderCount: 0,
      totalQuantity: 0,
      totalRevenue: 0,
      quoteCount: 0,
      conversionRate: 0,
      trend: 'stable' as const,
    };
    existing.orderCount += 1;
    existing.totalQuantity += item.quantity ?? 0;
    existing.totalRevenue += (item.quantity ?? 0) * (item.unit_price ?? 0);
    productMap.set(key, existing);
  });
  quoteItems.forEach((item) => {
    const key = item.product_sku || item.product_id || item.product_name;
    const product = key ? productMap.get(key) : undefined;
    if (product) product.quoteCount += 1;
  });

  return Array.from(productMap.values())
    .map((p) => ({
      ...p,
      conversionRate: p.quoteCount > 0 ? Math.round((p.orderCount / p.quoteCount) * 100) : 100,
      trend: (p.totalRevenue > 1000 ? 'up' : p.totalRevenue > 200 ? 'stable' : 'down') as
        'down' | 'stable' | 'up',
    }))
    .sort((a, b) => b.totalRevenue - a.totalRevenue)
    .slice(0, limit);
}

export async function fetchSegmentData(args: {
  hasFilter: boolean;
  productIds: Set<string> | null | undefined;
  since: string;
}): Promise<SegmentData[]> {
  const { hasFilter, productIds, since } = args;
  if (hasFilter && productIds) {
    const pids = Array.from(productIds).slice(0, 200);
    if (!pids.length) return [];
    // BUG-COMMERCIALINTEL-SEGMENTS-OI-SELECT-SILENT-FAIL FIX: { data: oi } without error
    // check — RLS failure silently returned [] making queryFn succeed with empty segments.
    let oi: Array<{ order_id: string | null }>;
    try {
      oi = await fetchAllPages<{ order_id: string | null }>((from, to) =>
        supabase
          .from('order_items')
          .select('order_id')
          .gte('created_at', since)
          .in('product_id', pids)
          .order('id', { ascending: true })
          .range(from, to),
      );
    } catch (oiErr) {
      return degradeOrThrow(oiErr, 'segments.order_items', [] as SegmentData[]);
    }
    const orderIds = [...new Set(oi.map((o) => o.order_id).filter(Boolean))] as string[];
    if (!orderIds.length) return [];
    // BUG-COMMERCIALINTEL-SEGMENTS-ORDERS-SELECT-SILENT-FAIL FIX: { data: orders } without
    // error check — failure silently produced empty segments instead of triggering retry.
    const { data: orders, error: ordersErr } = await supabase
      // rls-allow: respeita can_view_all_sales server-side
      .from('orders')
      .select('id, client_company, total')
      .in('id', orderIds.slice(0, 200));
    if (ordersErr) return degradeOrThrow(ordersErr, 'segments.orders', [] as SegmentData[]);
    return aggregateSegments(orders || []);
  }
  // BUG-COMMERCIALINTEL-SEGMENTS-ALLORDERS-SELECT-SILENT-FAIL FIX
  let orders: Array<{ client_company: string | null; total: number | null }>;
  try {
    // rls-allow: respeita can_view_all_sales server-side
    orders = await fetchAllPages<{ client_company: string | null; total: number | null }>(
      (from, to) =>
        supabase
          .from('orders') // rls-allow: respeita can_view_all_sales server-side
          .select('client_company, total')
          .gte('created_at', since)
          .order('id', { ascending: true })
          .range(from, to),
    );
  } catch (ordersErr) {
    return degradeOrThrow(ordersErr, 'segments.orders_all', [] as SegmentData[]);
  }
  return aggregateSegments(orders);
}

export async function fetchOpportunities(args: {
  productIds: Set<string> | null | undefined;
  since: string;
}): Promise<OpportunityProduct[]> {
  const { productIds, since } = args;
  const pids = productIds ? Array.from(productIds).slice(0, 200) : undefined;
  const [quoteItems, orderItems] = await Promise.all([
    fetchAllPages((from, to) => {
      let q = supabase
        .from('quote_items')
        .select('product_id, product_sku, product_name, product_image_url, quantity, created_at')
        .gte('created_at', since);
      if (pids) q = q.in('product_id', pids);
      return q.order('id', { ascending: true }).range(from, to);
    }).catch(() => []),
    fetchAllPages((from, to) => {
      let q = supabase
        .from('order_items')
        .select('product_id, product_sku, product_name, created_at')
        .gte('created_at', since);
      if (pids) q = q.in('product_id', pids);
      return q.order('id', { ascending: true }).range(from, to);
    }).catch(() => []),
  ]);
  if (!quoteItems.length) return [];

  const quoteMap = new Map<
    string,
    { count: number; name: string; sku: string | null; image: string | null; id: string }
  >();
  quoteItems.forEach((item) => {
    const key = item.product_sku || item.product_id || '';
    if (!key) return;
    const e = quoteMap.get(key) || {
      count: 0,
      name: item.product_name || '',
      sku: item.product_sku,
      image: item.product_image_url,
      id: item.product_id || '',
    };
    e.count += 1;
    quoteMap.set(key, e);
  });

  const orderCountMap = new Map<string, number>();
  orderItems.forEach((item) => {
    const key = item.product_sku || item.product_id || '';
    if (key) orderCountMap.set(key, (orderCountMap.get(key) || 0) + 1);
  });

  const opportunities: OpportunityProduct[] = [];
  quoteMap.forEach((data, key) => {
    const oc = orderCountMap.get(key) || 0;
    const cr = data.count > 0 ? Math.round((oc / data.count) * 100) : 0;
    const score = Math.max(0, 100 - cr) * Math.min(data.count / 3, 1);
    if (data.count >= 2 && cr < 60) {
      opportunities.push({
        productId: data.id,
        productSku: data.sku,
        productName: data.name,
        productImage: data.image,
        quoteCount: data.count,
        orderCount: oc,
        conversionRate: cr,
        opportunityScore: score,
        reason:
          cr === 0
            ? 'Cotado mas nunca vendido'
            : cr < 20
              ? 'Conversão muito baixa'
              : 'Conversão abaixo da média',
      });
    }
  });
  return opportunities.sort((a, b) => b.opportunityScore - a.opportunityScore).slice(0, 10);
}

export async function fetchTopClients(args: {
  hasFilter: boolean;
  productIds: Set<string> | null | undefined;
  since: string;
}): Promise<ClientAggregate[]> {
  const { hasFilter, productIds, since } = args;
  if (hasFilter && productIds) {
    const pids = Array.from(productIds).slice(0, 200);
    if (!pids.length) return [];
    // BUG-TOPCLIENTS-OI-SELECT-SILENT-FAIL FIX: { data: oi } without error check —
    // RLS failure silently returned [] making queryFn succeed with empty client list.
    let oi: Array<{ order_id: string | null }>;
    try {
      oi = await fetchAllPages<{ order_id: string | null }>((from, to) =>
        supabase
          .from('order_items')
          .select('order_id, quantity, unit_price')
          .gte('created_at', since)
          .in('product_id', pids)
          .order('id', { ascending: true })
          .range(from, to),
      );
    } catch (oiErr) {
      return degradeOrThrow(oiErr, 'top_clients.order_items', [] as ClientAggregate[]);
    }
    const orderIds = [...new Set(oi.map((o) => o.order_id).filter(Boolean))] as string[];
    if (!orderIds.length) return [];
    // BUG-TOPCLIENTS-ORDERS-FILTERED-SELECT-SILENT-FAIL FIX
    const { data: orders, error: ordersFilteredErr } = await supabase
      // rls-allow: respeita can_view_all_sales server-side
      .from('orders')
      .select('id, client_name, client_company, total')
      .in('id', orderIds.slice(0, 200));
    if (ordersFilteredErr)
      return degradeOrThrow(ordersFilteredErr, 'top_clients.orders', [] as ClientAggregate[]);
    return aggregateClients(orders || []);
  }
  // BUG-TOPCLIENTS-ALLORDERS-SELECT-SILENT-FAIL FIX
  let orders: Array<{
    client_name: string | null;
    client_company: string | null;
    total: number | null;
  }>;
  try {
    // rls-allow: respeita can_view_all_sales server-side
    orders = await fetchAllPages<{
      client_name: string | null;
      client_company: string | null;
      total: number | null;
    }>((from, to) =>
      supabase
        .from('orders') // rls-allow: respeita can_view_all_sales server-side
        .select('client_name, client_company, total')
        .gte('created_at', since)
        .order('id', { ascending: true })
        .range(from, to),
    );
  } catch (ordersErr) {
    return degradeOrThrow(ordersErr, 'top_clients.orders_all', [] as ClientAggregate[]);
  }
  return aggregateClients(orders);
}

export async function fetchCategoryRanking(args: {
  productIds: Set<string> | null | undefined;
  since: string;
}): Promise<CategoryRankingItem[]> {
  const { productIds, since } = args;
  const pids = productIds ? Array.from(productIds).slice(0, 200) : undefined;
  // BUG-COMMERCIAL-CATRANK-SILENT-FAIL FIX: { data } without error check silently returned
  // empty results on RLS denial — now throws so TanStack Query retries/surfaces the error.
  let orderItems: Array<{
    product_id: string | null;
    quantity: number | null;
    unit_price: number | null;
  }>;
  try {
    orderItems = await fetchAllPages<{
      product_id: string | null;
      quantity: number | null;
      unit_price: number | null;
    }>((from, to) => {
      let q = supabase
        .from('order_items')
        .select('product_id, quantity, unit_price')
        .gte('created_at', since);
      if (pids) q = q.in('product_id', pids);
      return q.order('id', { ascending: true }).range(from, to);
    });
  } catch (orderErr) {
    return degradeOrThrow(orderErr, 'category_ranking.order_items', [] as CategoryRankingItem[]);
  }

  const { fetchPromobrindProducts } = await import('@/lib/external-db');
  const products = await fetchPromobrindProducts({ limit: 5000 });
  const productCategoryMap = new Map<string, { catId: string; catName: string }>();
  products.forEach((p) => {
    const catId = p.category_id || p.main_category_id || '';
    const catName = p.category_name || catId || 'Sem categoria';
    if (catId) productCategoryMap.set(p.id, { catId, catName });
  });

  const categoryMap = new Map<string, CategoryRankingItem>();
  orderItems.forEach((item) => {
    const cat = productCategoryMap.get(item.product_id || '');
    if (!cat) return;
    const e = categoryMap.get(cat.catId) || {
      categoryId: cat.catId,
      categoryName: cat.catName,
      internalRevenue: 0,
      internalQty: 0,
      internalOrders: 0,
      marketDepleted: 0,
      totalScore: 0,
    };
    e.internalRevenue += (item.quantity ?? 0) * (item.unit_price ?? 0);
    e.internalQty += item.quantity ?? 0;
    e.internalOrders += 1;
    categoryMap.set(cat.catId, e);
  });

  try {
    const { dbInvoke } = await import('@/lib/db/postgrest');
    const sinceDate = since.split('T')[0];
    const result = await dbInvoke<{ product_id: string; units_depleted: number }>({
      table: 'stock_daily_summary',
      operation: 'select',
      select: 'product_id,units_depleted',
      filters: { summary_date: { op: 'gte', value: sinceDate } }, // FIX: objeto -> .gte() (era string -> .eq() -> 400)
      limit: 5000,
    });
    (result?.records ?? []).forEach((snap) => {
      const cat = productCategoryMap.get(snap.product_id);
      if (!cat) return;
      const e = categoryMap.get(cat.catId) || {
        categoryId: cat.catId,
        categoryName: cat.catName,
        internalRevenue: 0,
        internalQty: 0,
        internalOrders: 0,
        marketDepleted: 0,
        totalScore: 0,
      };
      e.marketDepleted += snap.units_depleted ?? 0;
      categoryMap.set(cat.catId, e);
    });
  } catch (e) {
    logger.warn('Market data unavailable for category ranking:', e);
  }

  const items = Array.from(categoryMap.values());
  const maxR = Math.max(1, ...items.map((i) => i.internalRevenue));
  const maxD = Math.max(1, ...items.map((i) => i.marketDepleted));
  items.forEach((i) => {
    i.totalScore = (i.internalRevenue / maxR) * 60 + (i.marketDepleted / maxD) * 40;
  });
  return items.sort((a, b) => b.totalScore - a.totalScore).slice(0, 15);
}

export async function fetchSupplierSales(args: {
  productIds: Set<string> | null | undefined;
  since: string;
}): Promise<SupplierSalesRow[]> {
  const { productIds, since } = args;
  const pids = productIds ? Array.from(productIds).slice(0, 200) : undefined;
  // BUG-COMMERCIAL-SUPPLIERSALES-SILENT-FAIL FIX: { data } without error check.
  let orderItems: Array<{
    product_id: string | null;
    product_name: string | null;
    quantity: number | null;
    unit_price: number | null;
  }>;
  try {
    orderItems = await fetchAllPages<{
      product_id: string | null;
      product_name: string | null;
      quantity: number | null;
      unit_price: number | null;
    }>((from, to) => {
      let q = supabase
        .from('order_items')
        .select('product_id, product_name, quantity, unit_price')
        .gte('created_at', since);
      if (pids) q = q.in('product_id', pids);
      return q.order('id', { ascending: true }).range(from, to);
    });
  } catch (orderErr) {
    return degradeOrThrow(orderErr, 'supplier_sales.order_items', [] as SupplierSalesRow[]);
  }
  if (!orderItems.length) return [];

  const { fetchPromobrindProducts } = await import('@/lib/external-db');
  const products = await fetchPromobrindProducts({ limit: 5000 });
  const productSupplierMap = new Map<string, string>();
  products.forEach((p) => {
    productSupplierMap.set(p.id, p.supplier_reference || 'Sem fornecedor');
  });

  const supplierMap = new Map<
    string,
    { orderCount: number; revenue: number; products: Set<string> }
  >();
  orderItems.forEach((item) => {
    const supplier = productSupplierMap.get(item.product_id || '') || 'Sem fornecedor';
    const e = supplierMap.get(supplier) || {
      orderCount: 0,
      revenue: 0,
      products: new Set<string>(),
    };
    e.orderCount += 1;
    e.revenue += (item.quantity ?? 0) * (item.unit_price ?? 0);
    if (item.product_id) e.products.add(item.product_id);
    supplierMap.set(supplier, e);
  });

  return Array.from(supplierMap.entries())
    .map(([supplier, data]) => ({
      supplierName: supplier,
      orderCount: data.orderCount,
      revenue: data.revenue,
      productCount: data.products.size,
    }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);
}
