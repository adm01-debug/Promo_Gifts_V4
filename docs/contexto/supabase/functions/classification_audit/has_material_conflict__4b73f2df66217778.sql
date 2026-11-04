CREATE OR REPLACE FUNCTION classification_audit.has_material_conflict(p_product_name text, p_category_path text)
 RETURNS boolean
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public', 'extensions'
AS $function$
  WITH 
  prod_norm AS (SELECT lower(unaccent(p_product_name)) AS n),
  cat_norm AS (SELECT lower(unaccent(p_category_path)) AS p),
  -- Materiais mutuamente exclusivos
  conflicts AS (
    SELECT * FROM (VALUES
      ('aluminio',  ARRAY['plastico','vidro','couro','madeira','bambu']),
      ('inox',      ARRAY['plastico','couro','madeira','bambu','papel']),
      ('vidro',     ARRAY['plastico','couro','madeira','bambu','papel']),
      ('plastico',  ARRAY['vidro','aluminio','inox','couro','bambu']),
      ('couro',     ARRAY['plastico','vidro','aluminio','inox','papel']),
      ('madeira',   ARRAY['plastico','vidro','aluminio','inox','couro']),
      ('bambu',     ARRAY['plastico','vidro','aluminio','inox','couro']),
      ('nylon',     ARRAY['couro','vidro','metal','madeira']),
      ('poliester', ARRAY['couro','vidro','metal','madeira','bambu'])
    ) AS t(material, conflito_com)
  )
  SELECT EXISTS (
    SELECT 1 FROM conflicts c, prod_norm, cat_norm
    WHERE prod_norm.n LIKE '%' || c.material || '%'
      AND EXISTS (
        SELECT 1 FROM unnest(c.conflito_com) conf
        WHERE cat_norm.p LIKE '%' || conf || '%'
      )
      -- produto NÃO pode mencionar também o material conflitante
      AND NOT EXISTS (
        SELECT 1 FROM unnest(c.conflito_com) conf
        WHERE prod_norm.n LIKE '%' || conf || '%'
      )
  );
$function$
