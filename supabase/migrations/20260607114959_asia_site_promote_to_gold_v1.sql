-- Promote dedicado ASIA: trail site -> Gold.
-- Consistente com fn_xbz_enrich_gold_extractors (padrao supplier-especifico ja estabelecido).
-- fn_site_promote_to_gold (XBZ) nao e tocada.
CREATE OR REPLACE FUNCTION public.fn_asia_site_promote_to_gold(
  p_limit    integer DEFAULT NULL,
  p_only_new boolean DEFAULT true
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $fn$
DECLARE
  v_ASIA     uuid := 'd2734e23-d633-4819-bb15-e51aa44e2118';
  v_linked   int  := 0;
  v_phys     int  := 0;
  v_scalars  int  := 0;
  v_promoted int  := 0;
BEGIN

  -- 0. Vincular product_id via Silver principal (mesmo padrao do fn_site_promote_to_gold)
  WITH lnk AS (
    SELECT s.id, p.product_id
    FROM public.produtos_site_padronizacao s
    JOIN public.produtos_padronizacao p
      ON p.supplier_id = s.supplier_id
     AND p.supplier_reference = s.supplier_reference
    WHERE s.supplier_id = v_ASIA
      AND p.product_id IS NOT NULL
      AND s.product_id IS NULL
      AND s.status <> 'rejected'
  )
  UPDATE public.produtos_site_padronizacao t
     SET product_id = lnk.product_id, updated_at = now()
    FROM lnk WHERE t.id = lnk.id;
  GET DIAGNOSTICS v_linked = ROW_COUNT;

  CREATE TEMP TABLE _asia_site_scope ON COMMIT DROP AS
    SELECT s.* FROM public.produtos_site_padronizacao s
    WHERE s.supplier_id = v_ASIA
      AND s.product_id IS NOT NULL
      AND s.status = CASE WHEN p_only_new
                          THEN 'standardized'::public.produtos_padronizacao_status
                          ELSE s.status END
      AND s.status <> 'rejected'
    LIMIT COALESCE(p_limit, 1000000000);

  IF NOT EXISTS (SELECT 1 FROM _asia_site_scope) THEN
    RETURN jsonb_build_object('linked', v_linked, 'note', 'nada_novo');
  END IF;

  -- (e) product_physical: peso + dimensoes (gap-fill COALESCE, nunca sobrescreve fonte melhor)
  INSERT INTO public.product_physical (product_id, weight_g, height_cm, width_cm, length_cm)
  SELECT product_id, weight_g::numeric, height_cm, width_cm, depth_cm
  FROM _asia_site_scope
  WHERE weight_g IS NOT NULL OR height_cm IS NOT NULL
     OR width_cm IS NOT NULL  OR depth_cm IS NOT NULL
  ON CONFLICT (product_id) DO UPDATE SET
    weight_g  = COALESCE(public.product_physical.weight_g,  EXCLUDED.weight_g),
    height_cm = COALESCE(public.product_physical.height_cm, EXCLUDED.height_cm),
    width_cm  = COALESCE(public.product_physical.width_cm,  EXCLUDED.width_cm),
    length_cm = COALESCE(public.product_physical.length_cm, EXCLUDED.length_cm),
    updated_at = now();
  GET DIAGNOSTICS v_phys = ROW_COUNT;

  -- (h) products: fill-only escalares WP-exclusive (brand, moq, precos).
  --     COALESCE: nunca sobrescreve dado ja gravado de fonte melhor (API, ERP).
  UPDATE public.products p SET
    brand                  = COALESCE(p.brand,                  s.brand),
    min_order_quantity     = COALESCE(p.min_order_quantity,     s.moq),
    min_quantity           = COALESCE(p.min_quantity,           s.min_quantity),
    requires_minimum_order = COALESCE(p.requires_minimum_order,
                               CASE WHEN s.moq IS NOT NULL THEN (s.moq > 1) ELSE NULL END),
    sale_price             = COALESCE(p.sale_price,             s.sale_price),
    is_on_sale             = COALESCE(p.is_on_sale,             s.is_on_sale),
    suggested_price        = COALESCE(p.suggested_price,        s.regular_price),
    updated_at             = now()
  FROM _asia_site_scope s
  WHERE p.id = s.product_id
    AND (s.brand IS NOT NULL OR s.moq IS NOT NULL
      OR s.sale_price IS NOT NULL OR s.regular_price IS NOT NULL
      OR s.is_on_sale IS NOT NULL);
  GET DIAGNOSTICS v_scalars = ROW_COUNT;

  -- Marcar promovidas (idempotencia: evita reprocessar nas proximas rodadas)
  UPDATE public.produtos_site_padronizacao t
     SET status      = 'promoted'::public.produtos_padronizacao_status,
         promoted_at = now(),
         updated_at  = now()
   WHERE t.id IN (SELECT id FROM _asia_site_scope);
  GET DIAGNOSTICS v_promoted = ROW_COUNT;

  RETURN jsonb_build_object(
    'linked',   v_linked,
    'physical', v_phys,
    'scalars',  v_scalars,
    'promoted', v_promoted
  );
END;
$fn$;

COMMENT ON FUNCTION public.fn_asia_site_promote_to_gold(integer,boolean) IS
  'Promote WP site_data -> Gold para ASIA. Pattern supplier-especifico (consistente com fn_xbz_enrich_gold_extractors). Nao toca fn_site_promote_to_gold (XBZ).';

REVOKE ALL ON FUNCTION public.fn_asia_site_promote_to_gold(integer,boolean) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_asia_site_promote_to_gold(integer,boolean) TO service_role;;
