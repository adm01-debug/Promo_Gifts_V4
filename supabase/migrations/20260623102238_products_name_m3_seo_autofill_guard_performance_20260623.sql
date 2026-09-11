
-- ══════════════════════════════════════════════════════════════
-- M3: GUARD de performance em trg_products_seo_autofill
-- PROBLEMA: o trigger executa geração de slug/meta em TODO UPDATE
--   mesmo quando name não mudou e os campos SEO já existem.
--   Para "Caneta plástica" com 137 variantes, qualquer UPDATE
--   de estoque/preço disparava generate_product_slug (N+1 loop).
-- FIX: early return quando:
--   - é UPDATE
--   - name não mudou (OLD.name = NEW.name)
--   - slug, meta_title e meta_description já existem
--   Isso preserva: geração na criação (INSERT) · mudança de name
--   · name mudou mas slug está NULL · canonical_url/og derivados.
-- BACKWARD COMPATIBLE: INSERT e UPDATE-com-name-mudado passam normalmente.
-- ══════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.trg_products_seo_autofill()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  v_category_name TEXT;
BEGIN

  -- ══ GUARD DE PERFORMANCE (M3 — 2026-06-23) ════════════════
  -- Se UPDATE e name não mudou e campos SEO principais já existem:
  -- pular toda a geração (slug, meta, keywords, og, canonical).
  -- Isso elimina o loop N+1 de generate_product_slug em updates
  -- de estoque/preço que não tocam o name.
  IF TG_OP = 'UPDATE'
     AND OLD.name IS NOT DISTINCT FROM NEW.name
     AND NEW.slug           IS NOT NULL
     AND NEW.meta_title     IS NOT NULL
     AND NEW.meta_description IS NOT NULL
  THEN
    -- Ainda propaga og_image_url se primary_image_url apareceu agora
    IF NEW.og_image_url IS NULL AND NEW.primary_image_url IS NOT NULL THEN
      NEW.og_image_url := NEW.primary_image_url;
    END IF;
    NEW.updated_at := now();
    RETURN NEW;
  END IF;
  -- ════════════════════════════════════════════════════════════

  -- Buscar nome da categoria (para usar nos meta tags)
  IF NEW.main_category_id IS NOT NULL THEN
    SELECT name INTO v_category_name FROM categories WHERE id = NEW.main_category_id;
  ELSIF NEW.category_id IS NOT NULL THEN
    SELECT name INTO v_category_name FROM categories WHERE id = NEW.category_id;
  END IF;

  -- ============================
  -- AUTO-PREENCHER APENAS SE NULL
  -- (Permite override manual)
  -- ============================

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
      NEW.name,
      NEW.short_description,
      NEW.description,
      COALESCE(NEW.allows_personalization, false)
    );
  END IF;

  -- META KEYWORDS
  IF (NEW.meta_keywords IS NULL OR COALESCE(array_length(NEW.meta_keywords, 1), 0) = 0) AND NEW.name IS NOT NULL THEN
    NEW.meta_keywords := extract_keywords(
      COALESCE(NEW.name, '') || ' ' ||
      COALESCE(NEW.short_description, '') || ' ' ||
      COALESCE(v_category_name, '') || ' ' ||
      COALESCE(NEW.brand, '') || ' ' ||
      'brinde promocional brinde corporativo brinde personalizado',
      15
    );
  END IF;

  -- OG_TITLE (herda de meta_title)
  IF NEW.og_title IS NULL AND NEW.meta_title IS NOT NULL THEN
    NEW.og_title := NEW.meta_title;
  END IF;

  -- OG_DESCRIPTION (herda de meta_description)
  IF NEW.og_description IS NULL AND NEW.meta_description IS NOT NULL THEN
    NEW.og_description := NEW.meta_description;
  END IF;

  -- OG_IMAGE_URL (herda de primary_image_url)
  IF NEW.og_image_url IS NULL AND NEW.primary_image_url IS NOT NULL THEN
    NEW.og_image_url := NEW.primary_image_url;
  END IF;

  -- CANONICAL_URL
  IF NEW.canonical_url IS NULL AND NEW.slug IS NOT NULL THEN
    NEW.canonical_url := '/produto/' || NEW.slug;
  END IF;

  -- Atualizar timestamp
  IF TG_OP = 'UPDATE' THEN
    NEW.updated_at := now();
  END IF;

  RETURN NEW;
END;
$function$;
;
