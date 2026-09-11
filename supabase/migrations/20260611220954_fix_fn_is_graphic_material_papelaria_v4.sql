
-- FIX v4: Remover "papelaria" dos subtipos positivos (inclui estojos e borrachas)
-- Adicionar exclusões de nome para produtos claramente não-notebook

CREATE OR REPLACE FUNCTION public.fn_is_graphic_material(
  p_supplier_subtype      text,
  p_supplier_subtype_code text,
  p_name                  text,
  p_meta_keywords         text[],
  p_tags                  jsonb,
  p_is_textil             boolean
)
RETURNS boolean
LANGUAGE plpgsql IMMUTABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_subtype_lower text := lower(coalesce(p_supplier_subtype,''));
  v_name_lower    text := lower(coalesce(p_name,''));
  v_kw_text       text := lower(array_to_string(coalesce(p_meta_keywords, ARRAY[]::text[]), ' '));
  v_tags_text     text := lower(coalesce(p_tags::text,''));
BEGIN
  -- ── 1. Excluir têxteis ────────────────────────────────────
  IF p_is_textil = true THEN RETURN false; END IF;

  -- ── 2. Excluir subtipos LAPTOP ───────────────────────────
  IF v_subtype_lower ILIKE ANY(ARRAY[
    '%para notebook%','%bolso para notebook%','%notebook e tablet%',
    '%pastas para notebook%','%suporte para notebook%',
    '%para pc%','%p/ notebook%'
  ]) THEN RETURN false; END IF;

  -- ── 3a. POSITIVOS: nome contém produto de papelaria
  -- Verificar ANTES das exclusões para capturar kits como "kit garrafa + caderneta"
  IF v_name_lower ILIKE ANY(ARRAY[
    '%caderno%','%caderneta%','%agenda%','%bloco%','%bloco de nota%',
    '%planner%','%diário%','%moleskine%','%sketchbook%'
  ]) THEN
    -- Excluir apenas nomes claramente de NOT-notebooks mesmo com palavra notebook
    IF v_name_lower ILIKE '%mochila%' THEN RETURN false; END IF;
    RETURN true;
  END IF;

  -- ── 3b. NEGATIVOS por nome: estojos e acessórios não-notebook
  IF v_name_lower ILIKE ANY(ARRAY[
    '%mochila%','%trolley%','%bolsa%',
    '% pasta %','%pasta executiva%','%pasta convenção%',
    '%calendário de mesa%',
    '%porta-cartão%','%porta cartao%',
    '%estojo%','%kit de escrita%','%conjunto%borrachas%',
    '%conjunto%canetas%','%conjunto%esferográfica%'
  ]) THEN RETURN false; END IF;

  -- ── 4. Subtipo explícito de papelaria (REMOVIDO: papelaria)
  IF v_subtype_lower ILIKE ANY(ARRAY[
    '%agenda%','%bloco%','%caderno%','%caderneta%',
    '%planner%','%autoadesivos%','%notas adesivas%',
    '%diário%','%com pauta%','%com caneta%',
    '%algodao%','%percalux%','%couro%'
  ]) THEN
    IF v_subtype_lower ILIKE '%notebook%' THEN RETURN false; END IF;
    RETURN true;
  END IF;

  -- ── 5. Keywords ──────────────────────────────────────────
  IF v_kw_text ILIKE ANY(ARRAY[
    '%caderno%','%caderneta%','%bloco%','%agenda%','%planner%'
  ]) THEN RETURN true; END IF;

  -- ── 6. Tags com palavras-notebook ────────────────────────
  IF v_tags_text ILIKE ANY(ARRAY[
    '%caderno%','%caderneta%','%agenda%','%bloco%','%planner%',
    '%folhas pautadas%','%folhas lisas%'
  ]) THEN RETURN true; END IF;

  -- Tags de formato SÓ classificam se nome é papelaria
  IF v_tags_text ILIKE ANY(ARRAY[
    '%tamanho a3%','%tamanho a4%','%tamanho b5%',
    '%tamanho a5%','%tamanho a6%','%tamanho a7%'
  ]) THEN
    IF v_name_lower ILIKE ANY(ARRAY[
      '%caderno%','%caderneta%','%agenda%','%bloco%','%planner%','%sketchbook%'
    ]) THEN RETURN true; END IF;
    RETURN false;
  END IF;

  RETURN false;
END;
$$;
;
