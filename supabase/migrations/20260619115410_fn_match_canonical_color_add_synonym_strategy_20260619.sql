-- ============================================================================
-- MELHORIA #1: fn_match_canonical_color — nova Estratégia P4.5
-- Tabela de sinônimos universais inline (80+ entradas)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.fn_match_canonical_color(p_name text, p_hex text)
 RETURNS uuid
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$
DECLARE
  v_id uuid;
  v_name_norm text := NULLIF(UPPER(TRIM(p_name)), '');
  v_hex_norm  text := NULLIF(UPPER(TRIM(p_hex)), '');
BEGIN
  IF v_name_norm IS NULL AND v_hex_norm IS NULL THEN
    RETURN NULL;
  END IF;

  -- P1: Match exato por nome em color_variations
  SELECT cv.id INTO v_id
  FROM public.color_variations cv
  WHERE cv.is_active = TRUE AND v_name_norm IS NOT NULL
    AND UPPER(TRIM(cv.name)) = v_name_norm
  ORDER BY cv.sort_order NULLS LAST LIMIT 1;
  IF v_id IS NOT NULL THEN RETURN v_id; END IF;

  -- P2: Match exato por hex em color_variations
  SELECT cv.id INTO v_id
  FROM public.color_variations cv
  WHERE cv.is_active = TRUE AND v_hex_norm IS NOT NULL
    AND UPPER(TRIM(cv.hex_code)) = v_hex_norm
  ORDER BY cv.sort_order NULLS LAST LIMIT 1;
  IF v_id IS NOT NULL THEN RETURN v_id; END IF;

  -- P3: Match via supplier_colors → equivalences (por nome)
  SELECT cv.id INTO v_id
  FROM public.supplier_colors sc
  JOIN public.color_equivalences ce ON ce.supplier_color_id = sc.id AND ce.is_active = TRUE
  JOIN public.color_variations cv ON cv.id = ce.promo_variation_id AND cv.is_active = TRUE
  WHERE sc.is_active = TRUE AND v_name_norm IS NOT NULL
    AND UPPER(TRIM(sc.name)) = v_name_norm
  ORDER BY ce.confidence_score DESC NULLS LAST, cv.sort_order NULLS LAST LIMIT 1;
  IF v_id IS NOT NULL THEN RETURN v_id; END IF;

  -- P4: Match via hex em supplier_colors → equivalences
  SELECT cv.id INTO v_id
  FROM public.supplier_colors sc
  JOIN public.color_equivalences ce ON ce.supplier_color_id = sc.id AND ce.is_active = TRUE
  JOIN public.color_variations cv ON cv.id = ce.promo_variation_id AND cv.is_active = TRUE
  WHERE sc.is_active = TRUE AND v_hex_norm IS NOT NULL
    AND UPPER(TRIM(sc.hex_code)) = v_hex_norm
  ORDER BY ce.confidence_score DESC NULLS LAST, cv.sort_order NULLS LAST LIMIT 1;
  IF v_id IS NOT NULL THEN RETURN v_id; END IF;

  -- P4.5 (NOVO): Tabela de sinônimos universais inline
  IF v_name_norm IS NOT NULL THEN
    SELECT syn.variation_id INTO v_id
    FROM (VALUES
      -- Inglês básico
      ('BLACK',           'aaa46113-20f7-4585-83ab-1ec49cc40fc2'::uuid),
      ('WHITE',           '77ec212c-47f8-4a6f-ba66-1734c286d67b'::uuid),
      ('BLUE',            '34b1361e-f965-4aea-b801-2001246c7d1e'::uuid),
      ('RED',             'b2cca1a8-c4a4-432b-a9ec-8a8470f7fbd4'::uuid),
      ('GREEN',           '3fce0126-a707-494f-b9fb-2502b9528877'::uuid),
      ('YELLOW',          'b31cd63a-54d4-408a-96d1-b2d77f63b2b4'::uuid),
      ('ORANGE',          'ae8d181a-1bea-4a75-8fa1-26abb4078420'::uuid),
      ('GRAY',            'beb6fa6a-eca8-4b9e-b861-b4a12c2c0020'::uuid),
      ('GREY',            'beb6fa6a-eca8-4b9e-b861-b4a12c2c0020'::uuid),
      ('GOLD',            'a276ea9b-73ad-44e4-b6e3-14ee820ba89d'::uuid),
      ('SILVER',          'b4feaacd-2442-4597-bf55-c9c36ea61756'::uuid),
      ('PURPLE',          '50d2419b-61ca-4513-9af1-a73c2a56ec26'::uuid),
      ('BROWN',           '9fbd22ca-afd7-4a7b-8941-84c98e15f165'::uuid),
      ('TRANSPARENT',     '779c443f-0367-4b67-8774-687f7673cfb4'::uuid),
      ('CLEAR',           '779c443f-0367-4b67-8774-687f7673cfb4'::uuid),
      ('NAVY',            '0904add6-5ac9-43e5-a025-10d561e27f2a'::uuid),
      ('NAVY BLUE',       '0904add6-5ac9-43e5-a025-10d561e27f2a'::uuid),
      ('BEIGE',           'd926a706-b2df-43eb-9200-3c3b15d9ee66'::uuid),
      ('BURGUNDY',        '8e9984bf-0139-42ed-aa2a-26eb6a121aed'::uuid),
      ('SALMON',          'f8722914-d6b5-4cf2-b0ac-cea997dbd9da'::uuid),
      ('CORAL',           'f8722914-d6b5-4cf2-b0ac-cea997dbd9da'::uuid),
      ('TEAL',            '06a5ebc6-db21-4427-8446-ad1badd69fa3'::uuid),
      ('AQUA',            '06a5ebc6-db21-4427-8446-ad1badd69fa3'::uuid),
      ('TURQUOISE',       'fc050f73-79fc-4c00-bcee-f4b2cb8e17da'::uuid),
      ('KHAKI',           '17108bfc-9fed-4c71-bb68-ee3db0dfc681'::uuid),
      -- Hífen → sem hífen (resolução específica)
      ('AZUL-MARINHO',    '0904add6-5ac9-43e5-a025-10d561e27f2a'::uuid),
      ('AZUL-ROYAL',      'dd0e1acb-850a-4c0b-87a8-963595ee6508'::uuid),
      ('AZUL-BEBE',       '5c75bd61-b5c9-4c76-a79a-c80b1bfd5db4'::uuid),
      ('ROSA-CHOQUE',     'f43e0654-92ab-4595-992f-5aa06a35f06b'::uuid),
      ('ROSA-BEBE',       '81ab1f0f-6db5-4b5d-9364-a1b8b0c2ad84'::uuid),
      ('ROSA-PINK',       'fb9b536a-bc9c-4089-89d8-d7e3d48a1eb3'::uuid),
      ('ROSA-SALMAO',     'f8722914-d6b5-4cf2-b0ac-cea997dbd9da'::uuid),
      ('VERDE-LIMAO',     '1b0a1cd5-0cb4-49f3-ac4c-1d2f514fa454'::uuid),
      ('VERDE-ESMERALDA', '48148c5e-526e-49d9-a014-61ac6388f53c'::uuid),
      ('VERMELHO-BORDO',  '1a88e747-d496-4614-96e2-19f800c0f922'::uuid),
      ('OFF-WHITE',       '125eeab7-0a7c-49e6-b9e5-73cacc34e330'::uuid),
      -- Sem acento → com acento
      ('VERDE LIMAO',     '1b0a1cd5-0cb4-49f3-ac4c-1d2f514fa454'::uuid),
      ('ROSA BEBE',       '81ab1f0f-6db5-4b5d-9364-a1b8b0c2ad84'::uuid),
      ('ROSA SALMAO',     'f8722914-d6b5-4cf2-b0ac-cea997dbd9da'::uuid),
      ('VERMELHO BORDO',  '1a88e747-d496-4614-96e2-19f800c0f922'::uuid),
      ('ROXO LILAS',      'abc41b40-b938-4e39-bb16-12ee05578535'::uuid),
      ('ROXO PURPURA',    '56dd484f-b17f-47d2-a8ae-f6612069227d'::uuid),
      ('AZUL CEU',        'ba14660b-1055-41da-9105-f8ac1e2b30ff'::uuid),
      ('SALMAO',          'f8722914-d6b5-4cf2-b0ac-cea997dbd9da'::uuid),
      ('AMBAR',           'd7d27bf3-176c-4238-b7a2-77719fe63f59'::uuid),
      ('PETROLEO',        '0904add6-5ac9-43e5-a025-10d561e27f2a'::uuid),
      -- Variações comuns de fornecedores
      ('CAQUI',           '17108bfc-9fed-4c71-bb68-ee3db0dfc681'::uuid),
      ('KAKI',            '17108bfc-9fed-4c71-bb68-ee3db0dfc681'::uuid),
      ('NUDE',            'd926a706-b2df-43eb-9200-3c3b15d9ee66'::uuid),
      ('FUMO',            '35995f65-4e96-42f6-9a05-1e725d3a88f3'::uuid),
      ('TERRACOTA',       '9fbd22ca-afd7-4a7b-8941-84c98e15f165'::uuid),
      ('TERRA',           '9fbd22ca-afd7-4a7b-8941-84c98e15f165'::uuid),
      ('TABACO',          '7c7877fc-c6f3-4b5a-a45e-beacb28c95d2'::uuid),
      ('CONHAQUE',        'ba704fdf-2bec-4d03-b02e-37a36417bf99'::uuid),
      ('CHAMPANHE',       '7d0ba012-33c6-4efb-a55b-ec8a88c883b3'::uuid),
      ('INOX',            'b0342859-437c-439b-a4bf-d323a2b6681e'::uuid),
      ('CROMADO',         '68d8e0a4-fb98-47a4-bfc8-0a112a822bc8'::uuid),
      ('MULTICOLOR',      '2006d7eb-9d4d-4d96-9e0d-fed83c8a5b59'::uuid),
      ('COLORIDO',        '2006d7eb-9d4d-4d96-9e0d-fed83c8a5b59'::uuid),
      ('COLORIDA',        '2006d7eb-9d4d-4d96-9e0d-fed83c8a5b59'::uuid),
      ('NATURAL',         '0ee9d87f-9a1f-4d8f-b54a-a66ea06bab86'::uuid),
      ('KRAFT',           '27eeaf94-4493-4f0e-9878-50100df4ef56'::uuid),
      ('BAMBU',           '73c0af09-efb9-4fea-9cdb-cbaff0ee2626'::uuid),
      ('MADEIRA',         'fb0f72cb-e35d-45bb-9766-19fac825253b'::uuid),
      ('PISTACHE',        '0f3e67b7-4081-4433-81ab-07acc40443ec'::uuid),
      ('CEREJA',          '46c62d48-09df-48bd-8b2a-d0407bcf229c'::uuid),
      ('CARMESIM',        'ff130a29-ca0d-4f31-9b90-dbcb29b22305'::uuid),
      ('ESCARLATE',       'c98f9e38-a2e7-48a2-8260-a8f11c744670'::uuid),
      ('FERRARI',         '7e4cc99c-e5d5-4dd6-a616-201dbb95f84f'::uuid),
      ('MARSALA',         'b5d74a8e-8b6d-4fad-8a0a-b1a13f13c3b7'::uuid),
      ('OXFORD',          '0daf056c-1a6a-4022-8ef2-afe069802688'::uuid),
      ('PISCINA',         '4152c812-a293-48c8-8bd0-d059d26fd123'::uuid),
      ('NEON VERDE',      'd102d6cc-664b-4e6a-828b-df1a469c1e61'::uuid),
      ('NEON ROSA',       '9a8f1d1a-a638-4676-916d-acedc582f51a'::uuid),
      ('FLAMINGO',        '4bd3aec0-9e3c-461f-a19c-a15c6d95af6c'::uuid),
      ('MAGENTA',         'ae3a746c-09a1-44f1-8e69-c345fa0e1c56'::uuid),
      ('CHUMBO',          '885cd2ff-9854-4382-beec-fc5a9e904c34'::uuid),
      ('PRATA FOSCO',     '65f4ed80-89ae-4ec6-9e3a-8513f3d89dd6'::uuid),
      ('FOSCO',           'beb6fa6a-eca8-4b9e-b861-b4a12c2c0020'::uuid)
    ) AS syn(alias, variation_id)
    WHERE syn.alias = v_name_norm
    LIMIT 1;

    IF v_id IS NOT NULL THEN RETURN v_id; END IF;
  END IF;

  -- P5: Match parcial por nome via color_groups (fallback mais amplo)
  SELECT cv.id INTO v_id
  FROM public.color_groups cg
  JOIN public.color_variations cv ON cv.color_group_id = cg.id AND cv.is_active = TRUE
  WHERE cg.is_active = TRUE
    AND v_name_norm IS NOT NULL
    AND v_name_norm LIKE '%' || UPPER(TRIM(cg.name)) || '%'
  ORDER BY
    CASE WHEN UPPER(TRIM(cv.name)) = UPPER(TRIM(cg.name)) THEN 0 ELSE 1 END,
    cv.sort_order NULLS LAST
  LIMIT 1;

  RETURN v_id;
END;
$function$;

NOTIFY pgrst, 'reload schema';
;
