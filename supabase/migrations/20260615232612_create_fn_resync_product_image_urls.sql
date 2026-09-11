
-- ============================================================
-- FIX 9: Função para re-sincronizar manualmente os campos de imagem
-- em products a partir de product_images.
-- Útil quando o trigger falha, produto é importado sem imagens e depois
-- recebe imagens sem disparar o trigger correto, ou para correção em lote.
-- ============================================================

CREATE OR REPLACE FUNCTION public.fn_resync_product_image_urls(
  p_product_ids UUID[] DEFAULT NULL,   -- NULL = todos os produtos
  p_force       BOOLEAN DEFAULT FALSE  -- FALSE = só atualiza se URL está desatualizada
)
RETURNS TABLE (
  product_id      UUID,
  action          TEXT,
  primary_url_set TEXT,
  og_url_set      TEXT,
  images_count    INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_product_id UUID;
  v_new_primary_url TEXT;
  v_new_og_url TEXT;
  v_new_fallback_url TEXT;
  v_new_set_url TEXT;
  v_new_images JSONB;
  v_images_count INTEGER;
  v_old_primary_url TEXT;
BEGIN
  -- Iterar sobre os produtos selecionados (ou todos)
  FOR v_product_id IN
    SELECT p.id
    FROM public.products p
    WHERE (p_product_ids IS NULL OR p.id = ANY(p_product_ids))
      AND p.is_active = true
    ORDER BY p.id
  LOOP
    -- Buscar primary_url atual para comparação
    SELECT primary_image_url INTO v_old_primary_url
    FROM public.products WHERE id = v_product_id;

    -- Calcular nova primary_image_url
    SELECT url_cdn INTO v_new_primary_url
    FROM public.product_images
    WHERE product_id = v_product_id AND is_active = true
      AND image_type NOT IN ('box','pouch','location','area','component')
    ORDER BY
      CASE
        WHEN image_type = 'main'    AND is_primary = true  THEN 0
        WHEN image_type = 'main'                           THEN 1
        WHEN image_type IN ('gallery','product') AND is_primary = true THEN 2
        WHEN image_type IN ('gallery','product')           THEN 3
        WHEN image_type = 'ambient'                        THEN 4
        WHEN image_type = 'set'    AND is_primary = true  THEN 5
        WHEN image_type = 'set'                            THEN 6
        WHEN image_type = 'logo'                           THEN 7
        ELSE 9
      END,
      is_primary DESC, display_order ASC NULLS LAST
    LIMIT 1;

    -- Pular se não forçado e URL não mudou
    IF NOT p_force AND v_new_primary_url IS NOT DISTINCT FROM v_old_primary_url THEN
      CONTINUE;
    END IF;

    -- Calcular og_image_url
    SELECT url_cdn INTO v_new_og_url
    FROM public.product_images
    WHERE product_id = v_product_id AND is_active = true
      AND image_type NOT IN ('box','pouch','location','area','component')
    ORDER BY
      CASE WHEN is_og_image = true                       THEN 0
           WHEN image_type = 'main' AND is_primary = true THEN 1
           WHEN image_type = 'main'                       THEN 2
           WHEN image_type IN ('gallery','product')       THEN 3
           WHEN image_type = 'ambient'                    THEN 4
           WHEN image_type = 'set'                        THEN 5
           ELSE 9 END,
      is_primary DESC, display_order ASC NULLS LAST
    LIMIT 1;

    -- Calcular fallback URL (url_original do mesmo produto)
    SELECT url_original INTO v_new_fallback_url
    FROM public.product_images
    WHERE product_id = v_product_id AND is_active = true
      AND url_original IS NOT NULL AND url_original != ''
      AND image_type NOT IN ('box','pouch','location','area','component')
    ORDER BY
      CASE
        WHEN image_type = 'main' AND is_primary = true THEN 0
        WHEN image_type = 'main'                       THEN 1
        ELSE 9
      END,
      is_primary DESC, display_order ASC NULLS LAST
    LIMIT 1;

    -- Calcular set_image_url
    SELECT url_cdn INTO v_new_set_url
    FROM public.product_images
    WHERE product_id = v_product_id AND is_active = true AND image_type = 'set'
    ORDER BY display_order ASC, created_at ASC
    LIMIT 1;

    -- Calcular array de imagens (jsonb)
    SELECT
      COALESCE(jsonb_agg(url_cdn ORDER BY
        CASE
          WHEN image_type = 'main'    AND is_primary = true THEN 0
          WHEN image_type = 'main'                          THEN 1
          WHEN image_type IN ('gallery','product')          THEN 2
          WHEN image_type = 'ambient'                       THEN 3
          WHEN image_type = 'set'                           THEN 4
          WHEN image_type = 'logo'                          THEN 5
          ELSE 9
        END,
        is_primary DESC, display_order ASC NULLS LAST
      ) FILTER (WHERE image_type NOT IN ('box','pouch','location','area','component')),
      '[]'::jsonb
    ),
    COUNT(*)::INTEGER
    INTO v_new_images, v_images_count
    FROM public.product_images
    WHERE product_id = v_product_id AND is_active = true;

    -- Aplicar atualização
    UPDATE public.products SET
      primary_image_url         = v_new_primary_url,
      og_image_url              = v_new_og_url,
      primary_image_fallback_url = v_new_fallback_url,
      set_image_url             = v_new_set_url,
      images                    = v_new_images,
      updated_at                = NOW()
    WHERE id = v_product_id;

    -- Retornar resultado
    RETURN QUERY
      SELECT
        v_product_id,
        CASE
          WHEN v_old_primary_url IS NULL AND v_new_primary_url IS NOT NULL THEN 'SET'
          WHEN v_old_primary_url IS NOT NULL AND v_new_primary_url IS NULL THEN 'CLEARED'
          ELSE 'UPDATED'
        END,
        COALESCE(v_new_primary_url, '(null)'),
        COALESCE(v_new_og_url, '(null)'),
        v_images_count;
  END LOOP;
END;
$$;

COMMENT ON FUNCTION public.fn_resync_product_image_urls(UUID[], BOOLEAN) IS
  'Re-sincroniza manualmente os campos de imagem em products a partir de product_images.
   Útil quando o trigger falhou ou produto recebeu imagens sem disparar sync.
   
   Uso:
     -- Resync de produtos específicos:
     SELECT * FROM fn_resync_product_image_urls(ARRAY[''uuid1'', ''uuid2'']::UUID[]);
     
     -- Resync de TODOS (só onde URL mudou):
     SELECT * FROM fn_resync_product_image_urls();
     
     -- Forçar resync de todos mesmo sem mudança:
     SELECT * FROM fn_resync_product_image_urls(NULL, TRUE);
   
   Adicionada 2026-06-15.';
;
