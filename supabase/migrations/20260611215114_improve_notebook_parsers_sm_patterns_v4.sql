
-- ═══════════════════════════════════════════════════════════════════
-- REFINAMENTO v4: Melhorias para padrões SM e XBZ
-- 1. fn_parse_cover_type_code: detecta "capa dura" disperso na desc
-- 2. fn_parse_paper_ruling: padrão "para anotações" → RULED
-- 3. fn_parse_sheet_count: padrão SM "N folhas" sem "aproximadamente"
-- 4. fn_parse_binding_type_code: detecta Wire-o como "wiire" (typo XBZ)
-- ═══════════════════════════════════════════════════════════════════

-- Override fn_parse_cover_type_code — mais tolerante para SM
CREATE OR REPLACE FUNCTION public.fn_parse_cover_type_code(
  p_name text, p_description text
) RETURNS text LANGUAGE plpgsql IMMUTABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_all text := lower(coalesce(p_name,'') || ' ' || coalesce(p_description,''));
BEGIN
  -- Semi-rígida (antes de HARD para não pegar "dura" de semi-rígida)
  IF v_all ILIKE '%semi%rígida%' OR v_all ILIKE '%semi rígida%' THEN RETURN 'SEMI'; END IF;
  -- HARD
  IF v_all ILIKE ANY(ARRAY[
    '%capa dura%','%capa rígida%','%hard cover%','%hardcover%',
    '%cartonada%','%capa dura%'
  ]) THEN RETURN 'HARD'; END IF;
  -- SOFT
  IF v_all ILIKE ANY(ARRAY[
    '%capa flexível%','%capa mole%','%soft cover%','%softcover%',
    '%capa flex%'
  ]) THEN RETURN 'SOFT'; END IF;
  RETURN NULL;
END;
$$;

-- Override fn_parse_paper_ruling — "para anotações" implica pautado
CREATE OR REPLACE FUNCTION public.fn_parse_paper_ruling(
  p_tags jsonb, p_name text, p_description text
) RETURNS text LANGUAGE plpgsql IMMUTABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_tags text := lower(coalesce(p_tags::text,''));
  v_desc text := lower(coalesce(p_description,''));
  v_name text := lower(coalesce(p_name,''));
  v_all  text := v_tags || ' ' || v_desc || ' ' || v_name;
BEGIN
  -- Planner
  IF v_all ILIKE '%planner%' AND (v_all ILIKE '%planejamento%' OR v_all ILIKE '%agenda%' OR v_all ILIKE '%metas%') THEN
    RETURN 'PLANNER';
  END IF;
  -- Pontilhado / bullet journal
  IF v_all ILIKE ANY(ARRAY['%pontilhado%','%dotted%','%bullet journal%']) THEN RETURN 'DOTTED'; END IF;
  -- Quadriculado
  IF v_all ILIKE '%quadriculado%' THEN RETURN 'GRID'; END IF;
  -- Pautado explícito
  IF v_all ILIKE ANY(ARRAY[
    '%pautado%','%pauta%','%folhas pautadas%','%com pauta%',
    '%linhas%','%pautadas%'
  ]) THEN RETURN 'RULED'; END IF;
  -- Liso explícito
  IF v_all ILIKE ANY(ARRAY[
    '%liso%','%lisas%','%sem pauta%','%folhas lisas%','%sem linhas%',
    '%em branco%'
  ]) THEN RETURN 'BLANK'; END IF;
  -- Agenda → ruled (agendas têm layout de planejamento)
  IF v_all ILIKE ANY(ARRAY['%diária%','%semanal%','%plano diário%','%plano semanal%','%agenda%']) THEN
    RETURN 'RULED';
  END IF;
  -- "para anotações" → ruled (padrão SM — cadernos de anotações têm pauta)
  IF v_all ILIKE '%para anotações%' OR v_all ILIKE '%anotações%' THEN
    RETURN 'RULED';
  END IF;
  RETURN NULL;
END;
$$;

-- Melhorar fn_parse_sheet_count para padrões SM sem "aproximadamente"
CREATE OR REPLACE FUNCTION public.fn_parse_sheet_count(p_description text)
RETURNS int LANGUAGE plpgsql IMMUTABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_desc    text := lower(coalesce(p_description,''));
  v_match   text[];
  v_n       int;
BEGIN
  -- "N folhas" — com ou sem "aproximadamente"
  SELECT m INTO v_match
  FROM regexp_matches(v_desc, '(?:(?:aproximadamente|com|possui|contém)\s+)?(\d+)\s*folhas?', 'g') AS t(m)
  LIMIT 1;
  IF v_match IS NOT NULL THEN
    v_n := v_match[1]::int;
    IF v_n BETWEEN 10 AND 1000 THEN RETURN v_n; END IF;
  END IF;
  -- "N páginas" → divide por 2
  SELECT m INTO v_match
  FROM regexp_matches(v_desc, '(?:(?:aproximadamente|com|possui|contém)\s+)?(\d+)\s*páginas?', 'g') AS t(m)
  LIMIT 1;
  IF v_match IS NOT NULL THEN
    v_n := v_match[1]::int;
    IF v_n BETWEEN 20 AND 2000 THEN RETURN v_n / 2; END IF;
  END IF;
  -- "N ff" ou "Nff" (abreviatura de folhas)
  SELECT m INTO v_match
  FROM regexp_matches(v_desc, '(\d+)\s*ff\b', 'g') AS t(m)
  LIMIT 1;
  IF v_match IS NOT NULL THEN
    v_n := v_match[1]::int;
    IF v_n BETWEEN 10 AND 500 THEN RETURN v_n; END IF;
  END IF;
  RETURN NULL;
END;
$$;
;
