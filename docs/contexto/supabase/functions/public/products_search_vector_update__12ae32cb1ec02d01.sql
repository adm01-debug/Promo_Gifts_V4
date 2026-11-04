CREATE OR REPLACE FUNCTION public.products_search_vector_update()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'extensions'
AS $function$
BEGIN
  NEW.search_vector :=
    -- Peso A: nome + SKU (maior relevância)
    setweight(to_tsvector('portuguese', unaccent(coalesce(NEW.name, ''))),          'A') ||
    setweight(to_tsvector('portuguese', unaccent(coalesce(NEW.sku::text, ''))),     'A') ||
    -- Peso B: descrição curta + marca
    setweight(to_tsvector('portuguese', unaccent(coalesce(NEW.short_description, ''))), 'B') ||
    setweight(to_tsvector('portuguese', unaccent(coalesce(NEW.brand::text, ''))),   'B') ||
    -- Peso C: descrição longa + meta_keywords (sinônimos, tags, materiais)
    setweight(to_tsvector('portuguese', unaccent(coalesce(NEW.description, ''))),   'C') ||
    setweight(to_tsvector('portuguese',
      unaccent(coalesce(array_to_string(NEW.meta_keywords, ' '), ''))
    ), 'C');
  RETURN NEW;
END;
$function$
