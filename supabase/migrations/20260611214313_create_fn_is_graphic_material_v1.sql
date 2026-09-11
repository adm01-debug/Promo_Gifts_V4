
-- ═══════════════════════════════════════════════════════════════════
-- fn_is_graphic_material — Classifica se um produto de
-- produtos_padronizacao é material gráfico de papelaria
-- 
-- Cenários testados na simulação:
-- ✅ SPOT "Agendas e Blocos" subtype → true
-- ✅ XBZ "Cadernetas" → true
-- ✅ XBZ "Com Bolso Para Notebook" → FALSE (bolsa de laptop)
-- ✅ Asia "P/ Notebooks" → FALSE (acessório de laptop)
-- ✅ is_textil = true → FALSE
-- ✅ nome contém "MOCHILA" → FALSE
-- ✅ tags contêm "caderno" → true
-- ═══════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.fn_is_graphic_material(
  p_supplier_subtype      text,
  p_supplier_subtype_code text,
  p_name                  text,
  p_meta_keywords         text[],
  p_tags                  jsonb,
  p_is_textil             boolean
)
RETURNS boolean
LANGUAGE plpgsql IMMUTABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_subtype_lower  text := lower(coalesce(p_supplier_subtype,''));
  v_name_lower     text := lower(coalesce(p_name,''));
  v_kw_text        text := lower(array_to_string(coalesce(p_meta_keywords, ARRAY[]::text[]), ' '));
  v_tags_text      text := lower(coalesce(p_tags::text,''));
BEGIN
  -- ── 1. Excluir têxteis (nunca são material gráfico) ────────────
  IF p_is_textil = true THEN RETURN false; END IF;

  -- ── 2. Excluir subtipos que são acessórios de LAPTOP ──────────
  --    "notebook" no subtype = laptop na maioria dos casos
  IF v_subtype_lower ILIKE '%para notebook%'      THEN RETURN false; END IF;
  IF v_subtype_lower ILIKE '%bolso para notebook%' THEN RETURN false; END IF;
  IF v_subtype_lower ILIKE '%notebook e tablet%'   THEN RETURN false; END IF;
  IF v_subtype_lower ILIKE '%pastas para notebook%'THEN RETURN false; END IF;
  IF v_subtype_lower ILIKE '%suporte para notebook%' THEN RETURN false; END IF;
  IF v_subtype_lower ILIKE '%para pc%'             THEN RETURN false; END IF;
  IF v_subtype_lower ILIKE '%p/ notebook%'         THEN RETURN false; END IF;

  -- ── 3. Excluir nomes de produto que são bags/mochilas ─────────
  IF v_name_lower ILIKE '%mochila%' THEN RETURN false; END IF;
  IF v_name_lower ILIKE '%pasta%'   THEN RETURN false; END IF;
  IF v_name_lower ILIKE '%trolley%' THEN RETURN false; END IF;
  IF v_name_lower ILIKE '%bolsa%'   THEN RETURN false; END IF;

  -- ── 4. Subtipo explícito de papelaria → TRUE ──────────────────
  IF v_subtype_lower ILIKE ANY (ARRAY[
    '%agenda%', '%bloco%', '%caderno%', '%caderneta%',
    '%planner%', '%autoadesivos%', '%notas adesivas%',
    '%papelaria%', '%diário%', '%com pauta%', '%com caneta%',
    '%algodao%', '%percalux%', '%couro%'
  ]) THEN
    -- Ainda excluir se subtype é claramente laptop mesmo com couro
    IF v_subtype_lower ILIKE '%notebook%' THEN RETURN false; END IF;
    RETURN true;
  END IF;

  -- ── 5. Nome do produto claramente é papelaria ─────────────────
  IF v_name_lower ILIKE ANY (ARRAY[
    '%caderno%','%caderneta%','%agenda%','%bloco%','%bloco de nota%',
    '%planner%','%diário%','%moleskine%','%sketchbook%'
  ]) THEN RETURN true; END IF;

  -- ── 6. Keywords de metadados ─────────────────────────────────
  IF v_kw_text ILIKE ANY (ARRAY[
    '%caderno%','%caderneta%','%bloco%','%agenda%','%planner%'
  ]) THEN RETURN true; END IF;

  -- ── 7. Tags estruturadas ─────────────────────────────────────
  IF v_tags_text ILIKE ANY (ARRAY[
    '%caderno%','%caderneta%','%agenda%','%bloco%','%planner%',
    '%tamanho a4%','%tamanho a5%','%tamanho a6%','%tamanho a7%',
    '%tamanho b5%','%folhas pautadas%','%folhas lisas%'
  ]) THEN
    -- Dupla verificação: se o nome tem bag/mochila, não é caderno
    IF v_name_lower ILIKE '%mochila%' OR v_name_lower ILIKE '%bolsa%' 
       OR v_name_lower ILIKE '%pasta%' THEN
      RETURN false;
    END IF;
    RETURN true;
  END IF;

  RETURN false;
END;
$$;

COMMENT ON FUNCTION public.fn_is_graphic_material IS 
  'Classifica se um produto é material gráfico (caderno/bloco/agenda) vs. acessório de laptop ou bolsa. Retorna true para material gráfico.';
;
