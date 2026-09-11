-- ═══════════════════════════════════════════════════════════════════════
-- SEO M1: schema_json para produtos
-- fix_version: seo_schema_json_v1_20260627
-- Mudanças:
--   1. trg_products_seo_autofill → guard + inline schema_json build
--   2. fn_populate_all_products_seo → step 8b (schema_json full via generate_product_jsonld)
-- Anti-regression: Lovable bot NÃO deve remover guard check de schema_json
--                  nem o bloco SET schema_json da fn_populate
-- ═══════════════════════════════════════════════════════════════════════

-- ── PARTE 1: Trigger com guard melhorado + schema_json inline ──────────
CREATE OR REPLACE FUNCTION public.trg_products_seo_autofill()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
-- fix_version: seo_schema_json_v1_20260627
-- anti-regression: guard requer schema_json IS NOT NULL; bloco schema_json ANTES do RETURN NEW
-- Lovable bot: NUNCA remover a linha AND NEW.schema_json IS NOT NULL do guard
DECLARE
  v_category_name TEXT;
BEGIN

  -- ══ GUARD DE PERFORMANCE (M3-2026-06-23, M4-2026-06-27) ════════════
  -- Saída antecipada SOMENTE se todos os campos SEO essenciais existem,
  -- incluindo schema_json. Produtos com schema_json=NULL passam pelo código
  -- completo para receber o JSON-LD inline.
  IF TG_OP = 'UPDATE'
     AND OLD.name IS NOT DISTINCT FROM NEW.name
     AND NEW.slug             IS NOT NULL
     AND NEW.meta_title       IS NOT NULL
     AND NEW.meta_description IS NOT NULL
     AND NEW.schema_json      IS NOT NULL  -- FIX: sem isso produtos ficam sem JSON-LD
  THEN
    IF NEW.og_image_url IS NULL AND NEW.primary_image_url IS NOT NULL THEN
      NEW.og_image_url := NEW.primary_image_url;
    END IF;
    NEW.updated_at := now();
    RETURN NEW;
  END IF;
  -- ════════════════════════════════════════════════════════════════════

  -- Buscar nome da categoria
  IF NEW.main_category_id IS NOT NULL THEN
    SELECT name INTO v_category_name FROM categories WHERE id = NEW.main_category_id;
  ELSIF NEW.category_id IS NOT NULL THEN
    SELECT name INTO v_category_name FROM categories WHERE id = NEW.category_id;
  END IF;

  -- SLUG
  IF (NEW.slug IS NULL OR LENGTH(TRIM(COALESCE(NEW.slug, ''))) = 0) AND NEW.name IS NOT NULL THEN
    NEW.slug := generate_product_slug(NEW.name, NEW.id);
  END IF;

  -- META TITLE
  IF (NEW.meta_title IS NULL OR LENGTH(TRIM(COALESCE(NEW.meta_title, ''))) = 0) AND NEW.name IS NOT NULL THEN
    NEW.meta_title := generate_product_meta_title(NEW.name, v_category_name);
  END IF;

  -- META DESCRIPTION
  IF (NEW.meta_description IS NULL OR LENGTH(TRIM(COALESCE(NEW.meta_description, ''))) = 0) AND NEW.name IS NOT NULL THEN
    NEW.meta_description := generate_product_meta_description(
      NEW.name, NEW.short_description, NEW.description,
      COALESCE(NEW.allows_personalization, false)
    );
  END IF;

  -- META KEYWORDS
  IF (NEW.meta_keywords IS NULL OR COALESCE(array_length(NEW.meta_keywords, 1), 0) = 0) AND NEW.name IS NOT NULL THEN
    NEW.meta_keywords := extract_keywords(
      COALESCE(NEW.name, '') || ' ' || COALESCE(NEW.short_description, '') || ' ' ||
      COALESCE(v_category_name, '') || ' ' || COALESCE(NEW.brand, '') || ' ' ||
      'brinde promocional brinde corporativo brinde personalizado', 15
    );
  END IF;

  -- OG_TITLE
  IF NEW.og_title IS NULL AND NEW.meta_title IS NOT NULL THEN
    NEW.og_title := NEW.meta_title;
  END IF;

  -- OG_DESCRIPTION
  IF NEW.og_description IS NULL AND NEW.meta_description IS NOT NULL THEN
    NEW.og_description := NEW.meta_description;
  END IF;

  -- OG_IMAGE_URL
  IF NEW.og_image_url IS NULL AND NEW.primary_image_url IS NOT NULL THEN
    NEW.og_image_url := NEW.primary_image_url;
  END IF;

  -- CANONICAL_URL
  IF NEW.canonical_url IS NULL AND NEW.slug IS NOT NULL THEN
    NEW.canonical_url := '/produto/' || NEW.slug;
  END IF;

  -- ── SCHEMA.ORG JSON-LD (inline — sem imagens) ─────────────────────────
  -- Nota: fn_populate_all_products_seo sobrescreve com versão completa (com imagens).
  -- Este bloco serve como fallback para INSERTs e updates onde o batch ainda não rodou.
  IF NEW.schema_json IS NULL AND NEW.slug IS NOT NULL AND NEW.name IS NOT NULL THEN
    NEW.schema_json := jsonb_build_object(
      '@context', 'https://schema.org',
      '@type',    'Product',
      'name',     NEW.name,
      'description', COALESCE(NEW.description, NEW.short_description, NEW.name),
      'brand',    jsonb_build_object('@type', 'Brand', 'name', COALESCE(NEW.brand, 'Promo Brindes')),
      'category', v_category_name,
      'url',      'https://www.promogifts.com.br/produto/' || COALESCE(NEW.slug, NEW.id::TEXT),
      'offers',   jsonb_build_object(
        '@type',         'Offer',
        'priceCurrency', 'BRL',
        'price',         COALESCE(NEW.sale_price, NEW.cost_price, 0),
        'availability',  CASE WHEN COALESCE(NEW.stock_quantity, 0) > 0
                           THEN 'https://schema.org/InStock'
                           ELSE 'https://schema.org/OutOfStock' END,
        'seller',        jsonb_build_object('@type', 'Organization', 'name', 'Promo Brindes')
      )
    );
    IF NEW.sku IS NOT NULL THEN
      NEW.schema_json := NEW.schema_json || jsonb_build_object('sku', NEW.sku);
    END IF;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    NEW.updated_at := now();
  END IF;

  RETURN NEW;
