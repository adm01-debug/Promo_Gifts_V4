
CREATE OR REPLACE FUNCTION public.fn_normalize_silver_all()
RETURNS JSONB LANGUAGE plpgsql AS $$
DECLARE
  v_ncm_fixed    INT := 0;
  v_names_fixed  INT := 0;
  v_cats_fixed   INT := 0;
  v_mats_fixed   INT := 0;
  v_mats_b       INT := 0;
  v_colors_fixed INT := 0;
BEGIN
  -- 1. NCM
  UPDATE silver_products sp SET ncm_code=fn_normalize_ncm(sp.ncm_code), updated_at=now()
  WHERE sp.ncm_code IS NOT NULL AND sp.ncm_code != COALESCE(fn_normalize_ncm(sp.ncm_code),'');
  GET DIAGNOSTICS v_ncm_fixed = ROW_COUNT;

  -- 2. Nomes
  UPDATE silver_products sp SET name=fn_clean_spot_name(sp.name), updated_at=now()
  WHERE fn_clean_spot_name(sp.name) IS NOT NULL AND fn_clean_spot_name(sp.name) != sp.name;
  GET DIAGNOSTICS v_names_fixed = ROW_COUNT;

  -- 3. Categorias
  UPDATE silver_products sp
  SET norm_category_id=(SELECT c.category_id FROM classify_xbz_category(sp.name) c LIMIT 1), updated_at=now()
  WHERE sp.norm_category_id IS NULL AND sp.name IS NOT NULL
    AND (SELECT c.category_id FROM classify_xbz_category(sp.name) c LIMIT 1) IS NOT NULL;
  GET DIAGNOSTICS v_cats_fixed = ROW_COUNT;

  -- 4. Materiais CASE completo (inclui materiais antes sem mapeamento)
  -- WHERE garante que só toca rows onde o CASE retorna non-null (fix idempotencia)
  UPDATE silver_products sp
  SET norm_material_id = CASE extract_xbz_material_primary(sp.name, sp.description)
    WHEN 'Aco Inoxidavel' THEN 'cb57937b-9b38-479b-b234-6a5f36bf53e9'::uuid
    WHEN 'Aco Inoxidável' THEN 'cb57937b-9b38-479b-b234-6a5f36bf53e9'::uuid
    WHEN 'Aço Inoxidável' THEN 'cb57937b-9b38-479b-b234-6a5f36bf53e9'::uuid
    WHEN 'Aço'            THEN 'cb57937b-9b38-479b-b234-6a5f36bf53e9'::uuid
    WHEN 'Metal'          THEN '7ca6b9b4-ea7b-4549-b65f-2b0cf5f34e07'::uuid
    WHEN 'Plástico'       THEN 'e0a1a83e-7ea7-41c8-87f9-87b2ad85be9e'::uuid
    WHEN 'Poliéster'      THEN 'b37e770d-a348-4675-8b18-e89a557edd09'::uuid
    WHEN 'Alumínio'       THEN '8064ea4c-6e7a-4d66-9753-71e03e91206a'::uuid
    WHEN 'Nylon'          THEN '7aa93fdb-fa9a-47f9-b3c7-0d3d47b822d4'::uuid
    WHEN 'Bambu'          THEN '950c158a-af72-44f7-872f-5a5a8c59ba7d'::uuid
    WHEN 'Vidro'          THEN '267ebae7-7f7f-4195-9ef4-32a851ad1b58'::uuid
    WHEN 'Couro Sintético' THEN 'be1a088a-cd35-4479-a857-402ff80a8c37'::uuid
    WHEN 'Couro'          THEN 'be1a088a-cd35-4479-a857-402ff80a8c37'::uuid
    WHEN 'ABS'            THEN 'c8d1b48d-5f3c-4527-b1c6-28624ed657fd'::uuid
    WHEN 'Algodão'        THEN '9f699d60-4168-47f1-b46c-109f784743bb'::uuid
    WHEN 'Polipropileno (PP)' THEN 'e8c6c7ac-513e-4d3c-a263-b9d188ed8a2d'::uuid
    WHEN 'Borracha'       THEN '4a86383b-6c7a-472f-9596-e97e913e250f'::uuid
    WHEN 'PVC'            THEN '2cb5ac93-1475-4dfa-a06d-eca5bdc06be5'::uuid
    WHEN 'Madeira'        THEN '535ef217-7dea-4ac8-8009-7e6af72e3ea7'::uuid
    WHEN 'Silicone'       THEN '672c47ab-d80d-4bf2-9c73-37be67bb01f2'::uuid
    WHEN 'Cortiça'        THEN '60c6e101-bd1b-4480-a335-cd18bf06eb22'::uuid
    WHEN 'PET'            THEN 'ade1bcdf-15a4-4060-a09f-2a50457f56b1'::uuid
    WHEN 'Cerâmica'       THEN '3927beb3-1c04-45c2-9d65-7198195879a8'::uuid
    WHEN 'Acrílico'       THEN '94cf3197-dc3c-4556-be0d-c2825c187109'::uuid
    WHEN 'Poliestireno (PS)' THEN '2ad2ac4e-3131-4114-a204-b7f2288079a6'::uuid
    WHEN 'Polietileno (PE)'  THEN '810fbd4f-0aa8-4c54-a143-2405a02b6773'::uuid
    WHEN 'MDF'            THEN '8d7b8165-03a9-45eb-bfe1-bcf8c167f088'::uuid
    WHEN 'EVA'            THEN '8ce9b0a0-d3bc-4bb4-a078-5c401ae5b1c5'::uuid
    WHEN 'Oxford'         THEN '921f1d32-fbbc-4c25-9e1d-52b4a8a80af4'::uuid
    WHEN 'Papel'          THEN '811a42ea-b2db-4d01-aecc-34480212deda'::uuid
    WHEN 'Papel Kraft'    THEN '8f6418b3-e1b3-486c-9962-155fa60d2ee6'::uuid
    WHEN 'Papelão'        THEN '811a42ea-b2db-4d01-aecc-34480212deda'::uuid
    WHEN 'Non-woven (TNT)' THEN 'd9102def-1af8-439e-9b75-40c1dad375f5'::uuid
    WHEN 'Juta'           THEN '84e44911-8689-4b80-9829-5a0bdeb6f4c4'::uuid
    WHEN 'Neoprene'       THEN '84814f24-e3a6-4fee-9ea9-4c606a36c3ba'::uuid
    WHEN 'Microfibra'     THEN 'd874ad24-4f55-42a2-a914-6def776dbcab'::uuid
    WHEN 'Porcelana'      THEN '8110bf3e-dd17-45f4-805b-a35717a160f8'::uuid
    WHEN 'Material Reciclado' THEN '39bf69ac-aa5a-4f1d-80cd-cadcfb44469a'::uuid
    WHEN 'Lona'           THEN '84e44911-8689-4b80-9829-5a0bdeb6f4c4'::uuid
    WHEN 'Tritan'         THEN '0f72df91-18dd-4d14-863f-4b0c6e848b81'::uuid
    WHEN 'Cobre'          THEN '9b23ddaf-67a0-48e1-ba9f-b9e686a695b1'::uuid
    WHEN 'Zinco'          THEN 'ec57fd10-0afc-43e9-822c-f981957d10f7'::uuid
    ELSE NULL
  END, updated_at=now()
  WHERE sp.norm_material_id IS NULL AND sp.name IS NOT NULL
    AND CASE extract_xbz_material_primary(sp.name, sp.description)
      WHEN 'Aco Inoxidavel' THEN 1 WHEN 'Aco Inoxidável' THEN 1
      WHEN 'Aço Inoxidável' THEN 1 WHEN 'Aço' THEN 1 WHEN 'Metal' THEN 1
      WHEN 'Plástico' THEN 1 WHEN 'Poliéster' THEN 1 WHEN 'Alumínio' THEN 1
      WHEN 'Nylon' THEN 1 WHEN 'Bambu' THEN 1 WHEN 'Vidro' THEN 1
      WHEN 'Couro Sintético' THEN 1 WHEN 'Couro' THEN 1 WHEN 'ABS' THEN 1
      WHEN 'Algodão' THEN 1 WHEN 'Polipropileno (PP)' THEN 1
      WHEN 'Borracha' THEN 1 WHEN 'PVC' THEN 1 WHEN 'Madeira' THEN 1
      WHEN 'Silicone' THEN 1 WHEN 'Cortiça' THEN 1 WHEN 'PET' THEN 1
      WHEN 'Cerâmica' THEN 1 WHEN 'Acrílico' THEN 1 WHEN 'Poliestireno (PS)' THEN 1
      WHEN 'Polietileno (PE)' THEN 1 WHEN 'MDF' THEN 1 WHEN 'EVA' THEN 1
      WHEN 'Oxford' THEN 1 WHEN 'Papel' THEN 1 WHEN 'Papel Kraft' THEN 1
      WHEN 'Papelão' THEN 1 WHEN 'Non-woven (TNT)' THEN 1 WHEN 'Juta' THEN 1
      WHEN 'Neoprene' THEN 1 WHEN 'Microfibra' THEN 1 WHEN 'Porcelana' THEN 1
      WHEN 'Material Reciclado' THEN 1 WHEN 'Lona' THEN 1 WHEN 'Tritan' THEN 1
      WHEN 'Cobre' THEN 1 WHEN 'Zinco' THEN 1 ELSE NULL
    END = 1;
  GET DIAGNOSTICS v_mats_fixed = ROW_COUNT;

  -- 4b. Adjetivos femininos (plástica, metálica, etc.)
  UPDATE silver_products sp
  SET norm_material_id = CASE
    WHEN sp.name ILIKE '%plastica%' OR sp.name ILIKE '%plastico%'  THEN 'e0a1a83e-7ea7-41c8-87f9-87b2ad85be9e'::uuid
    WHEN sp.name ILIKE '%plástica%' OR sp.name ILIKE '%plástico%'  THEN 'e0a1a83e-7ea7-41c8-87f9-87b2ad85be9e'::uuid
    WHEN sp.name ILIKE '%metalica%' OR sp.name ILIKE '%metalico%'  THEN '7ca6b9b4-ea7b-4549-b65f-2b0cf5f34e07'::uuid
    WHEN sp.name ILIKE '%metálica%' OR sp.name ILIKE '%metálico%'  THEN '7ca6b9b4-ea7b-4549-b65f-2b0cf5f34e07'::uuid
    WHEN sp.name ILIKE '%inox%'                                    THEN 'cb57937b-9b38-479b-b234-6a5f36bf53e9'::uuid
    WHEN sp.name ILIKE '%ceramica%' OR sp.name ILIKE '%cerâmica%'  THEN '3927beb3-1c04-45c2-9d65-7198195879a8'::uuid
    WHEN sp.name ILIKE '%vidro%'                                   THEN '267ebae7-7f7f-4195-9ef4-32a851ad1b58'::uuid
    WHEN sp.name ILIKE '%aluminio%' OR sp.name ILIKE '%alumínio%'  THEN '8064ea4c-6e7a-4d66-9753-71e03e91206a'::uuid
    WHEN sp.name ILIKE '%bambu%'                                   THEN '950c158a-af72-44f7-872f-5a5a8c59ba7d'::uuid
    WHEN sp.name ILIKE '%borracha%'                                THEN '4a86383b-6c7a-472f-9596-e97e913e250f'::uuid
    WHEN sp.name ILIKE '%silicone%'                                THEN '672c47ab-d80d-4bf2-9c73-37be67bb01f2'::uuid
    WHEN sp.name ILIKE '%couro%'                                   THEN 'be1a088a-cd35-4479-a857-402ff80a8c37'::uuid
    WHEN sp.name ILIKE '%algodao%' OR sp.name ILIKE '%algodão%'   THEN '9f699d60-4168-47f1-b46c-109f784743bb'::uuid
    WHEN sp.name ILIKE '%nylon%'                                   THEN '7aa93fdb-fa9a-47f9-b3c7-0d3d47b822d4'::uuid
    ELSE NULL
  END, updated_at=now()
  WHERE sp.norm_material_id IS NULL AND sp.name IS NOT NULL
    AND (sp.name ILIKE '%plastica%' OR sp.name ILIKE '%plasticamente%' OR
         sp.name ILIKE '%plástica%' OR sp.name ILIKE '%plástico%' OR
         sp.name ILIKE '%metalica%' OR sp.name ILIKE '%metálica%' OR
         sp.name ILIKE '%metálico%' OR sp.name ILIKE '%inox%' OR
         sp.name ILIKE '%ceramica%' OR sp.name ILIKE '%cerâmica%' OR
         sp.name ILIKE '%vidro%'    OR sp.name ILIKE '%aluminio%' OR
         sp.name ILIKE '%alumínio%' OR sp.name ILIKE '%bambu%' OR
         sp.name ILIKE '%borracha%' OR sp.name ILIKE '%silicone%' OR
         sp.name ILIKE '%couro%'    OR sp.name ILIKE '%algodao%' OR
         sp.name ILIKE '%algodão%'  OR sp.name ILIKE '%nylon%');
  GET DIAGNOSTICS v_mats_b = ROW_COUNT;
  v_mats_fixed := v_mats_fixed + v_mats_b;

  -- 5. Cores
  UPDATE silver_variants sv SET norm_color_id=ce.promo_variation_id, updated_at=now()
  FROM supplier_colors sc
  JOIN color_equivalences ce ON ce.supplier_color_id=sc.id AND ce.is_active
  WHERE sv.supplier_id=sc.supplier_id AND sv.norm_color_id IS NULL AND sv.color_code IS NOT NULL
    AND UPPER(trim(sc.code))=UPPER(trim(sv.color_code));

  UPDATE silver_variants sv SET norm_color_id=ce.promo_variation_id, updated_at=now()
  FROM supplier_colors sc
  JOIN color_equivalences ce ON ce.supplier_color_id=sc.id AND ce.is_active
  WHERE sv.supplier_id=sc.supplier_id AND sv.norm_color_id IS NULL AND sv.color_name IS NOT NULL
    AND UPPER(trim(sc.name))=UPPER(trim(sv.color_name));
  GET DIAGNOSTICS v_colors_fixed = ROW_COUNT;

  RETURN jsonb_build_object(
    'ncm_fixed',v_ncm_fixed,'names_fixed',v_names_fixed,
    'categories_fixed',v_cats_fixed,'materials_fixed',v_mats_fixed,
    'colors_fixed',v_colors_fixed,'ran_at',now()
  );
END;
$$;
;
