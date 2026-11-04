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
$function$
