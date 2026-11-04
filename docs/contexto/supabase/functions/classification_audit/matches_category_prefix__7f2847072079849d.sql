CREATE OR REPLACE FUNCTION classification_audit.matches_category_prefix(p_product_name text, p_category_name text)
 RETURNS boolean
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public', 'extensions'
AS $function$
  WITH norm AS (
    SELECT 
      -- Normaliza ambos: lowercase, sem acento, sem pontuação, sem |
      regexp_replace(lower(unaccent(p_product_name)), '[^a-z0-9 ]', ' ', 'g') AS prod,
      regexp_replace(lower(unaccent(p_category_name)), '[|,\.\-]', ' ', 'g') AS cat
  )
  SELECT 
    -- Categoria começa com mesmos N tokens que produto, ou é substring próxima do início
    EXISTS (
      SELECT 1 FROM norm
      WHERE prod LIKE regexp_replace(cat, '\s+', ' ', 'g') || '%'
         OR prod LIKE '%' || regexp_replace(cat, '\s+', ' ', 'g') || '%'
    )
  FROM norm;
$function$
