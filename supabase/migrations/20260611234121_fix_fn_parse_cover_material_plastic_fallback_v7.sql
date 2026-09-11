
-- ═══════════════════════════════════════════════════════════════════
-- v7: Fix definitivo — Plástico/Papel tratados como FALLBACK
-- rPET detectado por padrão composto "Plástico - rPET"
-- Descrição sempre checada ANTES de retornar material genérico
-- ═══════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.fn_parse_cover_material_code(
  p_materials jsonb, p_name text, p_description text
) RETURNS text LANGUAGE plpgsql IMMUTABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_mat_lower   text;
  v_pname       text := lower(coalesce(p_name,''));
  v_desc        text := lower(coalesce(p_description,''));
  v_has_papel   boolean := false;   -- "Papel", "Papelão", "Cartão"
  v_has_plastic boolean := false;   -- "Plástico" genérico
  v_has_rpet    boolean := false;   -- "Plástico - rPET" ou similar
  v_desc_result text;
BEGIN
  -- ── PRIORIDADE 1: materials jsonb ─────────────────────────────
  IF p_materials IS NOT NULL
     AND jsonb_typeof(p_materials) = 'array'
     AND jsonb_array_length(p_materials) > 0
  THEN
    FOR v_mat_lower IN
      SELECT lower(elem) FROM jsonb_array_elements_text(p_materials) AS t(elem)
    LOOP
      IF v_mat_lower IS NULL OR v_mat_lower = '' THEN CONTINUE; END IF;
      -- Específicos — retornar imediatamente
      IF v_mat_lower ILIKE '%pele reciclada%' OR v_mat_lower ILIKE '%couro reciclado%' THEN RETURN 'RECYCLED_LEATHER'; END IF;
      IF v_mat_lower ILIKE '%pu à base de água%' THEN RETURN 'PU_WATER'; END IF;
      IF v_mat_lower ILIKE '%couro legítimo%' OR v_mat_lower ILIKE '%couro natural%' THEN RETURN 'GENUINE_LEATHER'; END IF;
      IF v_mat_lower ILIKE '%couro sintético%' OR v_mat_lower ILIKE '%courvin%' THEN RETURN 'SYNTHETIC_LEATHER'; END IF;
      IF v_mat_lower ILIKE '%polipele%' THEN RETURN 'POLYLEATHER'; END IF;
      IF v_mat_lower ~ '(?i)\bpu\b' AND v_mat_lower NOT ILIKE '%plástico%' THEN RETURN 'PU'; END IF;
      -- rPET: detectar ANTES de retornar PLASTIC genérico
      IF v_mat_lower ILIKE '%rpet%' OR v_mat_lower ILIKE '%r-pet%' OR v_mat_lower ILIKE '%pet reciclado%' THEN
        v_has_rpet := true; CONTINUE;
      END IF;
      IF v_mat_lower ILIKE '%cortiça%' OR v_mat_lower ILIKE '%cork%' THEN RETURN 'CORK'; END IF;
      IF v_mat_lower ILIKE '%bambu%' OR v_mat_lower ILIKE '%bamboo%' THEN RETURN 'BAMBOO'; END IF;
      IF v_mat_lower ILIKE '%percalux%' THEN RETURN 'PERCALUX'; END IF;
      IF v_mat_lower = 'borracha' OR v_mat_lower ILIKE 'emborrachad%' THEN RETURN 'RUBBER'; END IF;
      IF v_mat_lower ILIKE '%linho%' OR v_mat_lower ILIKE '%linen%' THEN RETURN 'LINEN'; END IF;
      -- Tecido/fabric: verificar que não é plástico ecológico
      IF v_mat_lower ILIKE '%tecido%' OR v_mat_lower ILIKE '%poliéster%' OR v_mat_lower ILIKE '%algodão%' OR v_mat_lower ILIKE '%feltro%' THEN RETURN 'FABRIC'; END IF;
      IF v_mat_lower ILIKE '%kraft%' THEN RETURN 'KRAFT'; END IF;
      IF v_mat_lower ILIKE '%couchê%' OR v_mat_lower ILIKE '%couche%' THEN RETURN 'COUCHE'; END IF;
      -- Polipropileno e plásticos específicos (PP, PVC) = PLASTIC direto
      IF v_mat_lower ILIKE '%polipropileno%' OR v_mat_lower ILIKE '%(pp)%' OR v_mat_lower ILIKE '%pvc%' THEN RETURN 'PLASTIC'; END IF;
      -- Papel/Papelão/Cartão = fallback (material interno, não capa específica)
      IF v_mat_lower ILIKE '%papel%' OR v_mat_lower ILIKE '%papelão%' OR v_mat_lower ILIKE '%cartão%' OR v_mat_lower ILIKE '%cardboard%' THEN
        v_has_papel := true; CONTINUE;
      END IF;
      -- Plástico genérico = fallback também (Asia usa "Plástico" para materiais mistos)
      IF v_mat_lower ILIKE '%plástico%' OR v_mat_lower ILIKE '%plastic%' THEN
        v_has_plastic := true; CONTINUE;
      END IF;
    END LOOP;
    -- rPET foi encontrado (sem outro material específico mais prioritário)
    IF v_has_rpet THEN RETURN 'RPET'; END IF;
  END IF;

  -- ── PRIORIDADE 2: Nome do produto ─────────────────────────────
  IF v_pname ILIKE '%couro sintético%' OR v_pname ILIKE '%courvin%' THEN RETURN 'SYNTHETIC_LEATHER'; END IF;
  IF v_pname ILIKE '%cortiça%' THEN RETURN 'CORK'; END IF;
  IF v_pname ILIKE '%bambu%' THEN RETURN 'BAMBOO'; END IF;
  IF v_pname ILIKE '%rpet%' THEN RETURN 'RPET'; END IF;
  IF v_pname ILIKE '%percalux%' THEN RETURN 'PERCALUX'; END IF;
  IF v_pname ILIKE '%emborrachad%' THEN RETURN 'RUBBER'; END IF;
  IF v_pname ILIKE '%linho%' THEN RETURN 'LINEN'; END IF;
  IF v_pname ILIKE '%couchê%' OR v_pname ILIKE '%couche%' THEN RETURN 'COUCHE'; END IF;
  IF v_pname ~ '(?i)\bpu\b' OR v_pname ILIKE '% em pu' OR v_pname ILIKE '%caderneta pu%' THEN RETURN 'PU'; END IF;
  IF v_pname ILIKE '%kraft%' THEN RETURN 'KRAFT'; END IF;
  IF v_pname ILIKE '%feltro%' THEN RETURN 'FABRIC'; END IF;

  -- ── PRIORIDADE 3: Descrição (contexto de capa) — sempre antes dos fallbacks ─
  v_desc_result := NULL;
  IF    v_desc ILIKE '%capa%couro sintético%' OR v_desc ILIKE '%couro sintético%capa%' THEN v_desc_result := 'SYNTHETIC_LEATHER';
  ELSIF v_desc ILIKE '%capa dura em pu%' OR v_desc ILIKE '%capa em pu%' OR v_desc ILIKE '%em pu%capa%' THEN v_desc_result := 'PU';
  ELSIF v_desc ILIKE '%capa%cortiça%' THEN v_desc_result := 'CORK';
  ELSIF v_desc ILIKE '%capa%bambu%' THEN v_desc_result := 'BAMBOO';
  ELSIF v_desc ILIKE '%capa%rpet%' OR v_desc ILIKE '%rpet%capa%' OR v_desc ILIKE '%tecido rpet%' THEN v_desc_result := 'RPET';
  ELSIF v_desc ILIKE '%capa%percalux%' THEN v_desc_result := 'PERCALUX';
  ELSIF v_desc ILIKE '%capa%borracha%' AND v_desc NOT ILIKE '%borracha na ponta%' AND v_desc NOT ILIKE '%lápis%borracha%' THEN v_desc_result := 'RUBBER';
  ELSIF v_desc ILIKE '%capa%linho%' OR v_desc ILIKE '%capa%feltro%' THEN v_desc_result := 'FABRIC';
  ELSIF v_desc ILIKE '%capa%kraft%' THEN v_desc_result := 'KRAFT';
  ELSIF v_desc ILIKE '%capa%plástico%' OR v_desc ILIKE '%capa dura cartonada%' OR v_desc ILIKE '%cartonada%' THEN v_desc_result := 'CARDBOARD';
  ELSIF v_desc ILIKE '%capa%papelão%' OR v_desc ILIKE '%papelão reciclado%' THEN v_desc_result := 'CARDBOARD';
  ELSIF v_desc ILIKE '%couro reciclado%' OR v_desc ILIKE '%pele reciclada%' THEN v_desc_result := 'RECYCLED_LEATHER';
  END IF;
  IF v_desc_result IS NOT NULL THEN RETURN v_desc_result; END IF;

  -- ── FALLBACK 1: Papel/Papelão/Cartão ──────────────────────────
  IF v_has_papel THEN RETURN 'CARDBOARD'; END IF;
  -- ── FALLBACK 2: Plástico genérico ─────────────────────────────
  IF v_has_plastic THEN RETURN 'PLASTIC'; END IF;

  RETURN NULL;
END;
$$;
;
