CREATE OR REPLACE FUNCTION public.fn_asia_fix_multi_main_images()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_supplier_id uuid := 'd2734e23-d633-4819-bb15-e51aa44e2118';
  v_demovidos   int  := 0;
  v_atualizados int  := 0;
BEGIN
  -- Política canônica:
  --   A imagem MAIN que FICA é a que tem cloudflare_image_id = 'asia-' || lower(supplier_reference) || '-01'
  --   As demais main images (cor-específicas) são rebaixadas para 'gallery'
  --
  -- Para produtos onde a imagem '-01' NÃO existe, mantém a de menor display_order
  -- (tie-breaker: menor cf_id alfabético)

  WITH
  -- Identificar produtos com múltiplas main images
  multi_main AS (
    SELECT pi.product_id
    FROM product_images pi
    JOIN products p ON p.id = pi.product_id
    WHERE p.supplier_id = v_supplier_id
      AND pi.image_type = 'main' AND pi.is_active = true
    GROUP BY pi.product_id
    HAVING COUNT(*) > 1
  ),
  -- Para cada produto, determinar qual é o canônico (keeper)
  canonical AS (
    SELECT DISTINCT ON (pi.product_id)
      pi.product_id,
      pi.id AS keeper_id,
      pi.cloudflare_image_id AS keeper_cf_id
    FROM product_images pi
    JOIN products p ON p.id = pi.product_id
    JOIN multi_main mm ON mm.product_id = pi.product_id
    WHERE pi.image_type = 'main' AND pi.is_active = true
    ORDER BY
      pi.product_id,
      -- Prioridade 1: o que termina em '-01' (padrão da API)
      CASE WHEN pi.cloudflare_image_id = 'asia-' || lower(p.supplier_reference) || '-01' THEN 0 ELSE 1 END,
      -- Prioridade 2: menor display_order
      pi.display_order,
      -- Prioridade 3: CF ID alfabético (tie-breaker determinístico)
      pi.cloudflare_image_id
  )
  -- Rebaixar todos os NON-canonical de main → gallery
  UPDATE product_images pi
  SET image_type  = 'gallery',
      updated_at  = now()
  FROM canonical c
  WHERE pi.product_id = c.product_id
    AND pi.id        <> c.keeper_id
    AND pi.image_type = 'main'
    AND pi.is_active  = true;

  GET DIAGNOSTICS v_demovidos = ROW_COUNT;

  -- Atualizar primary_image_url nos produtos para o canonical CF URL
  WITH canonical2 AS (
    SELECT DISTINCT ON (pi.product_id)
      pi.product_id,
      'https://imagedelivery.net/vKMs9Ow8bA_enuhLXZ2HAw/' || pi.cloudflare_image_id || '/public' AS canonical_url
    FROM product_images pi
    JOIN products p ON p.id = pi.product_id
    WHERE p.supplier_id = v_supplier_id
      AND pi.image_type = 'main' AND pi.is_active = true
      AND p.primary_image_url NOT ILIKE '%' || pi.cloudflare_image_id || '%'
    ORDER BY pi.product_id, pi.display_order, pi.cloudflare_image_id
  )
  UPDATE products p
  SET primary_image_url = c2.canonical_url, updated_at = now()
  FROM canonical2 c2
  WHERE p.id = c2.product_id;

  GET DIAGNOSTICS v_atualizados = ROW_COUNT;

  RETURN jsonb_build_object(
    'ok', true,
    'imagens_demovidas_para_gallery', v_demovidos,
    'produtos_primary_url_atualizado', v_atualizados,
    'executado_em', now()
  );
END;
$function$
