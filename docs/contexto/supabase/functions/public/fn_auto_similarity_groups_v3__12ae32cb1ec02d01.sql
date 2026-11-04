CREATE OR REPLACE FUNCTION public.fn_auto_similarity_groups_v3()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_ins int:=0; v_mem int:=0;
  v_gid uuid; v_rec RECORD;
BEGIN
  FOR v_rec IN
    WITH mm AS (
      SELECT p.id AS pid, p.supplier_id, p.supplier_type,
        CASE
          WHEN LOWER(COALESCE(p.materials::text,'')) LIKE '%alumin%' THEN 'ALUMINIO'
          WHEN LOWER(COALESCE(p.materials::text,'')) LIKE '%plast%'
            OR LOWER(COALESCE(p.materials::text,'')) LIKE '% pp%'
            OR LOWER(COALESCE(p.materials::text,'')) LIKE '%abs%' THEN 'PLASTICO'
          WHEN LOWER(COALESCE(p.materials::text,'')) LIKE '%inox%'
            OR (LOWER(COALESCE(p.materials::text,'')) LIKE '%metal%'
              AND LOWER(COALESCE(p.materials::text,'')) NOT LIKE '%alumin%') THEN 'METAL'
          WHEN LOWER(COALESCE(p.materials::text,'')) LIKE '%bambu%' THEN 'BAMBU'
          WHEN LOWER(COALESCE(p.materials::text,'')) LIKE '%algodão%'
            OR LOWER(COALESCE(p.materials::text,'')) LIKE '%cotton%' THEN 'ALGODAO'
          WHEN LOWER(COALESCE(p.materials::text,'')) LIKE '%tecido%'
            OR LOWER(COALESCE(p.materials::text,'')) LIKE '%oxford%'
            OR LOWER(COALESCE(p.materials::text,'')) LIKE '%nylon%'
            OR LOWER(COALESCE(p.materials::text,'')) LIKE '%poliéster%' THEN 'TECIDO'
          WHEN LOWER(COALESCE(p.materials::text,'')) LIKE '%madeira%' THEN 'MADEIRA'
          WHEN LOWER(COALESCE(p.materials::text,'')) LIKE '%couro%'
            OR LOWER(COALESCE(p.materials::text,'')) LIKE '% pu %' THEN 'COURO_PU'
          ELSE 'MISTO'
        END AS material_key
      FROM products p
      WHERE p.is_active=true AND p.is_deleted=false
        AND p.supplier_type IS NOT NULL AND p.supplier_type!=''
        AND NOT EXISTS (
          SELECT 1 FROM product_similarity_group_members x WHERE x.product_id=p.id
        )
    )
    SELECT supplier_type, material_key,
      COUNT(*) AS n_prod, COUNT(DISTINCT supplier_id) AS n_sup,
      ARRAY_AGG(pid ORDER BY pid) AS pids
    FROM mm
    GROUP BY supplier_type, material_key
    HAVING COUNT(*) >= 3
    ORDER BY COUNT(*) DESC
  LOOP
    INSERT INTO product_similarity_groups(
      id,name,material_family,capacity_band,capacity_min,capacity_max,
      match_criteria,match_source,is_active,created_at,updated_at
    ) VALUES (
      gen_random_uuid(),
      initcap(regexp_replace(COALESCE(v_rec.supplier_type,'Outros'),'[|/\\&]+',' | ','g'))
        || ' — ' || v_rec.material_key || ' (intra)',
      v_rec.material_key,'ALL',0,99999,
      jsonb_build_object('supplier_type',v_rec.supplier_type,'material_key',v_rec.material_key,
        'min_products',3,'min_suppliers',1,'pass','v3_intra'),
      'automatic_v3_intra',true,NOW(),NOW()
    )
    RETURNING id INTO v_gid;
    v_ins:=v_ins+1;

    INSERT INTO product_similarity_group_members(
      id,group_id,product_id,supplier_id,is_reference_product,similarity_score,match_source,created_at
    )
    SELECT gen_random_uuid(),v_gid,p.id,p.supplier_id,false,0.85,'automatic_v3_intra',NOW()
    FROM products p WHERE p.id=ANY(v_rec.pids);

    v_mem:=v_mem+array_length(v_rec.pids,1);
  END LOOP;

  RETURN jsonb_build_object('groups_created',v_ins,'members_added',v_mem);
END;
$function$
