
-- FIX: Remove padrão %pauta% muito amplo, adiciona exclusão "sem pauta"

CREATE OR REPLACE FUNCTION public.fn_parse_paper_ruling(
  p_tags jsonb, p_name text, p_description text
) RETURNS text LANGUAGE plpgsql IMMUTABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_tags text := lower(coalesce(p_tags::text,''));
  v_desc text := lower(coalesce(p_description,''));
  v_name text := lower(coalesce(p_name,''));
  v_all  text := v_tags || ' ' || v_desc || ' ' || v_name;
BEGIN
  -- ── Prioridade: BLANK antes de RULED para "sem pauta" ────────
  -- (sem pauta / sem linhas são detectados ANTES dos positivos)
  IF v_all ILIKE ANY(ARRAY[
    '%sem pauta%','%sem linhas%','%folhas lisas%','%páginas lisas%',
    '%liso%','%lisas%','%em branco%','%plain%','%without lines%'
  ]) THEN RETURN 'BLANK'; END IF;

  -- PLANNER
  IF v_all ILIKE '%planner%' AND v_all ILIKE ANY(ARRAY['%planejamento%','%agenda%','%metas%','%anual%']) THEN
    RETURN 'PLANNER';
  END IF;
  -- Pontilhado
  IF v_all ILIKE ANY(ARRAY['%pontilhado%','%dotted%','%bullet journal%']) THEN RETURN 'DOTTED'; END IF;
  -- Quadriculado
  IF v_all ILIKE '%quadriculado%' THEN RETURN 'GRID'; END IF;
  -- Pautado — padrões explícitos (evitar "sem pauta")
  IF v_all ILIKE ANY(ARRAY[
    '%pautado%','%folhas pautadas%','%com pauta%','%pautadas%','%papel pautado%',
    '%linhas%','%lines for%','%pages with lines%','%lined%'
  ]) THEN RETURN 'RULED'; END IF;
  -- Agenda/diário implica ruled
  IF v_all ILIKE ANY(ARRAY[
    '%diária%','%semanal%','%plano diário%','%plano semanal%'
  ]) THEN RETURN 'RULED'; END IF;
  -- Para anotações → ruled (padrão SM)
  IF v_all ILIKE '%para anotações%' THEN RETURN 'RULED'; END IF;
  -- Agenda no nome/tags → ruled
  IF v_all ILIKE '%agenda%' AND v_name ILIKE '%agenda%' THEN RETURN 'RULED'; END IF;
  RETURN NULL;
END;
$$;
;
