
-- ═══════════════════════════════════════════════════════════════════
-- FIX: fn_parse_cover_material_code v2
-- 
-- Bug: "lápis com borracha na ponta" estava matchando RUBBER
-- Fix: Campo materials (jsonb estruturado) tem prioridade ABSOLUTA.
--      Descrição só é usada como fallback se materials = NULL ou [].
-- ═══════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.fn_parse_cover_material_code(
  p_materials jsonb, p_name text, p_description text
) RETURNS text LANGUAGE plpgsql IMMUTABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_mats_arr  text[];
  v_mat_lower text;
  v_desc      text := lower(coalesce(p_description,'') || ' ' || coalesce(p_name,''));
  i           int;
BEGIN
  -- ── PRIORIDADE 1: Campo materials estruturado (jsonb array) ──
  -- Extrair como array de texto e checar cada item
  IF p_materials IS NOT NULL AND jsonb_array_length(p_materials) > 0 THEN
    SELECT array_agg(lower(elem::text ->> 0)) INTO v_mats_arr
    FROM jsonb_array_elements(p_materials) elem;
    -- Se array processing falhar, tentar como texto
    IF v_mats_arr IS NULL THEN
      SELECT array_agg(lower(trim(elem #>> '{}'))) INTO v_mats_arr
      FROM jsonb_array_elements_text(p_materials) elem;
    END IF;
    
    FOR i IN 1..coalesce(array_length(v_mats_arr,1),0) LOOP
      v_mat_lower := v_mats_arr[i];
      IF v_mat_lower IS NULL THEN CONTINUE; END IF;
      
      -- Match exato ou parcial no campo materials (fonte mais confiável)
      IF v_mat_lower ILIKE '%pele reciclada%' OR v_mat_lower ILIKE '%couro reciclado%' THEN RETURN 'RECYCLED_LEATHER'; END IF;
      IF v_mat_lower ILIKE '%pu à base de água%' OR v_mat_lower ILIKE '%pu a base de agua%' THEN RETURN 'PU_WATER'; END IF;
      IF v_mat_lower ILIKE '%genuine leather%' OR v_mat_lower ILIKE '%couro legítimo%' OR v_mat_lower ILIKE '%couro natural%' THEN RETURN 'GENUINE_LEATHER'; END IF;
      IF v_mat_lower ILIKE '%couro sintético%' OR v_mat_lower ILIKE '%courvin%' THEN RETURN 'SYNTHETIC_LEATHER'; END IF;
      IF v_mat_lower ILIKE '%polipele%' THEN RETURN 'POLYLEATHER'; END IF;
      IF v_mat_lower = 'pu' OR v_mat_lower ILIKE '% pu' OR v_mat_lower ILIKE 'pu %' THEN RETURN 'PU'; END IF;
      IF v_mat_lower ILIKE '%rpet%' OR v_mat_lower ILIKE '%pet reciclado%' THEN RETURN 'RPET'; END IF;
      IF v_mat_lower ILIKE '%cortiça%' OR v_mat_lower ILIKE '%cork%' THEN RETURN 'CORK'; END IF;
      IF v_mat_lower ILIKE '%bambu%' OR v_mat_lower ILIKE '%bamboo%' THEN RETURN 'BAMBOO'; END IF;
      IF v_mat_lower ILIKE '%percalux%' THEN RETURN 'PERCALUX'; END IF;
      -- Borracha/emborrachado APENAS quando é o material principal da capa
      -- (não quando é "borracha na ponta do lápis")
      IF (v_mat_lower = 'borracha' OR v_mat_lower ILIKE 'emborrachad%')
         AND v_mat_lower NOT ILIKE '%ponta%' THEN RETURN 'RUBBER'; END IF;
      IF v_mat_lower ILIKE '%linho%' OR v_mat_lower ILIKE '%linen%' THEN RETURN 'LINEN'; END IF;
      IF v_mat_lower ILIKE '%tecido%' OR v_mat_lower ILIKE '%poliéster%' OR v_mat_lower ILIKE '%algodão%' THEN RETURN 'FABRIC'; END IF;
      IF v_mat_lower ILIKE '%kraft%' THEN RETURN 'KRAFT'; END IF;
      IF v_mat_lower ILIKE '%couchê%' OR v_mat_lower ILIKE '%couche%' THEN RETURN 'COUCHE'; END IF;
      IF v_mat_lower ILIKE '%plástico%' OR v_mat_lower ILIKE '%plastic%' THEN RETURN 'PLASTIC'; END IF;
      -- Papel → Cartão (inclui variações)
      IF v_mat_lower ILIKE '%papel%' OR v_mat_lower ILIKE '%cartão%' OR v_mat_lower ILIKE '%cardboard%' THEN RETURN 'CARDBOARD'; END IF;
    END LOOP;
  END IF;

  -- ── PRIORIDADE 2: Nome do produto (mais restrito) ────────────
  -- Só checar no nome se é claramente um material de capa
  IF p_name ILIKE '%couro sintético%' THEN RETURN 'SYNTHETIC_LEATHER'; END IF;
  IF p_name ILIKE '%cortiça%' THEN RETURN 'CORK'; END IF;
  IF p_name ILIKE '%bambu%' THEN RETURN 'BAMBOO'; END IF;
  IF p_name ILIKE '%rpet%' THEN RETURN 'RPET'; END IF;
  IF p_name ILIKE '%percalux%' THEN RETURN 'PERCALUX'; END IF;
  IF p_name ILIKE '%emborrachad%' THEN RETURN 'RUBBER'; END IF;
  IF p_name ILIKE '%linho%' THEN RETURN 'LINEN'; END IF;
  IF p_name ILIKE '%couchê%' OR p_name ILIKE '%couche%' THEN RETURN 'COUCHE'; END IF;
  -- PU no nome da capa: "CADERNETA EM PU", "CADERNETA PU A5"
  IF p_name ILIKE '% em pu%' OR p_name ILIKE '% pu %' OR p_name ILIKE '% pu$' THEN RETURN 'PU'; END IF;

  -- ── PRIORIDADE 3: Descrição (com cuidado — fonte menos confiável)
  -- Só checar expressões que claramente descrevem a CAPA, não o conteúdo
  IF v_desc ILIKE '%capa%couro sintético%' OR v_desc ILIKE '%couro sintético%capa%' THEN RETURN 'SYNTHETIC_LEATHER'; END IF;
  IF v_desc ILIKE '%capa%em pu%' OR v_desc ILIKE '%em pu%capa%' THEN RETURN 'PU'; END IF;
  IF v_desc ILIKE '%capa%cortiça%' THEN RETURN 'CORK'; END IF;
  IF v_desc ILIKE '%capa%bambu%' THEN RETURN 'BAMBOO'; END IF;
  IF v_desc ILIKE '%capa%rpet%' THEN RETURN 'RPET'; END IF;
  IF v_desc ILIKE '%capa%percalux%' THEN RETURN 'PERCALUX'; END IF;
  -- Borracha na descrição APENAS se não há contexto de lápis/borracha de apagar
  IF v_desc ILIKE '%capa%borracha%' AND v_desc NOT ILIKE '%borracha na ponta%' AND v_desc NOT ILIKE '%lápis%borracha%' THEN
    RETURN 'RUBBER';
  END IF;
  IF v_desc ILIKE '%capa%linho%' THEN RETURN 'LINEN'; END IF;
  IF v_desc ILIKE '%capa%kraft%' THEN RETURN 'KRAFT'; END IF;
  IF v_desc ILIKE '%capa%plástico%' THEN RETURN 'PLASTIC'; END IF;
  IF v_desc ILIKE '%capa%papel%' OR v_desc ILIKE '%capa%cartão%' THEN RETURN 'CARDBOARD'; END IF;

  RETURN NULL;
END;
$$;
;
