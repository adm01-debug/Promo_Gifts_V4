
-- FIX v2: 
-- 1. MULTIPLE_BOOKMARK → também seta BOOKMARK
-- 2. Autoadesivo → STICKY_NOTES
-- 3. (incluída) → PEN_INCLUDED (além de inclusa)
-- 4. elastic (inglês) → ELASTIC

CREATE OR REPLACE FUNCTION public.fn_extract_notebook_feature_codes(
  p_tags jsonb, p_description text, p_name text
)
RETURNS text[]
LANGUAGE plpgsql IMMUTABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_all    text := lower(
    coalesce(p_tags::text,'') || ' ' ||
    coalesce(p_description,'') || ' ' ||
    coalesce(p_name,'')
  );
  v_result text[] := ARRAY[]::text[];
BEGIN
  -- ELASTIC
  IF v_all ILIKE ANY(ARRAY[
    '%elástico%','%elastico%','%faixa elástica%','%tira elástica%',
    '%lacre%','%fecho elástico%','%elastic closure%','%elastic band%'
  ]) THEN v_result := array_append(v_result, 'ELASTIC'); END IF;

  -- BOOKMARK
  IF v_all ILIKE ANY(ARRAY[
    '%marca-página%','%marca página%','%marcador de página%',
    '%marcador em fita%','%fita marcadora%','%ribbon%',
    '%fita de cetim%','%fita cetim%','%bookmark%','%fita marcação%'
  ]) THEN v_result := array_append(v_result, 'BOOKMARK'); END IF;

  -- MULTIPLE_BOOKMARK — quando menciona 2+ marcadores (adiciona BOOKMARK se não está)
  IF v_all ILIKE ANY(ARRAY['%2 fitas%','%duas fitas%','%múltiplos marcadores%','%multiple bookmark%']) THEN
    IF NOT ('BOOKMARK' = ANY(v_result)) THEN
      v_result := array_append(v_result, 'BOOKMARK');
    END IF;
    v_result := array_append(v_result, 'MULTIPLE_BOOKMARK');
  END IF;

  -- POCKET
  IF v_all ILIKE ANY(ARRAY[
    '%bolso%','%pocket%','%compartimento%','%bolso frontal%',
    '%bolso na contracapa%','%bolso interior%'
  ]) THEN v_result := array_append(v_result, 'POCKET'); END IF;

  -- PEN_LOOP
  IF v_all ILIKE ANY(ARRAY[
    '%porta-caneta%','%porta caneta%','%suporte para caneta%',
    '%suporte para esferográfica%','%suporte para lapiseira%',
    '%loop caneta%','%pen loop%','%pen holder%','%porta-esferográfica%'
  ]) THEN v_result := array_append(v_result, 'PEN_LOOP'); END IF;

  -- ROUNDED
  IF v_all ILIKE ANY(ARRAY['%cantos arredondados%','%rounded corners%']) THEN
    v_result := array_append(v_result, 'ROUNDED');
  END IF;

  -- PERFORATED
  IF v_all ILIKE ANY(ARRAY[
    '%microperfurado%','%perfurad%','%destacável%','%destaca%','%perforated%','%folhas removíveis%'
  ]) THEN v_result := array_append(v_result, 'PERFORATED'); END IF;

  -- NUMBERED
  IF v_all ILIKE ANY(ARRAY['%páginas numeradas%','%numeração%','%numbered%','%paginado%']) THEN
    v_result := array_append(v_result, 'NUMBERED');
  END IF;

  -- INDEX
  IF v_all ILIKE ANY(ARRAY['%índice%','%indice%','%index%','%sumário%']) THEN
    v_result := array_append(v_result, 'INDEX');
  END IF;

  -- CALENDAR
  IF v_all ILIKE ANY(ARRAY['%calendário%','%calendario%','%calendar%','%datas%importantes%']) THEN
    v_result := array_append(v_result, 'CALENDAR');
  END IF;

  -- MAGNETIC
  IF v_all ILIKE ANY(ARRAY[
    '%fecho magnético%','%fecho magnetico%','%magnetic%','%imã%','%magnético%'
  ]) THEN v_result := array_append(v_result, 'MAGNETIC'); END IF;

  -- PEN_INCLUDED — caneta explicitamente inclusa
  -- (inclusa) e (incluída) são variações do mesmo
  IF v_all ILIKE ANY(ARRAY[
    '%(inclusa)%','%caneta inclusa%','%esferográfica inclusa%',
    '%inclui caneta%','%inclui esferográfica%','%caneta incluída%',
    '% com caneta%','%(incluída)%','%esferográfica incluída%'
  ]) THEN v_result := array_append(v_result, 'PEN_INCLUDED'); END IF;

  -- PENCIL_INCLUDED — lápis incluído
  IF v_all ILIKE ANY(ARRAY[
    '%inclus%lápis%','%inclui lápis%','%lápis inclus%','%pencil%'
  ]) AND v_all NOT ILIKE '%porta-lápis%' THEN
    v_result := array_append(v_result, 'PENCIL_INCLUDED');
  END IF;

  -- RULER
  IF v_all ILIKE ANY(ARRAY['%régua%','%regua%','%ruler%']) THEN
    v_result := array_append(v_result, 'RULER');
  END IF;

  -- STICKY_NOTES — bloco adesivo ou autoadesivo no produto
  IF v_all ILIKE ANY(ARRAY[
    '%bloco adesivo%','%sticky%','%post-it%','%notas adesivas inclus%',
    '%autoadesivo inclus%','%bloco de notas autoadesivo%'
  ]) THEN v_result := array_append(v_result, 'STICKY_NOTES'); END IF;

  RETURN v_result;
END;
$$;
;
