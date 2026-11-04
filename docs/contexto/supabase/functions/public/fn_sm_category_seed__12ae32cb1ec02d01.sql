CREATE OR REPLACE FUNCTION public.fn_sm_category_seed()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_sup    uuid := '841cd690-210a-422a-908c-7676828db272';
  v_ins    int  := 0;
  v_rows   int  := 0;
  v_name   text;
  v_slug   text;
BEGIN
  -- Explodir pipe-delimited, slugificar, desduplicar e inserir
  INSERT INTO public.sm_category_pages (name, slug)
  SELECT DISTINCT
    trim(cat)                      AS name,
    public.fn_slugify(trim(cat))   AS slug
  FROM supplier_products_raw,
       regexp_split_to_table(raw_data->>'matriz_de_categorias', '\|') cat
  WHERE supplier_id = v_sup
    AND raw_data->>'matriz_de_categorias' IS NOT NULL
    AND raw_data->>'matriz_de_categorias' != ''
    AND trim(cat) != ''
    AND public.fn_slugify(trim(cat)) IS NOT NULL
    AND length(public.fn_slugify(trim(cat))) > 3
  ON CONFLICT (slug) DO NOTHING;

  GET DIAGNOSTICS v_ins = ROW_COUNT;

  RETURN jsonb_build_object(
    'categories_seeded', v_ins,
    'total_in_table',    (SELECT count(*) FROM sm_category_pages),
    'ts', now()
  );
END;
$function$
