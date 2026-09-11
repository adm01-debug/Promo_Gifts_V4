-- ═══════════════════════════════════════════════════════════════════════
-- SEO M2: schema_json para categorias
-- fix_version: seo_categories_jsonld_v1_20260627
-- Cria fn_generate_category_jsonld + atualiza trg_categories_seo_autofill
-- + batch UPDATE categorias existentes
-- ═══════════════════════════════════════════════════════════════════════

-- ── PARTE 1: Função geradora de JSON-LD para categorias ──────────────
CREATE OR REPLACE FUNCTION public.fn_generate_category_jsonld(
  p_category_id UUID,
  p_base_url    TEXT DEFAULT 'https://www.promogifts.com.br'
)
 RETURNS JSONB
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
-- fix_version: seo_categories_jsonld_v1_20260627
DECLARE
  v_cat    RECORD;
  v_parent RECORD;
  v_items  JSONB;
BEGIN
  SELECT c.*, s.slug AS parent_slug, s.name AS parent_name
    INTO v_cat
  FROM categories c
  LEFT JOIN categories s ON s.id = c.parent_id
  WHERE c.id = p_category_id;

  IF NOT FOUND THEN RETURN NULL; END IF;

  -- BreadcrumbList dinâmica (até 3 níveis)
  IF v_cat.parent_id IS NOT NULL AND v_cat.parent_slug IS NOT NULL THEN
    v_items := jsonb_build_array(
      jsonb_build_object('@type','ListItem','position',1,'name','Início','item', p_base_url),
      jsonb_build_object('@type','ListItem','position',2,'name',v_cat.parent_name,'item', p_base_url || '/categoria/' || v_cat.parent_slug),
      jsonb_build_object('@type','ListItem','position',3,'name',v_cat.name,'item', p_base_url || '/categoria/' || v_cat.slug)
    );
  ELSE
    v_items := jsonb_build_array(
      jsonb_build_object('@type','ListItem','position',1,'name','Início','item', p_base_url),
      jsonb_build_object('@type','ListItem','position',2,'name',v_cat.name,'item', p_base_url || '/categoria/' || v_cat.slug)
    );
  END IF;

  RETURN jsonb_build_object(
    '@context',    'https://schema.org',
    '@type',       'CollectionPage',
    'name',        COALESCE(v_cat.meta_title, v_cat.name || ' - Brindes Corporativos | Promo Brindes'),
    'description', COALESCE(v_cat.meta_description,
                     'Encontre os melhores ' || LOWER(v_cat.name) ||
                     ' para brindes corporativos. Personalização disponível. Entrega para todo Brasil.'),
    'url',         p_base_url || '/categoria/' || v_cat.slug,
    'numberOfItems', COALESCE(v_cat.products_count, 0),
    'breadcrumb',  jsonb_build_object(
      '@type',           'BreadcrumbList',
      'itemListElement', v_items
    )
  );
END;
$function$;

-- ── PARTE 2: Trigger de categorias com schema_json ────────────────────
CREATE OR REPLACE FUNCTION public.trg_categories_seo_autofill()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
-- fix_version: seo_categories_jsonld_v1_20260627
-- anti-regression: bloco schema_json deve permanecer após meta_title e meta_description
DECLARE
  v_parent_name TEXT;
  v_parent_slug TEXT;
