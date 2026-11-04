CREATE OR REPLACE FUNCTION public.fn_auto_similarity_groups_v2()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_groups_created int := 0;
  v_members_added  int := 0;
  v_group_id       uuid;
  v_rec            RECORD;
  v_name           text;
BEGIN
  -- CTE para calcular grupos candidatos (orphans com ≥2 suppliers e ≥3 produtos)
  FOR v_rec IN
    WITH material_map AS (
      SELECT 
        p.id AS product_id,
        p.supplier_id,
        p.supplier_type,
        CASE 
          WHEN LOWER(COALESCE(p.materials::text,'')) LIKE '%alumin%'                        THEN 'ALUMINIO'
          WHEN LOWER(COALESCE(p.materials::text,'')) LIKE '%plast%'
            OR LOWER(COALESCE(p.materials::text,'')) LIKE '% pp%'
            OR LOWER(COALESCE(p.materials::text,'')) LIKE '%abs%'                           THEN 'PLASTICO'
          WHEN LOWER(COALESCE(p.materials::text,'')) LIKE '%inox%'
            OR LOWER(COALESCE(p.materials::text,'')) LIKE '%aço inox%'
            OR (LOWER(COALESCE(p.materials::text,'')) LIKE '%metal%'
              AND LOWER(COALESCE(p.materials::text,'')) NOT LIKE '%alumin%')                THEN 'METAL'
          WHEN LOWER(COALESCE(p.materials::text,'')) LIKE '%bambu%'                         THEN 'BAMBU'
          WHEN LOWER(COALESCE(p.materials::text,'')) LIKE '%algodão%'
            OR LOWER(COALESCE(p.materials::text,'')) LIKE '%cotton%'                        THEN 'ALGODAO'
          WHEN LOWER(COALESCE(p.materials::text,'')) LIKE '%tecido%'
            OR LOWER(COALESCE(p.materials::text,'')) LIKE '%oxford%'
            OR LOWER(COALESCE(p.materials::text,'')) LIKE '%nylon%'
            OR LOWER(COALESCE(p.materials::text,'')) LIKE '%poliéster%'                    THEN 'TECIDO'
          WHEN LOWER(COALESCE(p.materials::text,'')) LIKE '%madeira%'
            OR LOWER(COALESCE(p.materials::text,'')) LIKE '%wood%'                          THEN 'MADEIRA'
          WHEN LOWER(COALESCE(p.materials::text,'')) LIKE '%couro%'
            OR LOWER(COALESCE(p.materials::text,'')) LIKE '% pu %'
            OR LOWER(COALESCE(p.materials::text,'')) LIKE '%sintético%'                    THEN 'COURO_PU'
          ELSE 'MISTO'
        END AS material_key
      FROM products p
      WHERE p.is_active = true AND p.is_deleted = false
        AND p.supplier_type IS NOT NULL AND p.supplier_type != ''
        AND NOT EXISTS (
          SELECT 1 FROM product_similarity_group_members psgm WHERE psgm.product_id = p.id
        )
    ),
    group_candidates AS (
      SELECT 
        supplier_type,
        material_key,
        COUNT(*) AS n_products,
        COUNT(DISTINCT supplier_id) AS n_suppliers,
        ARRAY_AGG(product_id ORDER BY product_id) AS product_ids
      FROM material_map
      GROUP BY supplier_type, material_key
      HAVING COUNT(*) >= 3 AND COUNT(DISTINCT supplier_id) >= 2
    )
    SELECT * FROM group_candidates ORDER BY n_products DESC
  LOOP
    -- Nome do grupo
    v_name := initcap(regexp_replace(
      COALESCE(v_rec.supplier_type, 'Outros'), '[|/\\&]+', ' | ', 'g'
    )) || ' — ' || v_rec.material_key;

    -- Inserir grupo
    INSERT INTO product_similarity_groups(
      id, name, material_family, capacity_band,
      capacity_min, capacity_max,
      match_criteria, match_source, is_active,
      created_at, updated_at
    ) VALUES (
      gen_random_uuid(), v_name, v_rec.material_key, 'ALL',
      0, 99999,
      jsonb_build_object(
        'supplier_type', v_rec.supplier_type,
        'material_key',  v_rec.material_key,
        'min_products',  3,
        'min_suppliers', 2
      ),
      'automatic_v2', true, NOW(), NOW()
    )
    RETURNING id INTO v_group_id;
    v_groups_created := v_groups_created + 1;

    -- Inserir membros
    INSERT INTO product_similarity_group_members(
      id, group_id, product_id, supplier_id,
      is_reference_product, similarity_score,
      match_source, created_at
    )
    SELECT
      gen_random_uuid(), v_group_id, p.id, p.supplier_id,
      false, 1.00, 'automatic_v2', NOW()
    FROM products p
    WHERE p.id = ANY(v_rec.product_ids);

    v_members_added := v_members_added + array_length(v_rec.product_ids, 1);
  END LOOP;

  RETURN jsonb_build_object(
    'groups_created', v_groups_created,
    'members_added',  v_members_added
  );
END;
$function$
