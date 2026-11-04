CREATE OR REPLACE FUNCTION public.fn_link_sm_colors_from_title()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_supplier_id uuid := '841cd690-210a-422a-908c-7676828db272';
  v_updated     int  := 0;
  v_total_before int;
  v_total_after  int;
BEGIN
  SELECT COUNT(*) INTO v_total_before
  FROM product_variants pv
  JOIN products p ON p.id = pv.product_id
  WHERE p.supplier_id = v_supplier_id AND pv.color_id IS NULL AND pv.is_active = true;

  -- Mapeamento semântico por título do Bronze
  -- Regras em ordem de prioridade (DISTINCT ON preserva a 1ª)
  WITH titulo_map(pattern, cv_id, cv_name, cv_hex, prioridade) AS (
    VALUES
      -- Materiais específicos (maior prioridade)
      ('%BAMBU%',           '73c0af09-efb9-4fea-9cdb-cbaff0ee2626'::uuid, 'Bambu',           '#D4B87A', 1),
      ('%MADEIRA%',         'fb0f72cb-e35d-45bb-9766-19fac825253b'::uuid, 'Madeira',          '#8B5E3C', 1),
      ('%INOX%',            'b0342859-437c-439b-a4bf-d323a2b6681e'::uuid, 'Prata Inox',       '#B4BDC7', 2),
      ('%KRAFT%',           '27eeaf94-4493-4f0e-9878-50100df4ef56'::uuid, 'Kraft',             '#C4A36D', 2),
      ('%VIDRO%',           '779c443f-0367-4b67-8774-687f7673cfb4'::uuid, 'Transparente',     '#d8d8d8', 2),
      ('%CRISTAL%',         '779c443f-0367-4b67-8774-687f7673cfb4'::uuid, 'Transparente',     '#d8d8d8', 2),
      ('%TRANSPARENTE%',    '779c443f-0367-4b67-8774-687f7673cfb4'::uuid, 'Transparente',     '#d8d8d8', 2),
      -- Cores diretas no título
      ('% PRETO%',          'aaa46113-20f7-4585-83ab-1ec49cc40fc2'::uuid, 'Preto',            '#000000', 3),
      ('% PRETA%',          'aaa46113-20f7-4585-83ab-1ec49cc40fc2'::uuid, 'Preto',            '#000000', 3),
      ('PRETO %',           'aaa46113-20f7-4585-83ab-1ec49cc40fc2'::uuid, 'Preto',            '#000000', 3),
      ('PRETA %',           'aaa46113-20f7-4585-83ab-1ec49cc40fc2'::uuid, 'Preto',            '#000000', 3),
      ('% BRANCO%',         '77ec212c-47f8-4a6f-ba66-1734c286d67b'::uuid, 'Branco',           '#FFFFFF', 3),
      ('% BRANCA%',         '77ec212c-47f8-4a6f-ba66-1734c286d67b'::uuid, 'Branco',           '#FFFFFF', 3),
      ('% AZUL%',           '34b1361e-f965-4aea-b801-2001246c7d1e'::uuid, 'Azul',             '#2196F3', 3),
      ('% VERDE%',          'a366339c-b41d-4c3d-80cb-d8baabdf8f32'::uuid, 'Verde Floresta',   '#228B22', 3),
      ('% VERMELHO%',       'c98f9e38-a2e7-48a2-8260-a8f11c744670'::uuid, 'Vermelho Escarlate','#FF2400', 3),
      ('% AMARELO%',        '7598ef45-35be-4c56-8569-8eeaf3d0bd99'::uuid, 'Amarelo Milho',    '#FBEC5D', 3),
      ('% ROSA%',           '81ab1f0f-6db5-4b5d-9364-a1b8b0c2ad84'::uuid, 'Rosa Bebê',       '#F4C2C2', 3),
      ('% CINZA%',          'beb6fa6a-eca8-4b9e-b861-b4a12c2c0020'::uuid, 'Cinza',            '#9E9E9E', 3),
      ('% DOURADO%',        'a276ea9b-73ad-44e4-b6e3-14ee820ba89d'::uuid, 'Dourado Brilhante','#FFD700', 3),
      ('% DOURADA%',        'a276ea9b-73ad-44e4-b6e3-14ee820ba89d'::uuid, 'Dourado Brilhante','#FFD700', 3),
      ('% NATURAL%',        '0ee9d87f-9a1f-4d8f-b54a-a66ea06bab86'::uuid, 'Natural',          '#BB8B64', 3),
      -- KITs e produtos multi-componente → Colorido (menor prioridade, fallback)
      ('%KIT%',             '2006d7eb-9d4d-4d96-9e0d-fed83c8a5b59'::uuid, 'Colorido',         '#ababab', 10),
      ('%JOGO%',            '2006d7eb-9d4d-4d96-9e0d-fed83c8a5b59'::uuid, 'Colorido',         '#ababab', 10),
      ('%CONJUNTO%',        '2006d7eb-9d4d-4d96-9e0d-fed83c8a5b59'::uuid, 'Colorido',         '#ababab', 10),
      -- Fallback universal
      ('%',                 '2006d7eb-9d4d-4d96-9e0d-fed83c8a5b59'::uuid, 'Colorido',         '#ababab', 99)
  ),
  resolved AS (
    SELECT DISTINCT ON (pv.id)
      pv.id AS variant_id,
      tm.cv_id, tm.cv_name, tm.cv_hex
    FROM product_variants pv
    JOIN products p ON p.id = pv.product_id
    JOIN supplier_products_raw spr
      ON spr.supplier_id = p.supplier_id AND spr.supplier_sku = p.supplier_reference
    JOIN titulo_map tm ON spr.raw_data->>'titulo' ILIKE tm.pattern
    WHERE p.supplier_id = v_supplier_id
      AND pv.color_id IS NULL AND pv.is_active = true
    ORDER BY pv.id, tm.prioridade ASC
  )
  UPDATE product_variants pv
  SET
    color_id   = r.cv_id,
    color_name = r.cv_name,
    color_hex  = r.cv_hex,
    updated_at = now()
  FROM resolved r WHERE pv.id = r.variant_id AND pv.color_id IS NULL;
  GET DIAGNOSTICS v_updated = ROW_COUNT;

  SELECT COUNT(*) INTO v_total_after
  FROM product_variants pv
  JOIN products p ON p.id = pv.product_id
  WHERE p.supplier_id = v_supplier_id AND pv.color_id IS NULL AND pv.is_active = true;

  RETURN jsonb_build_object(
    'status','ok','supplier','SOMARCAS',
    'antes', v_total_before, 'depois', v_total_after,
    'resolvidos', v_updated,
    'restam_sem_cor', v_total_after
  );
END;
$function$
