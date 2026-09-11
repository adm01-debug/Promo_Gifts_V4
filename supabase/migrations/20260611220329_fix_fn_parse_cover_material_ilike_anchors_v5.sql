
-- FIX: Remover $ de ILIKE (não é âncora em ILIKE!) + PU detection melhorada
CREATE OR REPLACE FUNCTION public.fn_parse_cover_material_code(
  p_materials jsonb, p_name text, p_description text
) RETURNS text LANGUAGE plpgsql IMMUTABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_mat_lower text;
  v_pname     text := lower(coalesce(p_name,''));
  v_desc      text := lower(coalesce(p_description,''));
BEGIN
  -- ── PRIORIDADE 1: materials jsonb (array de strings) ─────────
  IF p_materials IS NOT NULL
     AND jsonb_typeof(p_materials) = 'array'
     AND jsonb_array_length(p_materials) > 0
  THEN
    FOR v_mat_lower IN
      SELECT lower(elem) FROM jsonb_array_elements_text(p_materials) AS t(elem)
    LOOP
      IF v_mat_lower IS NULL OR v_mat_lower = '' THEN CONTINUE; END IF;
      IF v_mat_lower ILIKE '%pele reciclada%' OR v_mat_lower ILIKE '%couro reciclado%' THEN RETURN 'RECYCLED_LEATHER'; END IF;
      IF v_mat_lower ILIKE '%pu à base de água%' OR v_mat_lower ILIKE '%pu a base de agua%' THEN RETURN 'PU_WATER'; END IF;
      IF v_mat_lower ILIKE '%couro legítimo%' OR v_mat_lower ILIKE '%couro natural%' THEN RETURN 'GENUINE_LEATHER'; END IF;
      IF v_mat_lower ILIKE '%couro sintético%' OR v_mat_lower ILIKE '%courvin%' THEN RETURN 'SYNTHETIC_LEATHER'; END IF;
      IF v_mat_lower ILIKE '%polipele%' THEN RETURN 'POLYLEATHER'; END IF;
      -- PU: exato ou dentro de texto (não derivado de "superior", "output", etc.)
      IF v_mat_lower ~ '(?i)\bpu\b' THEN RETURN 'PU'; END IF;
      IF v_mat_lower ILIKE '%rpet%' OR v_mat_lower ILIKE '%pet reciclado%' THEN RETURN 'RPET'; END IF;
      IF v_mat_lower ILIKE '%cortiça%' OR v_mat_lower ILIKE '%cork%' THEN RETURN 'CORK'; END IF;
      IF v_mat_lower ILIKE '%bambu%' OR v_mat_lower ILIKE '%bamboo%' THEN RETURN 'BAMBOO'; END IF;
      IF v_mat_lower ILIKE '%percalux%' THEN RETURN 'PERCALUX'; END IF;
      IF v_mat_lower = 'borracha' OR v_mat_lower ILIKE 'emborrachad%' THEN RETURN 'RUBBER'; END IF;
      IF v_mat_lower ILIKE '%linho%' OR v_mat_lower ILIKE '%linen%' THEN RETURN 'LINEN'; END IF;
      IF v_mat_lower ILIKE '%tecido%' OR v_mat_lower ILIKE '%poliéster%' OR v_mat_lower ILIKE '%algodão%' THEN RETURN 'FABRIC'; END IF;
      IF v_mat_lower ILIKE '%kraft%' THEN RETURN 'KRAFT'; END IF;
      IF v_mat_lower ILIKE '%couchê%' OR v_mat_lower ILIKE '%couche%' THEN RETURN 'COUCHE'; END IF;
      IF v_mat_lower ILIKE '%plástico%' OR v_mat_lower ILIKE '%plastic%' THEN RETURN 'PLASTIC'; END IF;
      IF v_mat_lower ILIKE '%papel%' OR v_mat_lower ILIKE '%cartão%' OR v_mat_lower ILIKE '%cardboard%' THEN RETURN 'CARDBOARD'; END IF;
    END LOOP;
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
  -- PU: regex word boundary para evitar falsos (superior, compute, etc.)
  IF v_pname ~ '(?i)\bpu\b' OR v_pname ILIKE '% em pu' OR v_pname ILIKE '%caderneta pu%' THEN RETURN 'PU'; END IF;
  IF v_pname ILIKE '%kraft%' THEN RETURN 'KRAFT'; END IF;

  -- ── PRIORIDADE 3: Descrição com contexto de capa ─────────────
  IF v_desc ILIKE '%capa%couro sintético%' OR v_desc ILIKE '%couro sintético%capa%' THEN RETURN 'SYNTHETIC_LEATHER'; END IF;
  IF v_desc ILIKE '%capa%em pu%' OR v_desc ILIKE '%em pu%capa%' THEN RETURN 'PU'; END IF;
  IF v_desc ILIKE '%capa%cortiça%' THEN RETURN 'CORK'; END IF;
  IF v_desc ILIKE '%capa%bambu%' THEN RETURN 'BAMBOO'; END IF;
  IF v_desc ILIKE '%capa%rpet%' THEN RETURN 'RPET'; END IF;
  IF v_desc ILIKE '%capa%percalux%' THEN RETURN 'PERCALUX'; END IF;
  IF v_desc ILIKE '%capa%borracha%'
     AND v_desc NOT ILIKE '%borracha na ponta%'
     AND v_desc NOT ILIKE '%lápis%borracha%' THEN RETURN 'RUBBER'; END IF;
  IF v_desc ILIKE '%capa%linho%' THEN RETURN 'LINEN'; END IF;
  IF v_desc ILIKE '%capa%kraft%' THEN RETURN 'KRAFT'; END IF;
  IF v_desc ILIKE '%capa%plástico%' THEN RETURN 'PLASTIC'; END IF;
  IF v_desc ILIKE '%capa%papel%' OR v_desc ILIKE '%capa%cartão%' OR v_desc ILIKE '%cartonada%' THEN RETURN 'CARDBOARD'; END IF;

  RETURN NULL;
END;
$$;
;
