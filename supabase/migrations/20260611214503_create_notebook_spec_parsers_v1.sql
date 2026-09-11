
-- ═══════════════════════════════════════════════════════════════════
-- PARSERS ESPECIALIZADOS — RULING, WEIGHT, COVER, BINDING, PAPER COLOR
-- ═══════════════════════════════════════════════════════════════════

-- ── fn_parse_paper_ruling ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.fn_parse_paper_ruling(
  p_tags jsonb, p_name text, p_description text
) RETURNS text LANGUAGE plpgsql IMMUTABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_tags text := lower(coalesce(p_tags::text,''));
  v_desc text := lower(coalesce(p_description,''));
  v_name text := lower(coalesce(p_name,''));
  v_all  text := v_tags || ' ' || v_desc || ' ' || v_name;
BEGIN
  -- Planner supera "pautado" pois agendas/planners têm layout específico
  IF v_all ILIKE '%planner%' AND (v_all ILIKE '%planejamento%' OR v_all ILIKE '%agenda%') THEN
    RETURN 'PLANNER';
  END IF;
  -- Pontilhado / bullet journal
  IF v_all ILIKE ANY(ARRAY['%pontilhado%','%dotted%','%bullet journal%','%bullet%']) THEN
    RETURN 'DOTTED';
  END IF;
  -- Quadriculado
  IF v_all ILIKE '%quadriculado%' THEN RETURN 'GRID'; END IF;
  -- Pautado (folhas com linhas)
  IF v_all ILIKE ANY(ARRAY[
    '%pautado%','%pauta%','%folhas pautadas%','%com pauta%','%linhas%'
  ]) THEN RETURN 'RULED'; END IF;
  -- Liso / sem pauta
  IF v_all ILIKE ANY(ARRAY[
    '%liso%','%lisas%','%sem pauta%','%folhas lisas%','%sem linhas%',
    '%branco%puro%','%plain%'
  ]) THEN RETURN 'BLANK'; END IF;
  -- Agenda diária/semanal → ruled
  IF v_all ILIKE ANY(ARRAY['%diária%','%semanal%','%plano diário%','%plano semanal%']) THEN
    RETURN 'RULED';
  END IF;
  RETURN NULL;
END;
$$;

-- ── fn_parse_paper_weight ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.fn_parse_paper_weight(p_description text)
RETURNS int LANGUAGE plpgsql IMMUTABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_match text;
  v_gsm   int;
BEGIN
  -- Padrão: "75 g/m²" ou "75g/m²" ou "75 gsm" ou "75g"
  SELECT m[1] INTO v_match
  FROM regexp_matches(
    lower(coalesce(p_description,'')),
    '(\d+)\s*(?:g/m²|g\/m2|gsm|g(?=\b|\s|\/|$))',
    'g'
  ) AS t(m)
  LIMIT 1;
  IF v_match IS NOT NULL THEN
    v_gsm := v_match::int;
    -- Sanity check: gramaturas válidas para papel de caderno (50-250g)
    IF v_gsm BETWEEN 50 AND 250 THEN RETURN v_gsm; END IF;
  END IF;
  RETURN NULL;
END;
$$;

-- ── fn_parse_cover_material_code ──────────────────────────────────
CREATE OR REPLACE FUNCTION public.fn_parse_cover_material_code(
  p_materials jsonb, p_name text, p_description text
) RETURNS text LANGUAGE plpgsql IMMUTABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_mats text := lower(coalesce(p_materials::text, ''));
  v_desc text := lower(coalesce(p_description, '') || ' ' || coalesce(p_name,''));
  v_all  text := v_mats || ' ' || v_desc;
