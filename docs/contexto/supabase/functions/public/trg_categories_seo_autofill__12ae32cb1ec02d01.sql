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
$function$
