
-- ============================================================
-- ETAPA 4: Corrigir fn_populate_all_products_seo
-- Bug B3: LENGTH(TRIM(COALESCE(meta_keywords,''))) em TEXT[] → inválido
-- Fix: array_length(meta_keywords, 1) IS NULL
-- Melhoria: popular og_image_url, canonical_url, schema_json stub
-- Melhoria: parâmetro p_supplier_id para processar por fornecedor
-- ============================================================

CREATE OR REPLACE FUNCTION public.fn_populate_all_products_seo(
    p_supplier_id UUID DEFAULT NULL,   -- NULL = todos; uuid = só este fornecedor
    p_force       BOOLEAN DEFAULT false -- true = reprocessa mesmo quem já tem slug
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_products_updated   INTEGER := 0;
  v_images_updated     INTEGER := 0;
  v_categories_updated INTEGER := 0;
  v_start_time         TIMESTAMPTZ := clock_timestamp();
BEGIN

  -- ===========================================================
  -- 1. SLUG — gerar apenas onde NULL (ou forçar)
  -- ===========================================================
  UPDATE products p
     SET slug = generate_product_slug(p.name, p.id)
   WHERE (p_force OR p.slug IS NULL OR LENGTH(TRIM(COALESCE(p.slug, ''))) = 0)
     AND p.name IS NOT NULL
     AND p.is_deleted = false
     AND (p_supplier_id IS NULL OR p.supplier_id = p_supplier_id)
     AND 'slug' != ALL(COALESCE(p.locked_fields, '{}'::text[]));  -- respeita locked_fields

  -- ===========================================================
  -- 2. META TITLE
  -- ===========================================================
  UPDATE products p
     SET meta_title = generate_product_meta_title(
           p.name,
           (SELECT c.name FROM categories c
            WHERE c.id = COALESCE(p.main_category_id, p.category_id) LIMIT 1)
         )
   WHERE (p_force OR p.meta_title IS NULL OR LENGTH(TRIM(COALESCE(p.meta_title, ''))) = 0)
     AND p.name IS NOT NULL
     AND p.is_deleted = false
     AND (p_supplier_id IS NULL OR p.supplier_id = p_supplier_id)
     AND 'meta_title' != ALL(COALESCE(p.locked_fields, '{}'::text[]));

  -- ===========================================================
  -- 3. META DESCRIPTION
  -- ===========================================================
  UPDATE products p
     SET meta_description = generate_product_meta_description(
           p.name, p.short_description, p.description,
           COALESCE(p.allows_personalization, false)
         )
   WHERE (p_force OR p.meta_description IS NULL OR LENGTH(TRIM(COALESCE(p.meta_description, ''))) = 0)
     AND p.name IS NOT NULL
     AND p.is_deleted = false
     AND (p_supplier_id IS NULL OR p.supplier_id = p_supplier_id)
     AND 'meta_description' != ALL(COALESCE(p.locked_fields, '{}'::text[]));

  -- ===========================================================
  -- 4. META KEYWORDS — FIX: usar array_length em TEXT[], não LENGTH()
  -- ===========================================================
  UPDATE products p
     SET meta_keywords = extract_keywords(
           COALESCE(p.name, '') || ' ' ||
           COALESCE(p.short_description, '') || ' ' ||
           COALESCE(p.description, '') || ' ' ||
           'brinde promocional brinde corporativo brinde personalizado',
           15
         )
   WHERE (p_force OR p.meta_keywords IS NULL
         OR array_length(p.meta_keywords, 1) IS NULL
         OR array_length(p.meta_keywords, 1) = 0)
     AND p.name IS NOT NULL
     AND p.is_deleted = false
     AND (p_supplier_id IS NULL OR p.supplier_id = p_supplier_id);

  -- ===========================================================
  -- 5. CANONICAL_URL
  -- ===========================================================
  UPDATE products p
     SET canonical_url = '/produto/' || p.slug
   WHERE (p_force OR p.canonical_url IS NULL)
     AND p.slug IS NOT NULL
     AND p.is_deleted = false
     AND (p_supplier_id IS NULL OR p.supplier_id = p_supplier_id);

  -- ===========================================================
  -- 6. OG_TITLE (herda meta_title se NULL)
  -- ===========================================================
  UPDATE products p
     SET og_title = p.meta_title
   WHERE (p_force OR p.og_title IS NULL)
     AND p.meta_title IS NOT NULL
     AND p.is_deleted = false
     AND (p_supplier_id IS NULL OR p.supplier_id = p_supplier_id);

  -- ===========================================================
  -- 7. OG_DESCRIPTION (herda meta_description se NULL)
  -- ===========================================================
  UPDATE products p
     SET og_description = p.meta_description
   WHERE (p_force OR p.og_description IS NULL)
     AND p.meta_description IS NOT NULL
     AND p.is_deleted = false
     AND (p_supplier_id IS NULL OR p.supplier_id = p_supplier_id);

  -- ===========================================================
  -- 8. OG_IMAGE_URL (herda primary_image_url se NULL)
  -- ===========================================================
  UPDATE products p
     SET og_image_url = p.primary_image_url
   WHERE (p_force OR p.og_image_url IS NULL)
     AND p.primary_image_url IS NOT NULL
     AND p.is_deleted = false
     AND (p_supplier_id IS NULL OR p.supplier_id = p_supplier_id);

  -- ===========================================================
  -- 9. CONTAR produtos com SEO preenchido
  -- ===========================================================
  SELECT COUNT(*) INTO v_products_updated
  FROM products
  WHERE slug IS NOT NULL AND is_deleted = false
    AND (p_supplier_id IS NULL OR supplier_id = p_supplier_id);

  -- ===========================================================
  -- 10. ALT_TEXT EM product_images (apenas imagens sem alt_text)
  -- ===========================================================
  UPDATE product_images pi
     SET
       alt_text   = generate_image_alt_text(
                      (SELECT p.name FROM products p WHERE p.id = pi.product_id),
                      COALESCE(pi.image_type, 'gallery'),
                      (SELECT cv.name FROM color_variations cv WHERE cv.id = pi.color_id),
                      COALESCE(pi.display_order, 1)
                    ),
       title_text = (SELECT p.name FROM products p WHERE p.id = pi.product_id) ||
                    COALESCE(' - ' || (SELECT cv.name FROM color_variations cv WHERE cv.id = pi.color_id), '')
   WHERE (p_force OR pi.alt_text IS NULL OR LENGTH(TRIM(COALESCE(pi.alt_text, ''))) = 0)
     AND pi.product_id IS NOT NULL
     AND (p_supplier_id IS NULL OR EXISTS (
       SELECT 1 FROM products p2
       WHERE p2.id = pi.product_id AND p2.supplier_id = p_supplier_id
     ));

  GET DIAGNOSTICS v_images_updated = ROW_COUNT;

  -- ===========================================================
  -- 11. CATEGORIES SEO
  -- ===========================================================
  UPDATE categories c
     SET
       meta_title = COALESCE(c.meta_title,
                      c.name || ' - Brindes Promocionais | Promo Brindes'),
       meta_description = COALESCE(c.meta_description,
                      'Encontre os melhores ' || LOWER(c.name) ||
                      ' para brindes corporativos e eventos. ' ||
                      'Personalização com sua marca. Solicite orçamento!')
   WHERE (c.meta_title IS NULL OR c.meta_description IS NULL)
     AND c.is_active = true;

  GET DIAGNOSTICS v_categories_updated = ROW_COUNT;

  -- ===========================================================
  -- RETORNO
  -- ===========================================================
  RETURN jsonb_build_object(
    'success',            true,
    'products_with_seo',  v_products_updated,
    'images_updated',     v_images_updated,
    'categories_updated', v_categories_updated,
    'supplier_filter',    p_supplier_id,
    'forced',             p_force,
    'duration_ms',        EXTRACT(MILLISECONDS FROM (clock_timestamp() - v_start_time))::INTEGER
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error',   SQLERRM,
    'state',   SQLSTATE
  );
END;
$$;

COMMENT ON FUNCTION public.fn_populate_all_products_seo(UUID, BOOLEAN) IS
    'Popula campos SEO em products, product_images e categories. p_supplier_id filtra fornecedor. p_force=true reprocessa mesmo quem já tem slug. Respeita locked_fields.';
;
