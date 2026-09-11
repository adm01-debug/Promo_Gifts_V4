
-- ═══════════════════════════════════════════════════════════════════
-- FIX v2: Dimensões — bug regexp_matches retornava text[][] não text[]
-- Também corrige: swap landscape, detecção cm vs mm
-- ═══════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.fn_parse_paper_format(
  p_tags          jsonb,
  p_name          text,
  p_description   text,
  p_combined_sizes text
)
RETURNS text LANGUAGE plpgsql IMMUTABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_tags  text := lower(coalesce(p_tags::text,''));
  v_name  text := upper(coalesce(p_name,''));
  v_desc  text := lower(coalesce(p_description,''));
  v_sizes text := lower(coalesce(p_combined_sizes,''));
  v_dim   text;
  v_nums  text[];
  v_w_mm  numeric;
  v_h_mm  numeric;
  v_tmp   numeric;
BEGIN
  -- ── Prioridade 1: tags estruturadas ───────────────────────
  IF v_tags ILIKE '%tamanho a3%' THEN RETURN 'A3'; END IF;
  IF v_tags ILIKE '%tamanho a4%' THEN RETURN 'A4'; END IF;
  IF v_tags ILIKE '%tamanho b5%' THEN RETURN 'B5'; END IF;
  IF v_tags ILIKE '%tamanho a5%' THEN RETURN 'A5'; END IF;
  IF v_tags ILIKE '%tamanho a6%' THEN RETURN 'A6'; END IF;
  IF v_tags ILIKE '%tamanho a7%' THEN RETURN 'A7'; END IF;

  -- ── Prioridade 2: nome (word boundary \m...\M) ────────────
  IF v_name ~ '\mA3\M' THEN RETURN 'A3'; END IF;
  IF v_name ~ '\mA4\M' THEN RETURN 'A4'; END IF;
  IF v_name ~ '\mB5\M' THEN RETURN 'B5'; END IF;
  IF v_name ~ '\mA5\M' THEN RETURN 'A5'; END IF;
  IF v_name ~ '\mA6\M' THEN RETURN 'A6'; END IF;
  IF v_name ~ '\mA7\M' THEN RETURN 'A7'; END IF;

  -- ── Prioridade 3: descrição ───────────────────────────────
  IF v_desc ~ '\ma3\M' THEN RETURN 'A3'; END IF;
  IF v_desc ~ '\ma4\M' THEN RETURN 'A4'; END IF;
  IF v_desc ~ '\mb5\M' THEN RETURN 'B5'; END IF;
  IF v_desc ~ '\ma5\M' THEN RETURN 'A5'; END IF;
  IF v_desc ~ '\ma6\M' THEN RETURN 'A6'; END IF;
  IF v_desc ~ '\ma7\M' THEN RETURN 'A7'; END IF;

  -- ── Prioridade 4: combined_sizes por dimensão ─────────────
  -- Pegar primeira parte (antes de '|')
  v_dim := trim(split_part(v_sizes, '|', 1));
  IF length(v_dim) < 3 THEN RETURN NULL; END IF;

  -- Extrair números usando regexp_matches corretamente (m[1] não m)
  SELECT array_agg(m[1]) INTO v_nums
  FROM regexp_matches(v_dim, '(\d+(?:[,\.]\d+)?)', 'g') AS t(m);

  IF v_nums IS NULL OR array_length(v_nums, 1) < 2 THEN RETURN NULL; END IF;

  -- Converter para numérico (tratar vírgula como separador decimal)
  v_w_mm := replace(v_nums[1], ',', '.')::numeric;
  v_h_mm := replace(v_nums[2], ',', '.')::numeric;

  -- Detectar cm vs mm: valores < 50 são provavelmente cm
  IF v_w_mm < 50 THEN v_w_mm := v_w_mm * 10; END IF;
  IF v_h_mm < 50 THEN v_h_mm := v_h_mm * 10; END IF;

  -- Normalizar para portrait (width ≤ height)
  IF v_w_mm > v_h_mm THEN
    v_tmp  := v_w_mm;
    v_w_mm := v_h_mm;
    v_h_mm := v_tmp;
  END IF;

  -- Comparar com dimensões ISO (tolerância ±8mm)
  IF abs(v_w_mm - 297) <= 8 AND abs(v_h_mm - 420) <= 8 THEN RETURN 'A3'; END IF;
  IF abs(v_w_mm - 210) <= 8 AND abs(v_h_mm - 297) <= 8 THEN RETURN 'A4'; END IF;
  IF abs(v_w_mm - 176) <= 8 AND abs(v_h_mm - 250) <= 8 THEN RETURN 'B5'; END IF;
  IF abs(v_w_mm - 148) <= 8 AND abs(v_h_mm - 210) <= 8 THEN RETURN 'A5'; END IF;
  IF abs(v_w_mm - 105) <= 8 AND abs(v_h_mm - 148) <= 8 THEN RETURN 'A6'; END IF;
  IF abs(v_w_mm - 74)  <= 8 AND abs(v_h_mm - 105) <= 8 THEN RETURN 'A7'; END IF;

  RETURN NULL;
END;
$$;
;
