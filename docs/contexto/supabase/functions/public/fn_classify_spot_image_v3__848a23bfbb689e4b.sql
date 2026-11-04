CREATE OR REPLACE FUNCTION public.fn_classify_spot_image_v3(p_filename text, p_main_image text DEFAULT NULL::text)
 RETURNS TABLE(image_type text, color_code text, is_primary boolean, display_order integer, is_color_specific boolean, spot_ref text, image_type_id uuid)
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$
DECLARE
  v_base TEXT;
  v_ext TEXT;
  v_is_primary BOOLEAN;
  v_parts TEXT[];
  v_ref TEXT;
  v_cor TEXT;
  v_suffix TEXT;
  v_suffix_lower TEXT;
  v_suffix_parts TEXT[];
  v_angle TEXT;
  v_order_map JSONB := '{"a":10,"b":11,"c":12,"d":13,"e":14,"f":15,"g":16}'::jsonb;
  v_letter TEXT;
  -- UUIDs
  UUID_MAIN     UUID := '7ea182ff-edcc-4c4c-b7a1-443b07500f6c';
  UUID_GALLERY  UUID := '1590e144-e3f8-41e6-98f9-f4a25bae496d';
  UUID_SET      UUID := 'c305d8b3-9af8-469e-aea5-88208def353f';
  UUID_LOGO     UUID := '2d5aca72-6eb9-4b16-906d-8e0f91c9bf40';
  UUID_AMBIENT  UUID := 'e8bf8d1f-b6f5-47c1-953b-616d354318a6';
  UUID_VP       UUID := '03426962-2d59-483a-a157-3f6a4a5c6a77';
  UUID_VA       UUID := '57780389-64ce-4945-b7ca-ed22ef73caa9';
  UUID_BOX      UUID := 'f980378d-3ac5-4525-8941-52715f3e320f';
  UUID_POUCH    UUID := '9da408a0-21bd-4b45-b7f5-4ad5f29822da';
  UUID_BAG      UUID := '196e69a9-6962-4494-8919-ee1d2737e6e7';