BEGIN
  -- Ordem: mais específico primeiro
  IF v_all ILIKE '%pele reciclada%' OR v_all ILIKE '%couro reciclado%' THEN RETURN 'RECYCLED_LEATHER'; END IF;
  IF v_all ILIKE '%pu à base de água%' OR v_all ILIKE '%pu a base de agua%' THEN RETURN 'PU_WATER'; END IF;
  IF v_all ILIKE '%genuine leather%' OR v_all ILIKE '%couro legítimo%' OR v_all ILIKE '%couro natural%' THEN RETURN 'GENUINE_LEATHER'; END IF;
  IF v_all ILIKE '%couro sintético%' OR v_all ILIKE '%courvin%' OR v_all ILIKE '%couro sintetico%' THEN RETURN 'SYNTHETIC_LEATHER'; END IF;
  IF v_all ILIKE '%polipele%' THEN RETURN 'POLYLEATHER'; END IF;
  -- PU genérico (após os específicos acima)
  IF v_all ILIKE '%\bpu\b%' OR v_all ILIKE '% em pu%' THEN RETURN 'PU'; END IF;
  IF v_all ILIKE '%rpet%' OR v_all ILIKE '%pet reciclado%' OR v_all ILIKE '%r-pet%' THEN RETURN 'RPET'; END IF;
  IF v_all ILIKE '%cortiça%' OR v_all ILIKE '%cork%' THEN RETURN 'CORK'; END IF;
  IF v_all ILIKE '%bambu%' OR v_all ILIKE '%bamboo%' THEN RETURN 'BAMBOO'; END IF;
  IF v_all ILIKE '%percalux%' THEN RETURN 'PERCALUX'; END IF;
  IF v_all ILIKE '%emborrachad%' OR v_all ILIKE '%borracha%' THEN RETURN 'RUBBER'; END IF;
  IF v_all ILIKE '%linho%' OR v_all ILIKE '%linen%' THEN RETURN 'LINEN'; END IF;
  IF v_all ILIKE '%tecido%' OR v_all ILIKE '%poliéster%' OR v_all ILIKE '%polyester%' OR v_all ILIKE '%algodão%' THEN RETURN 'FABRIC'; END IF;
  IF v_all ILIKE '%kraft%' THEN RETURN 'KRAFT'; END IF;
  IF v_all ILIKE '%couchê%' OR v_all ILIKE '%couche%' THEN RETURN 'COUCHE'; END IF;
  IF v_all ILIKE '%plástico%' OR v_all ILIKE '% pp %' OR v_all ILIKE '%pvc%' THEN RETURN 'PLASTIC'; END IF;
  IF v_all ILIKE '%cardboard%' OR v_all ILIKE '%papelão%' OR v_all ILIKE '%cartonada%' OR v_all ILIKE '%cartão%' THEN RETURN 'CARDBOARD'; END IF;
  -- Papel como material de capa (ex: VILAÇA)
  IF v_all ILIKE '%\bpapel\b%' AND v_all NOT ILIKE '%folhas de papel%' THEN RETURN 'CARDBOARD'; END IF;
  RETURN NULL;
END;
$$;

-- ── fn_parse_cover_type_code ──────────────────────────────────────
CREATE OR REPLACE FUNCTION public.fn_parse_cover_type_code(
  p_name text, p_description text
) RETURNS text LANGUAGE plpgsql IMMUTABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_all text := lower(coalesce(p_name,'') || ' ' || coalesce(p_description,''));
BEGIN
  IF v_all ILIKE ANY(ARRAY[
    '%capa dura%','%capa rígida%','%hard cover%','%hardcover%','%cartonada%'
  ]) THEN RETURN 'HARD'; END IF;
  IF v_all ILIKE '%semi%rígida%' OR v_all ILIKE '%semi rígida%' THEN RETURN 'SEMI'; END IF;
  IF v_all ILIKE ANY(ARRAY[
    '%capa flexível%','%capa mole%','%soft cover%','%softcover%','%flexível%'
  ]) THEN RETURN 'SOFT'; END IF;
  RETURN NULL;
END;
$$;

