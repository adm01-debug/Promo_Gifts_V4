CREATE OR REPLACE FUNCTION public.fn_generate_category_jsonld(p_category_id uuid, p_base_url text DEFAULT 'https://www.promogifts.com.br'::text)
 RETURNS jsonb
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
$function$
