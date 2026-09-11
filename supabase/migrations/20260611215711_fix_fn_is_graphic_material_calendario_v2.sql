
-- FIX: Calendário de mesa não é caderno
-- + Ampliar lista de exclusões por nome

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
  v_subtype_lower text := lower(coalesce(p_supplier_subtype,''));
  v_name_lower    text := lower(coalesce(p_name,''));
  v_kw_text       text := lower(array_to_string(coalesce(p_meta_keywords, ARRAY[]::text[]), ' '));
  v_tags_text     text := lower(coalesce(p_tags::text,''));
BEGIN
  -- ── 1. Excluir têxteis ────────────────────────────────────
  IF p_is_textil = true THEN RETURN false; END IF;

  -- ── 2. Excluir subtipos LAPTOP/MOCHILA/PASTA ─────────────
  IF v_subtype_lower ILIKE ANY(ARRAY[
    '%para notebook%','%bolso para notebook%','%notebook e tablet%',
    '%pastas para notebook%','%suporte para notebook%',
    '%para pc%','%p/ notebook%'
  ]) THEN RETURN false; END IF;

  -- ── 3. Excluir nomes claramente não-papelaria ─────────────
  IF v_name_lower ILIKE ANY(ARRAY[
    '%mochila%','%trolley%','%bolsa%',
    '% pasta %','%pasta executiva%','%pasta convenção%','%pasta notebook%',
    '%calendário de mesa%','%calendar de mesa%',
    '%porta-cartão%','%porta cartao%','%porta-caneta%',
    '%squeeze%','%caneca%','%garrafa%','%copo%',
    '%chaveiro%','%camiseta%'
  ]) THEN RETURN false; END IF;

  -- ── 4. Subtipo explícito de papelaria ────────────────────
  IF v_subtype_lower ILIKE ANY(ARRAY[
    '%agenda%','%bloco%','%caderno%','%caderneta%',
    '%planner%','%autoadesivos%','%notas adesivas%',
    '%papelaria%','%diário%','%com pauta%','%com caneta%',
    '%algodao%','%percalux%','%couro%'
  ]) THEN
    IF v_subtype_lower ILIKE '%notebook%' THEN RETURN false; END IF;
    RETURN true;
  END IF;

  -- ── 5. Nome claramente papelaria ─────────────────────────
  IF v_name_lower ILIKE ANY(ARRAY[
    '%caderno%','%caderneta%','%agenda%','%bloco%','%bloco de nota%',
    '%planner%','%diário%','%moleskine%','%sketchbook%'
  ]) THEN RETURN true; END IF;

  -- ── 6. Keywords ──────────────────────────────────────────
  IF v_kw_text ILIKE ANY(ARRAY[
    '%caderno%','%caderneta%','%bloco%','%agenda%','%planner%'
  ]) THEN RETURN true; END IF;

  -- ── 7. Tags — apenas se o NOME também não é de produto não-papelaria
  -- Requer que o nome não seja de produto ambíguo (calendário, etc.)
  IF v_tags_text ILIKE ANY(ARRAY[
    '%caderno%','%caderneta%','%agenda%','%bloco%','%planner%',
    '%folhas pautadas%','%folhas lisas%'
  ]) THEN
    IF v_name_lower ILIKE ANY(ARRAY['%mochila%','%bolsa%','%pasta%','%calendário%','%calendar%']) THEN
      RETURN false;
    END IF;
    RETURN true;
  END IF;
  -- Tags de formato (A4, A5, etc.) SÓ classificam como papelaria
  -- se o NOME também indica papelaria (evita calendários de mesa)
  IF v_tags_text ILIKE ANY(ARRAY[
    '%tamanho a3%','%tamanho a4%','%tamanho b5%','%tamanho a5%','%tamanho a6%','%tamanho a7%'
  ]) THEN
    IF v_name_lower ILIKE ANY(ARRAY[
      '%caderno%','%caderneta%','%agenda%','%bloco%','%planner%','%diário%','%sketchbook%'
    ]) THEN RETURN true; END IF;
    RETURN false;  -- tag de formato sem nome papelaria = não classificar
  END IF;

  RETURN false;
END;
$$;
;
