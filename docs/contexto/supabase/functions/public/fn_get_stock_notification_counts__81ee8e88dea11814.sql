CREATE OR REPLACE FUNCTION public.fn_get_stock_notification_counts(p_since date DEFAULT NULL::date)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT jsonb_build_object(
    'stockout', (SELECT count(*) FROM products
      WHERE is_active AND is_stockout
        AND (p_since IS NULL OR last_stock_update_at >= p_since::timestamptz)),
    'low_stock', (SELECT count(*) FROM products p LEFT JOIN suppliers s ON s.id=p.supplier_id
      WHERE p.is_active AND p.is_stockout=false AND p.stock_quantity>0
        AND p.stock_quantity <= COALESCE(s.low_stock_threshold,10)
        AND (p_since IS NULL OR p.last_stock_update_at >= p_since::timestamptz)),
    'novelties', (SELECT count(DISTINCT pn.product_id)
      FROM product_novelties pn JOIN products p ON p.id=pn.product_id
      WHERE pn.is_active AND (pn.expires_at IS NULL OR pn.expires_at>now())
        AND p.is_active AND p.is_stockout=false AND p.sale_price>0
        AND p.primary_image_url IS NOT NULL AND p.primary_image_url<>''
        AND (p_since IS NULL OR pn.detected_at >= p_since::timestamptz)),
    'restocks', (SELECT count(*) FROM (
      SELECT sds.product_id
      FROM stock_daily_summary sds JOIN products p ON p.id=sds.product_id
      WHERE COALESCE(sds.stock_open,0)=0 AND COALESCE(sds.stock_close,0)>0
        AND sds.restock_detected=true
        AND sds.summary_date >= GREATEST(
          COALESCE(p_since, (CURRENT_DATE - INTERVAL '30 days')::date),
          (CURRENT_DATE - INTERVAL '30 days')::date
        )
        AND p.is_active AND p.stock_quantity>0
      GROUP BY sds.product_id) r)
  );
$function$
