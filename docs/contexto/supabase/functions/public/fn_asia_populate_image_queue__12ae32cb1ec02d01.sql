CREATE OR REPLACE FUNCTION public.fn_asia_populate_image_queue()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_inseridos INT := 0;
BEGIN
  /*
    Gera CF IDs no padrão: asia-{sku_lower}-{lpad(ordem,2,'0')}
    Exemplo: asia-bac008-01, asia-bac008-02 ...
    Deduplica por url_original (UNIQUE na tabela).
    Pula imagens já em product_images com CF ID válido e source_supplier='ASIA'.
  */
  WITH imagens_brutas AS (
    SELECT DISTINCT ON (img->>'url_origem')
      lower(spr.site_data->>'codigo')                                     AS codigo_pai,
      img->>'url_origem'                                                   AS url_original,
      CASE WHEN img->>'tipo' = 'principal' THEN 'main' ELSE 'gallery' END AS image_type,
      (img->>'ordem')::int                                                 AS ordem,
      p.id                                                                 AS product_id
    FROM public.supplier_products_raw spr
    CROSS JOIN jsonb_array_elements(
      coalesce(spr.site_data->'imagens', '[]'::jsonb)
    ) AS img
    JOIN public.products p
      ON p.sku = spr.site_data->>'codigo'
    JOIN public.produtos_padronizacao pp
      ON pp.product_id = p.id
     AND pp.supplier_id = 'd2734e23-d633-4819-bb15-e51aa44e2118'
    WHERE spr.supplier_id = 'd2734e23-d633-4819-bb15-e51aa44e2118'
      AND spr.site_data IS NOT NULL
      AND (img->>'url_origem') IS NOT NULL
      AND length(img->>'url_origem') > 10
      -- pular imagens já importadas com sucesso
      AND NOT EXISTS (
        SELECT 1 FROM public.product_images pi
        WHERE pi.url_original    = img->>'url_origem'
          AND pi.source_supplier = 'ASIA'
          AND pi.cloudflare_image_id IS NOT NULL
      )
    ORDER BY img->>'url_origem', spr.supplier_sku
  )
  INSERT INTO public.asia_image_import_queue
    (codigo_pai, url_original, cf_image_id_canonical, image_type, display_order, product_id)
  SELECT
    codigo_pai,
    url_original,
    'asia-' || codigo_pai || '-' || lpad(ordem::text, 2, '0') AS cf_image_id_canonical,
    image_type,
    ordem,
    product_id
  FROM imagens_brutas
  ON CONFLICT (url_original) DO NOTHING;

  GET DIAGNOSTICS v_inseridos = ROW_COUNT;

  RETURN jsonb_build_object(
    'inseridos', v_inseridos,
    'ts',        now()
  );
END;
$function$