BEGIN
  IF NEW.parent_id IS NOT NULL THEN
    SELECT name, slug INTO v_parent_name, v_parent_slug FROM categories WHERE id = NEW.parent_id;
  END IF;

  -- META TITLE
  IF (NEW.meta_title IS NULL OR LENGTH(TRIM(COALESCE(NEW.meta_title, ''))) = 0) AND NEW.name IS NOT NULL THEN
    IF v_parent_name IS NOT NULL THEN
      NEW.meta_title := NEW.name || ' - ' || v_parent_name || ' | Promo Brindes';
    ELSE
      NEW.meta_title := NEW.name || ' - Brindes Promocionais | Promo Brindes';
    END IF;
    NEW.meta_title := LEFT(NEW.meta_title, 60);
  END IF;

  -- META DESCRIPTION
  IF (NEW.meta_description IS NULL OR LENGTH(TRIM(COALESCE(NEW.meta_description, ''))) = 0) AND NEW.name IS NOT NULL THEN
    NEW.meta_description := 'Encontre os melhores ' || LOWER(NEW.name) ||
      ' para brindes corporativos. Personalização disponível. Entrega para todo Brasil. Solicite orçamento!';
    NEW.meta_description := LEFT(NEW.meta_description, 160);
  END IF;

  -- AI_SUMMARY
  IF (NEW.ai_summary IS NULL OR LENGTH(TRIM(COALESCE(NEW.ai_summary, ''))) = 0) AND NEW.name IS NOT NULL THEN
    NEW.ai_summary := 'A categoria ' || NEW.name ||
      ' oferece diversas opções de brindes promocionais para empresas. ' ||
      'Todos os produtos podem ser personalizados com a logo da sua empresa. Entrega para todo Brasil.';
  END IF;

  -- SCHEMA.ORG JSON-LD (CollectionPage + BreadcrumbList)
  -- Gera inline pois no BEFORE trigger o slug do NEW já está disponível
  IF (NEW.schema_json IS NULL OR TG_OP = 'UPDATE' AND OLD.name IS DISTINCT FROM NEW.name)
     AND NEW.slug IS NOT NULL AND NEW.name IS NOT NULL THEN
    IF v_parent_slug IS NOT NULL THEN
      NEW.schema_json := jsonb_build_object(
        '@context',    'https://schema.org',
        '@type',       'CollectionPage',
        'name',        COALESCE(NEW.meta_title, NEW.name || ' - Brindes Corporativos | Promo Brindes'),
        'description', COALESCE(NEW.meta_description,
                         'Encontre os melhores ' || LOWER(NEW.name) || ' para brindes corporativos.'),
        'url',         'https://www.promogifts.com.br/categoria/' || NEW.slug,
        'numberOfItems', COALESCE(NEW.products_count, 0),
        'breadcrumb',  jsonb_build_object(
          '@type',           'BreadcrumbList',
          'itemListElement', jsonb_build_array(
            jsonb_build_object('@type','ListItem','position',1,'name','Início','item','https://www.promogifts.com.br'),
            jsonb_build_object('@type','ListItem','position',2,'name',v_parent_name,'item','https://www.promogifts.com.br/categoria/' || v_parent_slug),
            jsonb_build_object('@type','ListItem','position',3,'name',NEW.name,'item','https://www.promogifts.com.br/categoria/' || NEW.slug)
          )
        )
      );
    ELSE
      NEW.schema_json := jsonb_build_object(
        '@context',    'https://schema.org',
        '@type',       'CollectionPage',
        'name',        COALESCE(NEW.meta_title, NEW.name || ' - Brindes Corporativos | Promo Brindes'),
        'description', COALESCE(NEW.meta_description,
                         'Encontre os melhores ' || LOWER(NEW.name) || ' para brindes corporativos.'),
        'url',         'https://www.promogifts.com.br/categoria/' || NEW.slug,
        'numberOfItems', COALESCE(NEW.products_count, 0),
        'breadcrumb',  jsonb_build_object(
          '@type',           'BreadcrumbList',
          'itemListElement', jsonb_build_array(
            jsonb_build_object('@type','ListItem','position',1,'name','Início','item','https://www.promogifts.com.br'),
            jsonb_build_object('@type','ListItem','position',2,'name',NEW.name,'item','https://www.promogifts.com.br/categoria/' || NEW.slug)
          )
        )
      );
    END IF;
  END IF;

  IF TG_OP = 'UPDATE' THEN NEW.updated_at := now(); END IF;
  RETURN NEW;
END;
$function$;

-- ── PARTE 3: Batch UPDATE — popula schema_json em todas as categorias ativas ──
UPDATE categories c
   SET schema_json = fn_generate_category_jsonld(c.id, 'https://www.promogifts.com.br')
 WHERE c.is_active = true
   AND c.slug IS NOT NULL
   AND (c.schema_json IS NULL
        OR c.schema_json->>'@context' IS NULL
        OR c.schema_json->>'@context' != 'https://schema.org');;
