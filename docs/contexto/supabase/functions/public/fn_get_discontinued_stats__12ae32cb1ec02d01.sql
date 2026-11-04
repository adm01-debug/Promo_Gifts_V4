CREATE OR REPLACE FUNCTION public.fn_get_discontinued_stats()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_por_forn jsonb;
  v_totals   jsonb;
BEGIN
  -- Stats por fornecedor
  SELECT jsonb_agg(row ORDER BY row->>'supplier_code')
  INTO v_por_forn
  FROM (
    SELECT jsonb_build_object(
      'supplier_code',  s.code,
      'supplier_name',  s.name,
      'supplier_id',    p.supplier_id::text,
      'total_ativos',   COUNT(*) FILTER (WHERE p.is_active = true),
      'stock_zero',     COUNT(*) FILTER (WHERE p.stock_quantity = 0 AND p.is_active = true),
      'inativos',       COUNT(*) FILTER (WHERE p.is_active = false),
      'pendentes',      COUNT(*) FILTER (WHERE EXISTS (
                          SELECT 1 FROM product_deactivation_requests pdr
                          WHERE pdr.product_id=p.id AND pdr.status='pending'
                        ))
    ) AS row
    FROM products p
    JOIN suppliers s ON s.id = p.supplier_id
    WHERE p.supplier_id IN (
      'bcfc0d02-44c6-48ae-8472-12b1a3f3d8e0',
      'd6718a29-e954-4c1b-bd84-03ea24884900',
      'd2734e23-d633-4819-bb15-e51aa44e2118',
      '841cd690-210a-422a-908c-7676828db272'
    )
    GROUP BY s.code, s.name, p.supplier_id
  ) sub;

  -- Totais globais
  SELECT jsonb_build_object(
    'total_stock_zero',     SUM(CASE WHEN p.stock_quantity = 0 AND p.is_active = true  THEN 1 ELSE 0 END),
    'total_inativos',       SUM(CASE WHEN p.is_active = false THEN 1 ELSE 0 END),
    'total_ativos',         SUM(CASE WHEN p.is_active = true  THEN 1 ELSE 0 END),
    'pendentes_aprovacao',  (SELECT COUNT(*) FROM product_deactivation_requests WHERE status='pending')
  ) INTO v_totals
  FROM products p
  WHERE p.supplier_id IN (
    'bcfc0d02-44c6-48ae-8472-12b1a3f3d8e0',
    'd6718a29-e954-4c1b-bd84-03ea24884900',
    'd2734e23-d633-4819-bb15-e51aa44e2118',
    '841cd690-210a-422a-908c-7676828db272'
  );

  RETURN v_totals || jsonb_build_object('por_fornecedor', COALESCE(v_por_forn, '[]'));
END;
$function$
