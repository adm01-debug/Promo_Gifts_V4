CREATE OR REPLACE FUNCTION public.fn_get_discontinued_products(p_supplier_code text DEFAULT NULL::text, p_search text DEFAULT NULL::text, p_status text DEFAULT 'stock_zero'::text, p_limit integer DEFAULT 50, p_offset integer DEFAULT 0)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_rows    jsonb;
  v_total   int;
  v_limit   int  := GREATEST(0, LEAST(COALESCE(p_limit, 50), 500));
  v_offset  int  := GREATEST(0, COALESCE(p_offset, 0));
  v_status  text := COALESCE(p_status, 'stock_zero');
  v_suppliers uuid[] := ARRAY[
    'bcfc0d02-44c6-48ae-8472-12b1a3f3d8e0'::uuid,
    'd6718a29-e954-4c1b-bd84-03ea24884900'::uuid,
    'd2734e23-d633-4819-bb15-e51aa44e2118'::uuid,
    '841cd690-210a-422a-908c-7676828db272'::uuid
  ];
BEGIN
  SELECT COUNT(*) INTO v_total
  FROM products p JOIN suppliers s ON s.id = p.supplier_id
  WHERE p.supplier_id = ANY(v_suppliers)
    AND p.is_active = true
    AND (v_status = 'has_request' OR p.stock_quantity = 0)
    AND (p_supplier_code IS NULL OR s.code = p_supplier_code)
    AND (p_search IS NULL OR
         p.name ILIKE '%' || p_search || '%' OR
         p.supplier_reference ILIKE '%' || p_search || '%')
    AND (v_status NOT IN ('has_request') OR EXISTS (
      SELECT 1 FROM product_deactivation_requests pdr
      WHERE pdr.product_id = p.id AND pdr.status = 'pending'
    ));

  SELECT jsonb_agg(row)
  INTO v_rows
  FROM (
    SELECT jsonb_build_object(
      'id',                 p.id,
      'supplier_code',      s.code,
      'supplier_name',      s.name,
      'supplier_reference', p.supplier_reference,
      'name',               p.name,
      'sku',                p.sku,
      'stock_quantity',     p.stock_quantity,
      'is_stockout',        p.is_stockout,
      'is_active',          p.is_active,
      'sale_price',         p.sale_price,
      'cost_price',         p.cost_price,
      'primary_image_url',  p.primary_image_url,
      'last_sync_at',       p.last_sync_at,
      'updated_at',         p.updated_at,
      'stock_zero_since',   p.updated_at,
      'deactivation_request', (
        SELECT jsonb_build_object(
          'id',           pdr.id,
          'status',       pdr.status,
          'reason',       pdr.reason,
          'reason_code',  pdr.reason_code,
          'requested_by', pdr.requested_by_name,
          'requested_at', pdr.requested_at,
          'approved_by',  pdr.approved_by_name,
          'approved_at',  pdr.approved_at
        )
        FROM product_deactivation_requests pdr
        WHERE pdr.product_id = p.id ORDER BY pdr.requested_at DESC LIMIT 1
      ),
      'variants_ativas',     (SELECT COUNT(*) FROM product_variants pv WHERE pv.product_id=p.id AND pv.is_active=true),
      'variants_com_estoque',(SELECT COUNT(*) FROM product_variants pv WHERE pv.product_id=p.id AND pv.is_active=true AND pv.stock_quantity>0)
    ) AS row
    FROM products p JOIN suppliers s ON s.id = p.supplier_id
    WHERE p.supplier_id = ANY(v_suppliers)
      AND p.is_active = true
      AND (v_status = 'has_request' OR p.stock_quantity = 0)
      AND (p_supplier_code IS NULL OR s.code = p_supplier_code)
      AND (p_search IS NULL OR
           p.name ILIKE '%' || p_search || '%' OR
           p.supplier_reference ILIKE '%' || p_search || '%')
      AND (v_status NOT IN ('has_request') OR EXISTS (
        SELECT 1 FROM product_deactivation_requests pdr
        WHERE pdr.product_id = p.id AND pdr.status = 'pending'
      ))
    ORDER BY p.updated_at DESC, p.id   -- ← TIE-BREAKER ADICIONADO
    LIMIT v_limit OFFSET v_offset
  ) sub;

  RETURN jsonb_build_object(
    'total',   v_total,
    'limit',   v_limit,
    'offset',  v_offset,
    'items',   COALESCE(v_rows, '[]')
  );
END;
$function$
