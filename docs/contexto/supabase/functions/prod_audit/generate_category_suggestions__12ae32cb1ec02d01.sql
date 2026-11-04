CREATE OR REPLACE FUNCTION prod_audit.generate_category_suggestions()
 RETURNS integer
 LANGUAGE plpgsql
 SET search_path TO 'prod_audit', 'public'
AS $function$
DECLARE v_inserted int;
BEGIN
  TRUNCATE prod_audit.category_suggestions RESTART IDENTITY;

  -- REGRA 1: "caneca" → categoria CANECAS (mais específica por material se possível)
  WITH cand AS (
    SELECT 
      pf.product_id, pf.name AS product_name, pf.sku, pf.name_normalized,
      pf.current_categories, pf.materials,
      -- Escolher subcategoria por material se disponível
      COALESCE(
        (SELECT c.id FROM categories c 
         WHERE c.is_active AND c.level >= 3
           AND c.full_path_readable ILIKE '%CANECAS%'
           AND EXISTS (SELECT 1 FROM unnest(pf.materials) m 
                       WHERE c.name ILIKE '%' || m || '%')
         ORDER BY c.level DESC LIMIT 1),
        -- Fallback: escolher pai "CANECAS" genérico
        (SELECT c.id FROM categories c 
         WHERE c.is_active AND c.level = 2 
           AND c.full_path_readable ILIKE 'BAR%CANECAS' LIMIT 1)
      ) AS sug_cat_id
    FROM prod_audit.product_features pf
    WHERE pf.name_normalized ~ '\ycaneca\y'
      AND NOT EXISTS (
        SELECT 1 FROM unnest(pf.current_categories) cc
        JOIN categories cat ON cat.id = cc 
        WHERE cat.full_path_readable ILIKE '%CANECAS%'
      )
  )
  INSERT INTO prod_audit.category_suggestions
    (product_id, product_name, product_sku, rule_name, 
     suggested_category_id, suggested_category_path, current_categories, confidence, reason)
  SELECT 
    cand.product_id, cand.product_name, cand.sku,
    'caneca_base',
    cand.sug_cat_id,
    c.full_path_readable,
    ARRAY(SELECT cat.full_path_readable FROM unnest(cand.current_categories) cc
          JOIN categories cat ON cat.id = cc),
    'high',
    'Nome contém "caneca" mas está em COPOS — deveria estar em CANECAS'
  FROM cand 
  JOIN categories c ON c.id = cand.sug_cat_id
  ON CONFLICT (product_id, suggested_category_id, rule_name) DO NOTHING;

  -- REGRA 2: eco_keyword mas sem ECOLOGIA
  WITH cand AS (
    SELECT pf.product_id, pf.name AS product_name, pf.sku, pf.current_categories
    FROM prod_audit.product_features pf
    WHERE pf.has_eco_keyword = true
      AND NOT EXISTS (
        SELECT 1 FROM unnest(pf.current_categories) cc
        JOIN categories cat ON cat.id = cc 
        WHERE cat.name ILIKE '%ecolog%' OR cat.full_path_readable ILIKE '%ECOLOG%'
      )
  )
  INSERT INTO prod_audit.category_suggestions
    (product_id, product_name, product_sku, rule_name,
     suggested_category_id, suggested_category_path, current_categories, confidence, reason)
  SELECT 
    cand.product_id, cand.product_name, cand.sku,
    'eco_keyword',
    c.id, c.full_path_readable,
    ARRAY(SELECT cat.full_path_readable FROM unnest(cand.current_categories) cc
          JOIN categories cat ON cat.id = cc),
    'high',
    'Nome contém "eco/reciclado/sustentável/bambu/cortiça" — deve estar em ECOLOGIA'
  FROM cand
  CROSS JOIN LATERAL (
    SELECT id, full_path_readable FROM categories 
    WHERE is_active AND level = 1 AND name ILIKE 'Ecologia%' LIMIT 1
  ) c
  ON CONFLICT (product_id, suggested_category_id, rule_name) DO NOTHING;

  -- REGRA 3: is_thermal=true sem "Térmic" em nenhuma categoria
  WITH cand AS (
    SELECT pf.product_id, pf.name, pf.sku, pf.current_categories
    FROM prod_audit.product_features pf
    JOIN products p ON p.id = pf.product_id
    WHERE p.is_thermal = true
      AND NOT EXISTS (
        SELECT 1 FROM unnest(pf.current_categories) cc
        JOIN categories cat ON cat.id = cc 
        WHERE cat.full_path_readable ILIKE '%TÉRMIC%'
      )
  )
  INSERT INTO prod_audit.category_suggestions
    (product_id, product_name, product_sku, rule_name,
     suggested_category_id, suggested_category_path, current_categories, confidence, reason)
  SELECT 
    cand.product_id, cand.name, cand.sku,
    'termico_produto', c.id, c.full_path_readable,
    ARRAY(SELECT cat.full_path_readable FROM unnest(cand.current_categories) cc
          JOIN categories cat ON cat.id = cc),
    'medium',
    'Produto marcado is_thermal=true mas não está em categoria Térmica'
  FROM cand
  CROSS JOIN LATERAL (
    SELECT id, full_path_readable FROM categories
    WHERE is_active AND full_path_readable ILIKE '%TÉRMIC%'
    ORDER BY level DESC LIMIT 1
  ) c
  ON CONFLICT (product_id, suggested_category_id, rule_name) DO NOTHING;

  -- REGRA 4: "churrasco" no nome sem categoria KIT CHURRASCO
  WITH cand AS (
    SELECT pf.product_id, pf.name, pf.sku, pf.current_categories
    FROM prod_audit.product_features pf
    WHERE pf.name_normalized ~ '\ychurrasco\y'
      AND NOT EXISTS (
        SELECT 1 FROM unnest(pf.current_categories) cc
        JOIN categories cat ON cat.id = cc 
        WHERE cat.full_path_readable ILIKE '%CHURRASCO%'
      )
  )
  INSERT INTO prod_audit.category_suggestions
    (product_id, product_name, product_sku, rule_name,
     suggested_category_id, suggested_category_path, current_categories, confidence, reason)
  SELECT 
    cand.product_id, cand.name, cand.sku,
    'kit_churrasco', c.id, c.full_path_readable,
    ARRAY(SELECT cat.full_path_readable FROM unnest(cand.current_categories) cc
          JOIN categories cat ON cat.id = cc),
    'high',
    'Nome contém "churrasco" mas não está em Kit Churrasco'
  FROM cand
  CROSS JOIN LATERAL (
    SELECT id, full_path_readable FROM categories
    WHERE is_active AND name ILIKE 'Kit Churrasco%' AND level = 3 LIMIT 1
  ) c
  ON CONFLICT (product_id, suggested_category_id, rule_name) DO NOTHING;

  SELECT COUNT(*) INTO v_inserted FROM prod_audit.category_suggestions;
  RETURN v_inserted;
END;
$function$