BEGIN
  -- Preparar
  v_base := regexp_replace(p_filename, '\.[^.]+$', '');
  v_ext  := lower(regexp_replace(p_filename, '.*\.', ''));
  v_is_primary := (p_filename = p_main_image);

  -- ══════════════════════════════════════════════
  -- GRUPO A: Padrões genéricos (sem cor numérica)
  -- ══════════════════════════════════════════════

  -- A1: REF_set.jpg (1.163 ocorrências)
  IF v_base ~ '^\d+_set$' THEN
    v_ref := regexp_replace(v_base, '_set$', '');
    RETURN QUERY SELECT 'set'::TEXT, NULL::TEXT, v_is_primary, 5, FALSE, v_ref, UUID_SET;
    RETURN;
  END IF;

  -- A2: REF_amb.jpg (526 ocorrências)
  IF v_base ~ '^\d+_amb$' THEN
    v_ref := regexp_replace(v_base, '_amb$', '');
    RETURN QUERY SELECT 'ambient'::TEXT, NULL::TEXT, v_is_primary, 6, FALSE, v_ref, UUID_AMBIENT;
    RETURN;
  END IF;

  -- A3: REF_box.jpg (148 ocorrências)
  IF v_base ~ '^\d+_box$' THEN
    v_ref := regexp_replace(v_base, '_box$', '');
    RETURN QUERY SELECT 'box'::TEXT, NULL::TEXT, v_is_primary, 40, FALSE, v_ref, UUID_BOX;
    RETURN;
  END IF;

  -- A4: REF_pouch.jpg (14 ocorrências)
  IF v_base ~ '^\d+_pouch$' THEN
    v_ref := regexp_replace(v_base, '_pouch$', '');
    RETURN QUERY SELECT 'pouch'::TEXT, NULL::TEXT, v_is_primary, 41, FALSE, v_ref, UUID_POUCH;
    RETURN;
  END IF;

  -- A5: REF_logo.jpg (1 ocorrência)
  IF v_base ~ '^\d+_logo$' THEN
    v_ref := regexp_replace(v_base, '_logo$', '');
    RETURN QUERY SELECT 'logo'::TEXT, NULL::TEXT, v_is_primary, 30, FALSE, v_ref, UUID_LOGO;
    RETURN;
  END IF;

  -- A6: REF.jpg (só referência - 10 ocorrências)
  IF v_base ~ '^\d+$' THEN
    RETURN QUERY SELECT 'gallery'::TEXT, NULL::TEXT, v_is_primary, 20, FALSE, v_base, UUID_GALLERY;
    RETURN;
  END IF;

  -- A7: REF_LETRA.jpg (42058_a.jpg - 102 ocorrências)
  IF v_base ~ '^\d+_[a-zA-Z]$' THEN
    v_ref := split_part(v_base, '_', 1);
    v_letter := lower(split_part(v_base, '_', 2));
    RETURN QUERY SELECT 'gallery'::TEXT, NULL::TEXT, v_is_primary,
      COALESCE((v_order_map->>v_letter)::int, 20), FALSE, v_ref, UUID_GALLERY;
    RETURN;
  END IF;

  -- ══════════════════════════════════════════════
  -- GRUPO B: REF_COR com sufixo
  -- ══════════════════════════════════════════════

  -- B0: REF_COR_SUFIXO com underscore (28040_119_logo.jpg)
  IF v_base ~ '^\d+_\d+_.+$' THEN
    v_parts := regexp_match(v_base, '^(\d+)_(\d+)_(.+)$');
    v_ref := v_parts[1];
    v_cor := v_parts[2];

    -- Terceiro segmento numérico = multi-ref
    IF v_parts[3] ~ '^\d+$' THEN
      RETURN QUERY SELECT 'gallery'::TEXT, v_parts[3], v_is_primary, 20, TRUE, v_ref, UUID_GALLERY;
      RETURN;
    END IF;

    -- Sufixo com underscore → normalizar
    v_suffix := '-' || v_parts[3];
    -- Fall through para classificação de sufixo
  END IF;

  -- B1: REF_COR.jpg ou REF_COR-SUFIXO.jpg
  IF v_suffix IS NULL AND v_base ~ '^\d+_\d+(-.*)?$' THEN
    v_parts := regexp_match(v_base, '^(\d+)_(\d+)(-.*)?$');
    v_ref := v_parts[1];
    v_cor := v_parts[2];
    v_suffix := COALESCE(v_parts[3], '');
  END IF;

  -- Classificar sufixo se temos ref + cor
  IF v_ref IS NOT NULL AND v_cor IS NOT NULL THEN
    -- Sem sufixo = imagem principal da cor
    IF v_suffix IS NULL OR v_suffix = '' THEN
      RETURN QUERY SELECT 'main'::TEXT, v_cor, v_is_primary, 1, TRUE, v_ref, UUID_MAIN;
      RETURN;
    END IF;

    v_suffix_lower := lower(ltrim(v_suffix, '-'));
    v_suffix_parts := string_to_array(v_suffix_lower, '-');

    -- PACKAGING (prioridade máxima)
    IF 'box' = ANY(v_suffix_parts) THEN
      IF 'logo' = ANY(v_suffix_parts) THEN
        RETURN QUERY SELECT 'box'::TEXT, v_cor, v_is_primary, 43, TRUE, v_ref, UUID_BOX;
      ELSE
        RETURN QUERY SELECT 'box'::TEXT, v_cor, v_is_primary, 40, TRUE, v_ref, UUID_BOX;
      END IF;
      RETURN;
    END IF;

    IF 'pouch' = ANY(v_suffix_parts) THEN
      IF 'logo' = ANY(v_suffix_parts) THEN
        RETURN QUERY SELECT 'pouch'::TEXT, v_cor, v_is_primary, 44, TRUE, v_ref, UUID_POUCH;
      ELSE
        RETURN QUERY SELECT 'pouch'::TEXT, v_cor, v_is_primary, 41, TRUE, v_ref, UUID_POUCH;
      END IF;
      RETURN;
    END IF;

    IF 'bag' = ANY(v_suffix_parts) THEN
      IF 'logo' = ANY(v_suffix_parts) THEN
        RETURN QUERY SELECT 'bag'::TEXT, v_cor, v_is_primary, 45, TRUE, v_ref, UUID_BAG;
      ELSE
        RETURN QUERY SELECT 'bag'::TEXT, v_cor, v_is_primary, 42, TRUE, v_ref, UUID_BAG;
      END IF;
      RETURN;
    END IF;

    -- LOGO
    IF 'logo' = ANY(v_suffix_parts) THEN
      v_angle := NULL;
      FOR i IN 1..array_length(v_suffix_parts, 1) LOOP
        IF v_suffix_parts[i] ~ '^[a-g]$' THEN
          v_angle := v_suffix_parts[i];
          EXIT;
        END IF;
      END LOOP;
      RETURN QUERY SELECT 'logo'::TEXT, v_cor, v_is_primary,
        30 + COALESCE((v_order_map->>v_angle)::int, 0), TRUE, v_ref, UUID_LOGO;
      RETURN;
    END IF;

    -- SET cor-específico
    IF 'set' = ANY(v_suffix_parts) THEN
      RETURN QUERY SELECT 'set'::TEXT, v_cor, v_is_primary, 5, TRUE, v_ref, UUID_SET;
      RETURN;
    END IF;

    -- AMBIENTE
    IF 'amb' = ANY(v_suffix_parts) THEN
      RETURN QUERY SELECT 'ambient'::TEXT, v_cor, v_is_primary, 25, TRUE, v_ref, UUID_AMBIENT;
      RETURN;
    END IF;

    -- VITRINE
    IF 'vp' = ANY(v_suffix_parts) THEN
      RETURN QUERY SELECT 'vitrine_pessoa'::TEXT, v_cor, v_is_primary, 12, TRUE, v_ref, UUID_VP;
      RETURN;
    END IF;
    IF 'va' = ANY(v_suffix_parts) THEN
      RETURN QUERY SELECT 'vitrine_ambiente'::TEXT, v_cor, v_is_primary, 13, TRUE, v_ref, UUID_VA;
      RETURN;
    END IF;

    -- GALLERY (ângulos simples)
    FOR i IN 1..array_length(v_suffix_parts, 1) LOOP
      IF v_suffix_parts[i] ~ '^[a-g]$' THEN
        RETURN QUERY SELECT 'gallery'::TEXT, v_cor, v_is_primary,
          COALESCE((v_order_map->>v_suffix_parts[i])::int, 20), TRUE, v_ref, UUID_GALLERY;
        RETURN;
      END IF;
    END LOOP;

    -- Fallback: sufixo não reconhecido
    RETURN QUERY SELECT 'gallery'::TEXT, v_cor, v_is_primary, 20, TRUE, v_ref, UUID_GALLERY;
    RETURN;
  END IF;

  -- ══════════════════════════════════════════════
  -- GRUPO C: Multi-referência
  -- ══════════════════════════════════════════════

  IF v_base ~ '^\d+_\d+_\d+' THEN
    v_parts := regexp_match(v_base, '^(\d+)');
    RETURN QUERY SELECT 'gallery'::TEXT, NULL::TEXT, v_is_primary, 20, FALSE,
      COALESCE(v_parts[1], NULL), UUID_GALLERY;
    RETURN;
  END IF;

  -- ══════════════════════════════════════════════
  -- FALLBACK ABSOLUTO — NUNCA CRASH
  -- ══════════════════════════════════════════════

  v_parts := regexp_match(v_base, '^(\d+)');
  RETURN QUERY SELECT 'gallery'::TEXT, NULL::TEXT, v_is_primary, 99, FALSE,
    COALESCE(v_parts[1], NULL), UUID_GALLERY;
  RETURN;
END;
$function$
