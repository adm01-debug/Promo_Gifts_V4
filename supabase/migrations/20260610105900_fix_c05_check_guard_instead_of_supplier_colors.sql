
-- Atualiza C05: verifica que o CANONICAL CODE GUARD está em fn_standardize_variant
-- (fix real pipeline-proof) em vez de verificar supplier_colors.code='103' (volátil)
CREATE OR REPLACE FUNCTION public.fn_spot_color_integrity_check()
RETURNS TABLE(check_name text, severity text, issue_count bigint, sample_skus text, status text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_spot uuid := 'bcfc0d02-44c6-48ae-8472-12b1a3f3d8e0';
BEGIN
  RETURN QUERY
  -- C01: Gold legacy codes onde supplier_sku tem padrão 1xx
  SELECT 'C01_legacy_gold'::text,'CRÍTICO'::text,
    COUNT(pv.id),
    (SELECT string_agg(s.supplier_sku,', ') FROM (
      SELECT pv2.supplier_sku FROM product_variants pv2 JOIN products p2 ON p2.id=pv2.product_id
      WHERE p2.supplier_id=v_spot AND pv2.color_code IN('03','13','61') AND pv2.color_name NOT ILIKE '%legacy%'
        AND (pv2.supplier_sku~'-1[0-9]{2}$' OR pv2.supplier_sku~'-1[0-9]{2}-') LIMIT 3) s),
    CASE WHEN COUNT(pv.id)=0 THEN '✅ OK' ELSE '❌ FALHOU' END
  FROM product_variants pv JOIN products p ON p.id=pv.product_id
  WHERE p.supplier_id=v_spot AND pv.color_code IN('03','13','61')
    AND pv.color_name NOT ILIKE '%legacy%'
    AND (pv.supplier_sku~'-1[0-9]{2}$' OR pv.supplier_sku~'-1[0-9]{2}-')

  UNION ALL

  -- C02: Silver legacy codes com padrão 1xx
  SELECT 'C02_legacy_silver'::text,'ALTO'::text,
    COUNT(ppv.id),
    (SELECT string_agg(s.supplier_sku,', ') FROM (
      SELECT ppv2.supplier_sku FROM produtos_padronizacao_variantes ppv2
      WHERE ppv2.supplier_id=v_spot AND ppv2.color_code IN('03','13','61')
        AND ppv2.color_name NOT ILIKE '%legacy%'
        AND (ppv2.supplier_sku~'-1[0-9]{2}$' OR ppv2.supplier_sku~'-1[0-9]{2}-') LIMIT 3) s),
    CASE WHEN COUNT(ppv.id)=0 THEN '✅ OK' ELSE '❌ FALHOU' END
  FROM produtos_padronizacao_variantes ppv
  WHERE ppv.supplier_id=v_spot AND ppv.color_code IN('03','13','61')
    AND ppv.color_name NOT ILIKE '%legacy%'
    AND (ppv.supplier_sku~'-1[0-9]{2}$' OR ppv.supplier_sku~'-1[0-9]{2}-')

  UNION ALL

  -- C03: Bronze 103 mapeia para Silver 103 (via raw_id join)
  SELECT 'C03_bronze103_maps_silver103'::text,'CRÍTICO'::text,
    COUNT(ppv.id),
    (SELECT string_agg(s.supplier_sku,', ') FROM (
      SELECT ppv2.supplier_sku FROM supplier_products_raw spr2
      JOIN produtos_padronizacao_variantes ppv2 ON ppv2.raw_id=spr2.id
      WHERE spr2.supplier_id=v_spot AND spr2.raw_data->>'ColorCode'='103' AND ppv2.color_code!='103' LIMIT 3) s),
    CASE WHEN COUNT(ppv.id)=0 THEN '✅ OK' ELSE '❌ FALHOU' END
  FROM supplier_products_raw spr
  JOIN produtos_padronizacao_variantes ppv ON ppv.raw_id=spr.id
  WHERE spr.supplier_id=v_spot AND spr.raw_data->>'ColorCode'='103' AND ppv.color_code!='103'

  UNION ALL

  -- C04: Gold ativos com color_code NULL
  SELECT 'C04_null_active_gold'::text,'ALTO'::text,
    COUNT(pv.id), NULL::text,
    CASE WHEN COUNT(pv.id)=0 THEN '✅ OK' ELSE '❌ FALHOU' END
  FROM product_variants pv JOIN products p ON p.id=pv.product_id
  WHERE p.supplier_id=v_spot AND pv.color_code IS NULL AND pv.is_active=true

  UNION ALL

  -- C05 ATUALIZADO: fn_standardize_variant tem o CANONICAL CODE GUARD (fix pipeline-proof)
  -- Verifica a presença do guard no código da função — não depende de supplier_colors volátil
  SELECT 'C05_canonical_guard_present'::text,'CRÍTICO'::text,
    CASE WHEN COUNT(oid)>0 THEN 1 ELSE 0 END,
    CASE WHEN COUNT(oid)>0
      THEN 'guard "SPOT CANONICAL CODE GUARD" presente em fn_standardize_variant'
      ELSE 'AUSENTE — guard não foi aplicado!'
    END,
    CASE WHEN COUNT(oid)>0 THEN '✅ OK' ELSE '❌ FALHOU' END
  FROM pg_proc
  WHERE proname='fn_standardize_variant'
    AND pronamespace='public'::regnamespace
    AND pg_get_functiondef(oid) LIKE '%SPOT CANONICAL CODE GUARD%';

END;
$$;
;