-- ── fn_parse_binding_type_code ────────────────────────────────────
CREATE OR REPLACE FUNCTION public.fn_parse_binding_type_code(
  p_name text, p_description text
) RETURNS text LANGUAGE plpgsql IMMUTABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_all text := lower(coalesce(p_name,'') || ' ' || coalesce(p_description,''));
BEGIN
  IF v_all ILIKE ANY(ARRAY['%wire-o%','%wire o%','%wire_o%','%wiire%']) THEN RETURN 'WIRE_O'; END IF;
  IF v_all ILIKE '%espiral%' OR v_all ILIKE '%spiral%' THEN RETURN 'SPIRAL'; END IF;
  IF v_all ILIKE ANY(ARRAY['%argolas%','%fichário%','%ring bound%']) THEN RETURN 'RING'; END IF;
  IF v_all ILIKE '%costurado%' OR v_all ILIKE '%sewn%' THEN RETURN 'SEWN'; END IF;
  IF v_all ILIKE ANY(ARRAY['%grampo%','%canoa%','%saddle%']) THEN RETURN 'SADDLE'; END IF;
  IF v_all ILIKE '%brochura%' OR v_all ILIKE '%lombada quadrada%' THEN RETURN 'PERFECT'; END IF;
  IF v_all ILIKE '%disco%' OR v_all ILIKE '%disc bound%' THEN RETURN 'DISC'; END IF;
  -- Capa dura sem argolas geralmente é CASE
  IF v_all ILIKE '%capa dura%' AND v_all NOT ILIKE '%espiral%' AND v_all NOT ILIKE '%wire%' THEN
    RETURN 'CASE';
  END IF;
  RETURN NULL;
END;
$$;

-- ── fn_parse_paper_color_code ─────────────────────────────────────
CREATE OR REPLACE FUNCTION public.fn_parse_paper_color_code(
  p_tags jsonb, p_description text
) RETURNS text LANGUAGE plpgsql IMMUTABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_all text := lower(coalesce(p_tags::text,'') || ' ' || coalesce(p_description,''));
BEGIN
  IF v_all ILIKE ANY(ARRAY['%marfim%','%amarelad%','%cor marfim%','%amarelas%','%amber%']) THEN RETURN 'IVORY'; END IF;
  IF v_all ILIKE ANY(ARRAY['%reciclado%','%kraft%','%natural%']) AND v_all ILIKE '%papel%' THEN RETURN 'RECYCLED'; END IF;
  IF v_all ILIKE '%brancas%' OR v_all ILIKE '%folhas brancas%' THEN RETURN 'WHITE'; END IF;
  RETURN NULL;  -- white é o default implícito
END;
$$;

-- ── fn_parse_sheet_count ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.fn_parse_sheet_count(p_description text)
RETURNS int LANGUAGE plpgsql IMMUTABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_desc    text := lower(coalesce(p_description,''));
  v_match   text[];
  v_n       int;
BEGIN
  -- Tentar extrair "N folhas" primeiro (mais preciso)
  SELECT m INTO v_match
  FROM regexp_matches(v_desc, '(?:aproximadamente\s*)?(\d+)\s*folhas?', 'g') AS t(m)
  LIMIT 1;
  IF v_match IS NOT NULL THEN
    v_n := v_match[1]::int;
    IF v_n BETWEEN 10 AND 1000 THEN RETURN v_n; END IF;
  END IF;
  -- Tentar "N páginas" → dividir por 2
  SELECT m INTO v_match
  FROM regexp_matches(v_desc, '(\d+)\s*páginas?', 'g') AS t(m)
  LIMIT 1;
  IF v_match IS NOT NULL THEN
    v_n := v_match[1]::int;
    IF v_n BETWEEN 20 AND 2000 THEN RETURN v_n / 2; END IF;
  END IF;
  RETURN NULL;
END;
$$;

-- ── fn_parse_binding_color_code ───────────────────────────────────
CREATE OR REPLACE FUNCTION public.fn_parse_binding_color_code(
  p_description text
) RETURNS text LANGUAGE plpgsql IMMUTABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_desc text := lower(coalesce(p_description,'')); BEGIN
  IF v_desc ILIKE '%preta%' OR v_desc ILIKE '%preto%' THEN RETURN 'BLACK'; END IF;
  IF v_desc ILIKE '%prata%' OR v_desc ILIKE '%prateado%' OR v_desc ILIKE '%inox%' THEN RETURN 'SILVER'; END IF;
  IF v_desc ILIKE '%dourad%' OR v_desc ILIKE '%gold%' THEN RETURN 'GOLD'; END IF;
  IF v_desc ILIKE '%branca%' OR v_desc ILIKE '%branco%' THEN RETURN 'WHITE'; END IF;
  RETURN NULL;
END;
$$;
;
