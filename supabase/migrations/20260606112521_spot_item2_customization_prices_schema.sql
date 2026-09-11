-- Bronze landing p/ o feed CustomizationOptions (preços por produto/posição/técnica)
CREATE TABLE IF NOT EXISTS public.supplier_customization_options_raw (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id        uuid NOT NULL,
  product_reference  text NOT NULL,
  service_code       text,
  table_code         text,
  component          text,
  location           text,
  handling_cost      numeric,
  table_max_area_cm2 numeric,
  max_stitches       integer,
  hotspot            text,
  raw_data           jsonb NOT NULL,
  imported_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (supplier_id, product_reference, service_code, table_code, component, location)
);
CREATE INDEX IF NOT EXISTS idx_scor_ref ON public.supplier_customization_options_raw(supplier_id, product_reference);

-- Gold: preços de personalização por produto (faixas 1..15 como arrays)
CREATE TABLE IF NOT EXISTS public.product_customization_prices (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id         uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  service_code       text,
  table_code         text,
  component          text,
  location           text,
  handling_cost      numeric,
  table_max_area_cm2 numeric,
  max_stitches       integer,
  hotspot            text,
  min_qty            integer[],
  price              numeric[],
  currency           text NOT NULL DEFAULT 'BRL',
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  UNIQUE (product_id, service_code, table_code, component, location)
);
CREATE INDEX IF NOT EXISTS idx_pcp_product ON public.product_customization_prices(product_id);

-- Transform landing -> Gold (idempotente). Pronto para quando o feed for ingerido.
CREATE OR REPLACE FUNCTION public.fn_spot_customization_prices_to_gold(p_supplier_id uuid, p_parent_ref text DEFAULT NULL)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','extensions' AS $$
DECLARE v_n integer;
BEGIN
  PERFORM set_config('app.bulk_import_mode','true', true);
  DELETE FROM public.product_customization_prices pcp
   USING public.produtos_padronizacao pp
   WHERE pcp.product_id = pp.product_id AND pp.supplier_id = p_supplier_id
     AND (p_parent_ref IS NULL OR pp.supplier_reference = p_parent_ref);

  INSERT INTO public.product_customization_prices
    (product_id, service_code, table_code, component, location, handling_cost, table_max_area_cm2, max_stitches, hotspot, min_qty, price)
  SELECT pp.product_id, r.service_code, r.table_code,
         public.fn_fix_mojibake(r.component), public.fn_fix_mojibake(r.location),
         r.handling_cost, r.table_max_area_cm2, r.max_stitches, r.hotspot,
         (SELECT array_agg((r.raw_data->>('MinQt'||i))::int ORDER BY i)
            FROM generate_series(1,15) i WHERE nullif(btrim(r.raw_data->>('MinQt'||i)),'') IS NOT NULL),
         (SELECT array_agg((r.raw_data->>('Price'||i))::numeric ORDER BY i)
            FROM generate_series(1,15) i WHERE nullif(btrim(r.raw_data->>('Price'||i)),'') IS NOT NULL)
  FROM public.supplier_customization_options_raw r
  JOIN public.produtos_padronizacao pp
    ON pp.supplier_id = r.supplier_id AND pp.supplier_reference = r.product_reference
  WHERE r.supplier_id = p_supplier_id AND pp.product_id IS NOT NULL
    AND (p_parent_ref IS NULL OR pp.supplier_reference = p_parent_ref);
  GET DIAGNOSTICS v_n = ROW_COUNT;
  RETURN v_n;
END $$;;