END;
$function$;

-- ── PARTE 2: fn_populate_all_products_seo com passo 8b (schema_json completo) ──
CREATE OR REPLACE FUNCTION public.fn_populate_all_products_seo(
  p_supplier_id UUID DEFAULT NULL,
  p_force       BOOLEAN DEFAULT FALSE
)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
-- fix_version: seo_schema_json_v1_20260627
-- anti-regression: step 8b (schema_json) deve permanecer após os demais steps
DECLARE
  v_products_updated   INTEGER := 0;
  v_images_updated     INTEGER := 0;
  v_categories_updated INTEGER := 0;
  v_schema_updated     INTEGER := 0;
  v_start_time         TIMESTAMPTZ := clock_timestamp();
BEGIN

  -- 1. SLUG
  UPDATE products p SET slug = generate_product_slug(p.name, p.id)
   WHERE (p_force OR p.slug IS NULL OR LENGTH(TRIM(COALESCE(p.slug, ''))) = 0)
     AND p.name IS NOT NULL AND p.is_deleted = false
     AND (p_supplier_id IS NULL OR p.supplier_id = p_supplier_id)
     AND 'slug' != ALL(COALESCE(p.locked_fields, '{}'::text[]));

  -- 2. META TITLE
  UPDATE products p
     SET meta_title = generate_product_meta_title(
           p.name,
           (SELECT c.name FROM categories c WHERE c.id = COALESCE(p.main_category_id, p.category_id) LIMIT 1))
   WHERE (p_force OR p.meta_title IS NULL OR LENGTH(TRIM(COALESCE(p.meta_title, ''))) = 0)
     AND p.name IS NOT NULL AND p.is_deleted = false
     AND (p_supplier_id IS NULL OR p.supplier_id = p_supplier_id)
     AND 'meta_title' != ALL(COALESCE(p.locked_fields, '{}'::text[]));

  -- 3. META DESCRIPTION
  UPDATE products p
     SET meta_description = generate_product_meta_description(
           p.name, p.short_description, p.description, COALESCE(p.allows_personalization, false))
   WHERE (p_force OR p.meta_description IS NULL OR LENGTH(TRIM(COALESCE(p.meta_description, ''))) = 0)
     AND p.name IS NOT NULL AND p.is_deleted = false
     AND (p_supplier_id IS NULL OR p.supplier_id = p_supplier_id)
     AND 'meta_description' != ALL(COALESCE(p.locked_fields, '{}'::text[]));

  -- 4. META KEYWORDS
  UPDATE products p
     SET meta_keywords = extract_keywords(
           COALESCE(p.name,'') || ' ' || COALESCE(p.short_description,'') || ' ' ||
           COALESCE(p.description,'') || ' brinde promocional brinde corporativo brinde personalizado', 15)
   WHERE (p_force OR p.meta_keywords IS NULL
         OR array_length(p.meta_keywords,1) IS NULL OR array_length(p.meta_keywords,1) = 0)
     AND p.name IS NOT NULL AND p.is_deleted = false
     AND (p_supplier_id IS NULL OR p.supplier_id = p_supplier_id);

  -- 5. CANONICAL_URL
  UPDATE products p SET canonical_url = '/produto/' || p.slug
   WHERE (p_force OR p.canonical_url IS NULL)
     AND p.slug IS NOT NULL AND p.is_deleted = false
     AND (p_supplier_id IS NULL OR p.supplier_id = p_supplier_id);

  -- 6. OG_TITLE
  UPDATE products p SET og_title = p.meta_title
   WHERE (p_force OR p.og_title IS NULL) AND p.meta_title IS NOT NULL
     AND p.is_deleted = false
     AND (p_supplier_id IS NULL OR p.supplier_id = p_supplier_id);

  -- 7. OG_DESCRIPTION
  UPDATE products p SET og_description = p.meta_description
   WHERE (p_force OR p.og_description IS NULL) AND p.meta_description IS NOT NULL
     AND p.is_deleted = false
     AND (p_supplier_id IS NULL OR p.supplier_id = p_supplier_id);

  -- 8. OG_IMAGE_URL
  UPDATE products p SET og_image_url = p.primary_image_url
   WHERE (p_force OR p.og_image_url IS NULL) AND p.primary_image_url IS NOT NULL
     AND p.is_deleted = false
     AND (p_supplier_id IS NULL OR p.supplier_id = p_supplier_id);

  -- 8b. SCHEMA.ORG JSON-LD — versão completa com imagens e FAQs
  UPDATE products p
     SET schema_json = generate_product_jsonld(p.id, 'https://www.promogifts.com.br')
   WHERE (p_force OR p.schema_json IS NULL)
     AND p.is_deleted = false
     AND p.name IS NOT NULL
     AND p.slug IS NOT NULL
     AND (p_supplier_id IS NULL OR p.supplier_id = p_supplier_id)
     AND 'schema_json' != ALL(COALESCE(p.locked_fields, '{}'::text[]));

  GET DIAGNOSTICS v_schema_updated = ROW_COUNT;

  -- 9. Contar produtos com SEO completo
  SELECT COUNT(*) INTO v_products_updated
  FROM products WHERE slug IS NOT NULL AND is_deleted = false
    AND (p_supplier_id IS NULL OR supplier_id = p_supplier_id);

  -- 10. ALT_TEXT em product_images
  UPDATE product_images pi
     SET
       alt_text   = generate_image_alt_text(
                      (SELECT p.name FROM products p WHERE p.id = pi.product_id),
                      COALESCE(pi.image_type, 'gallery'),
                      (SELECT cv.name FROM color_variations cv WHERE cv.id = pi.color_id),
                      COALESCE(pi.display_order, 1)),
       title_text = (SELECT p.name FROM products p WHERE p.id = pi.product_id) ||
                    COALESCE(' - ' || (SELECT cv.name FROM color_variations cv WHERE cv.id = pi.color_id), '')
   WHERE (p_force OR pi.alt_text IS NULL OR LENGTH(TRIM(COALESCE(pi.alt_text, ''))) = 0)
     AND pi.product_id IS NOT NULL
     AND (p_supplier_id IS NULL OR EXISTS (
       SELECT 1 FROM products p2 WHERE p2.id = pi.product_id AND p2.supplier_id = p_supplier_id
     ));

  GET DIAGNOSTICS v_images_updated = ROW_COUNT;

  -- 11. CATEGORIES SEO
  UPDATE categories c
     SET meta_title = COALESCE(c.meta_title, c.name || ' - Brindes Promocionais | Promo Brindes'),
         meta_description = COALESCE(c.meta_description,
           'Encontre os melhores ' || LOWER(c.name) ||
           ' para brindes corporativos e eventos. Personalização com sua marca. Solicite orçamento!')
   WHERE (c.meta_title IS NULL OR c.meta_description IS NULL) AND c.is_active = true;

  GET DIAGNOSTICS v_categories_updated = ROW_COUNT;

  RETURN jsonb_build_object(
    'success',           true,
    'products_with_seo', v_products_updated,
    'schema_json_added', v_schema_updated,
    'images_updated',    v_images_updated,
    'categories_updated',v_categories_updated,
    'supplier_filter',   p_supplier_id,
    'forced',            p_force,
    'duration_ms',       EXTRACT(MILLISECONDS FROM (clock_timestamp() - v_start_time))::INTEGER
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM, 'state', SQLSTATE);
END;
$function$;;
