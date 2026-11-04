CREATE OR REPLACE FUNCTION public.fn_link_asia_colors_from_bronze()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_supplier_id     uuid   := 'd2734e23-d633-4819-bb15-e51aa44e2118';
  v_updated_bronze  int    := 0;
  v_updated_name    int    := 0;
  v_total_before    int;
  v_total_after     int;
BEGIN
  SELECT COUNT(*) INTO v_total_before
  FROM product_variants pv
  JOIN products p ON p.id = pv.product_id
  WHERE p.supplier_id = v_supplier_id AND pv.color_id IS NULL AND pv.is_active = true;

  -- ESTRATÉGIA 1: Cor via Bronze (atributos.cor.value)
  WITH bronze_resolved AS (
    SELECT DISTINCT ON (pv.id)
      pv.id AS variant_id,
      vm.color_variation_id,
      vm.internal_color_name,
      vm.internal_hex
    FROM product_variants pv
    JOIN products p ON p.id = pv.product_id
    JOIN supplier_products_raw spr
      ON spr.supplier_id = p.supplier_id
      AND spr.supplier_sku = RTRIM(p.supplier_reference, 'P')
    JOIN supplier_colors sc
      ON sc.supplier_id = v_supplier_id AND sc.is_active = true
      AND LOWER(TRIM(sc.name)) = LOWER(TRIM(spr.raw_data->'atributos'->'cor'->>'value'))
    JOIN vw_color_mapping vm ON vm.supplier_color_id = sc.id AND vm.rank = 1
    WHERE p.supplier_id = v_supplier_id AND pv.color_id IS NULL AND pv.is_active = true
      AND spr.raw_data->'atributos'->'cor'->>'value' IS NOT NULL
    ORDER BY pv.id, vm.confidence_score DESC
  )
  UPDATE product_variants pv
  SET color_id = br.color_variation_id, color_name = br.internal_color_name,
      color_hex = br.internal_hex, updated_at = now()
  FROM bronze_resolved br WHERE pv.id = br.variant_id AND pv.color_id IS NULL;
  GET DIAGNOSTICS v_updated_bronze = ROW_COUNT;

  -- ESTRATÉGIA 2: Cor via nome no Bronze (palavras-chave no campo 'nome')
  WITH kw_map(keyword, cv_id, cv_name, cv_hex) AS (
    VALUES
      ('PRETO',       'aaa46113-20f7-4585-83ab-1ec49cc40fc2'::uuid, 'Preto', '#000000'),
      ('PRETA',       'aaa46113-20f7-4585-83ab-1ec49cc40fc2'::uuid, 'Preto', '#000000'),
      ('BRANCO',      '77ec212c-47f8-4a6f-ba66-1734c286d67b'::uuid, 'Branco', '#FFFFFF'),
      ('BRANCA',      '77ec212c-47f8-4a6f-ba66-1734c286d67b'::uuid, 'Branco', '#FFFFFF'),
      ('AZUL',        '34b1361e-f965-4aea-b801-2001246c7d1e'::uuid, 'Azul', '#0000FF'),
      ('VERDE',       'a366339c-b41d-4c3d-80cb-d8baabdf8f32'::uuid, 'Verde Floresta', '#228B22'),
      ('VERMELHO',    'c98f9e38-a2e7-48a2-8260-a8f11c744670'::uuid, 'Vermelho Escarlate', '#FF2400'),
      ('AMARELO',     '7598ef45-35be-4c56-8569-8eeaf3d0bd99'::uuid, 'Amarelo Milho', '#FBEC5D'),
      ('ROSA',        '81ab1f0f-6db5-4b5d-9364-a1b8b0c2ad84'::uuid, 'Rosa Bebê', '#F4C2C2'),
      ('CINZA',       'beb6fa6a-eca8-4b9e-b861-b4a12c2c0020'::uuid, 'Cinza', '#808080'),
      ('GRAFITE',     'cb83a06e-25b0-4060-9668-e7835e141af3'::uuid, 'Cinza Grafite', '#2F2F2F'),
      ('DOURADO',     'a276ea9b-73ad-44e4-b6e3-14ee820ba89d'::uuid, 'Dourado Brilhante', '#FFD700'),
      ('PRATA',       'b4feaacd-2442-4597-bf55-c9c36ea61756'::uuid, 'Prata', '#C0C0C0'),
      ('MARROM',      'ba704fdf-2bec-4d03-b02e-37a36417bf99'::uuid, 'Marrom Conhaque', '#795548'),
      ('NATURAL',     '0ee9d87f-9a1f-4d8f-b54a-a66ea06bab86'::uuid, 'Natural', '#BB8B64'),
      ('BAMBU',       '73c0af09-efb9-4fea-9cdb-cbaff0ee2626'::uuid, 'Bambu', '#D4B87A'),
      ('MADEIRA',     'fb0f72cb-e35d-45bb-9766-19fac825253b'::uuid, 'Madeira', '#8B5E3C'),
      ('TRANSPARENTE','779c443f-0367-4b67-8774-687f7673cfb4'::uuid, 'Transparente', '#d8d8d8'),
      ('LARANJA',     'ae8d181a-1bea-4a75-8fa1-26abb4078420'::uuid, 'Laranja', '#FF9800'),
      ('ROXO',        '56dd484f-b17f-47d2-a8ae-f6612069227d'::uuid, 'Roxo Púrpura', '#800080'),
      ('VINHO',       '1a88e747-d496-4614-96e2-19f800c0f922'::uuid, 'Vermelho Bordô', '#800020')
  ),
  name_resolved AS (
    SELECT DISTINCT ON (pv.id) pv.id AS variant_id, km.cv_id, km.cv_name, km.cv_hex
    FROM product_variants pv
    JOIN products p ON p.id = pv.product_id
    JOIN supplier_products_raw spr
      ON spr.supplier_id = p.supplier_id
      AND spr.supplier_sku = RTRIM(p.supplier_reference, 'P')
    JOIN kw_map km ON spr.raw_data->>'nome' ILIKE '%' || km.keyword || '%'
    WHERE p.supplier_id = v_supplier_id AND pv.color_id IS NULL AND pv.is_active = true
    ORDER BY pv.id
  )
  UPDATE product_variants pv
  SET color_id = nr.cv_id, color_name = nr.cv_name, color_hex = nr.cv_hex, updated_at = now()
  FROM name_resolved nr WHERE pv.id = nr.variant_id AND pv.color_id IS NULL;
  GET DIAGNOSTICS v_updated_name = ROW_COUNT;

  SELECT COUNT(*) INTO v_total_after
  FROM product_variants pv
  JOIN products p ON p.id = pv.product_id
  WHERE p.supplier_id = v_supplier_id AND pv.color_id IS NULL AND pv.is_active = true;

  RETURN jsonb_build_object(
    'status','ok','supplier','ASIA',
    'antes', v_total_before, 'depois', v_total_after,
    'resolvidos_bronze', v_updated_bronze,
    'resolvidos_nome', v_updated_name,
    'restam_sem_cor', v_total_after
  );
END;
$function$
