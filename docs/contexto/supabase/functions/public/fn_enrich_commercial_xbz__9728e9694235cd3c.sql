CREATE OR REPLACE FUNCTION public.fn_enrich_commercial_xbz(p_commercial jsonb)
 RETURNS TABLE(vss_atualizadas integer, produtos_rollup integer, sem_match integer, recebidos integer)
 LANGUAGE plpgsql
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_sup uuid; v_upd int:=0; v_roll int:=0; v_nomatch int:=0;
BEGIN
  SELECT id INTO v_sup FROM public.suppliers WHERE code='XBZ' LIMIT 1;
  IF v_sup IS NULL THEN RAISE EXCEPTION 'XBZ nao encontrado'; END IF;

  -- 1) VSS: VendaMinima->min_order_qty, Multiplos->sale_multiplier, IpiTaxa->supplier_ipi_rate
  WITH inp AS (
    SELECT e->>'CodigoXbz' AS cx,
           GREATEST(COALESCE((e->>'VendaMinima')::int,1),1) AS vmin,
           GREATEST(COALESCE((e->>'Multiplos')::int,1),1) AS mult,
           GREATEST(COALESCE((e->>'IpiTaxa')::numeric,0),0) AS ipi
    FROM jsonb_array_elements(p_commercial) e
  ),
  res AS (
    SELECT spr.supplier_sku, i.vmin, i.mult, i.ipi
    FROM inp i
    JOIN public.supplier_products_raw spr ON spr.supplier_id=v_sup AND spr.raw_data->>'CodigoXbz'=i.cx
  ),
  upd AS (
    UPDATE public.variant_supplier_sources vss
       SET min_order_qty=res.vmin, sale_multiplier=res.mult, supplier_ipi_rate=res.ipi, updated_at=now()
    FROM res
    WHERE vss.supplier_id=v_sup AND vss.supplier_sku=res.supplier_sku
      AND (vss.min_order_qty IS DISTINCT FROM res.vmin
        OR vss.sale_multiplier IS DISTINCT FROM res.mult
        OR vss.supplier_ipi_rate IS DISTINCT FROM res.ipi)
    RETURNING vss.id
  )
  SELECT count(*) INTO v_upd FROM upd;

  -- 2) rollup produto-pai (min_order_quantity, ipi_rate) dos afetados
  WITH inp AS (SELECT e->>'CodigoXbz' AS cx FROM jsonb_array_elements(p_commercial) e),
  prod AS (
    SELECT DISTINCT pv.product_id
    FROM inp i
    JOIN public.supplier_products_raw spr ON spr.supplier_id=v_sup AND spr.raw_data->>'CodigoXbz'=i.cx
    JOIN public.variant_supplier_sources vss ON vss.supplier_id=v_sup AND vss.supplier_sku=spr.supplier_sku
    JOIN public.product_variants pv ON pv.id=vss.variant_id
  ),
  agg AS (
    SELECT pr.product_id, MAX(vss.min_order_qty) AS moq, MAX(vss.supplier_ipi_rate) AS ipi
    FROM prod pr
    JOIN public.product_variants pv ON pv.product_id=pr.product_id
    JOIN public.variant_supplier_sources vss ON vss.variant_id=pv.id AND vss.supplier_id=v_sup
    GROUP BY pr.product_id
  ),
  roll AS (
    UPDATE public.products p
       SET min_order_quantity=agg.moq, ipi_rate=agg.ipi, updated_at=now()
    FROM agg WHERE p.id=agg.product_id
      AND (p.min_order_quantity IS DISTINCT FROM agg.moq OR p.ipi_rate IS DISTINCT FROM agg.ipi)
    RETURNING p.id
  )
  SELECT count(*) INTO v_roll FROM roll;

  -- 3) entradas sem correspondencia no bronze (diagnostico)
  SELECT count(*) INTO v_nomatch FROM (
    SELECT e->>'CodigoXbz' cx FROM jsonb_array_elements(p_commercial) e
    EXCEPT SELECT spr.raw_data->>'CodigoXbz' FROM public.supplier_products_raw spr WHERE spr.supplier_id=v_sup
  ) z;

  RETURN QUERY SELECT v_upd, v_roll, v_nomatch, jsonb_array_length(p_commercial);
END; $function$
