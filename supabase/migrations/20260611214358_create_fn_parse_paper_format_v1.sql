
-- ═══════════════════════════════════════════════════════════════════
-- fn_parse_paper_format — Extrai o código de formato (A5, B5, etc.)
-- de tags, nome, combined_sizes ou descrição
--
-- Estratégia em prioridade:
-- 1. tags: "Tamanho A5" → A5 (mais confiável — campo estruturado SPOT)
-- 2. Nome: "AGENDA A5" → A5
-- 3. Descrição: "caderneta A5" → A5
-- 4. combined_sizes: "148 x 210 mm" → A5 (por dimensão ±8mm)
-- ═══════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.fn_parse_paper_format(
  p_tags          jsonb,
  p_name          text,
  p_description   text,
  p_combined_sizes text
)
RETURNS text   -- retorna o code da tabela paper_formats ou NULL
LANGUAGE plpgsql IMMUTABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_tags_text text := lower(coalesce(p_tags::text,''));
  v_name      text := upper(coalesce(p_name,''));
  v_desc      text := lower(coalesce(p_description,''));
  v_sizes     text := lower(coalesce(p_combined_sizes,''));
  -- Extrai primeiras dimensões (antes do '|') e em mm
  v_dim       text;
  v_w_mm      numeric;
  v_h_mm      numeric;
  v_nums      text[];
BEGIN
  -- ── Prioridade 1: tags estruturadas SPOT ─────────────────────
  IF v_tags_text ILIKE '%tamanho a3%' THEN RETURN 'A3'; END IF;
  IF v_tags_text ILIKE '%tamanho a4%' THEN RETURN 'A4'; END IF;
  IF v_tags_text ILIKE '%tamanho b5%' THEN RETURN 'B5'; END IF;
  IF v_tags_text ILIKE '%tamanho a5%' THEN RETURN 'A5'; END IF;
  IF v_tags_text ILIKE '%tamanho a6%' THEN RETURN 'A6'; END IF;
  IF v_tags_text ILIKE '%tamanho a7%' THEN RETURN 'A7'; END IF;

  -- ── Prioridade 2: nome do produto (em maiúsculas) ─────────────
  -- B5 antes de A5 para evitar matches errados
  IF v_name ~ '\mA3\M' THEN RETURN 'A3'; END IF;
  IF v_name ~ '\mA4\M' THEN RETURN 'A4'; END IF;
  IF v_name ~ '\mB5\M' THEN RETURN 'B5'; END IF;
  IF v_name ~ '\mA5\M' THEN RETURN 'A5'; END IF;
  IF v_name ~ '\mA6\M' THEN RETURN 'A6'; END IF;
  IF v_name ~ '\mA7\M' THEN RETURN 'A7'; END IF;

  -- ── Prioridade 3: descrição ───────────────────────────────────
  IF v_desc ~ '\ma3\M' THEN RETURN 'A3'; END IF;
  IF v_desc ~ '\ma4\M' THEN RETURN 'A4'; END IF;
  IF v_desc ~ '\mb5\M' THEN RETURN 'B5'; END IF;
  IF v_desc ~ '\ma5\M' THEN RETURN 'A5'; END IF;
  IF v_desc ~ '\ma6\M' THEN RETURN 'A6'; END IF;
  IF v_desc ~ '\ma7\M' THEN RETURN 'A7'; END IF;

  -- ── Prioridade 4: combined_sizes por dimensão (±8mm tolerância)
  -- Pegar apenas a primeira parte (antes de '|') e extrair números
  v_dim := split_part(v_sizes, '|', 1);
  v_dim := regexp_replace(v_dim, '[^0-9\s,\.]', ' ', 'g');
  -- Extrair os dois primeiros números
  SELECT array_agg(m) INTO v_nums
  FROM regexp_matches(v_dim, '(\d+(?:[,.]\d+)?)', 'g') AS t(m);

  IF array_length(v_nums, 1) >= 2 THEN
    -- Converter para mm (se vierem em cm, ≥20 provável mm para cadernos)
    v_w_mm := replace(v_nums[1], ',', '.')::numeric;
    v_h_mm := replace(v_nums[2], ',', '.')::numeric;
    -- Se os valores parecem estar em cm (ex: "14.8 x 21"), converter para mm
    IF v_w_mm < 50 THEN v_w_mm := v_w_mm * 10; END IF;
    IF v_h_mm < 50 THEN v_h_mm := v_h_mm * 10; END IF;
    -- Normalizar: sempre width <= height (portrait)
    IF v_w_mm > v_h_mm THEN
      DECLARE tmp numeric; BEGIN tmp := v_w_mm; v_w_mm := v_h_mm; v_h_mm := tmp; END;
    END IF;
    -- Comparar com dimensões padrão (tolerância ±8mm)
    IF abs(v_w_mm - 297) <= 8 AND abs(v_h_mm - 420) <= 8 THEN RETURN 'A3'; END IF;
    IF abs(v_w_mm - 210) <= 8 AND abs(v_h_mm - 297) <= 8 THEN RETURN 'A4'; END IF;
    IF abs(v_w_mm - 176) <= 8 AND abs(v_h_mm - 250) <= 8 THEN RETURN 'B5'; END IF;
    IF abs(v_w_mm - 148) <= 8 AND abs(v_h_mm - 210) <= 8 THEN RETURN 'A5'; END IF;
    IF abs(v_w_mm - 105) <= 8 AND abs(v_h_mm - 148) <= 8 THEN RETURN 'A6'; END IF;
    IF abs(v_w_mm - 74)  <= 8 AND abs(v_h_mm - 105) <= 8 THEN RETURN 'A7'; END IF;
  END IF;

  RETURN NULL;  -- não determinado
END;
$$;

COMMENT ON FUNCTION public.fn_parse_paper_format IS
  'Extrai código de formato de papel (A3-A7, B5) de múltiplas fontes. Retorna NULL se não determinado.';
;
