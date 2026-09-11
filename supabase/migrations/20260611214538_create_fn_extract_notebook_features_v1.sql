
-- ═══════════════════════════════════════════════════════════════════
-- fn_extract_notebook_feature_codes
-- Retorna ARRAY de códigos de feature detectados em tags + descrição
-- Cada elemento inclui o trecho-fonte para auditoria
-- ═══════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.fn_extract_notebook_feature_codes(
  p_tags        jsonb,
  p_description text,
  p_name        text
)
RETURNS text[]   -- array de codes: ex: ARRAY['ELASTIC','BOOKMARK']
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
  -- ELASTIC — elástico para fechar
  IF v_all ILIKE ANY(ARRAY[
    '%elástico%','%elastico%','%faixa elástica%','%tira elástica%',
    '%lacre%','%fecho elástico%','%rubber band%'
  ]) THEN v_result := array_append(v_result, 'ELASTIC'); END IF;

  -- BOOKMARK — marca-página em fita
  IF v_all ILIKE ANY(ARRAY[
    '%marca-página%','%marca página%','%marcador de página%',
    '%marcador em fita%','%fita marcadora%','%ribbon%',
    '%fita de cetim%','%fita cetim%'
  ]) THEN v_result := array_append(v_result, 'BOOKMARK'); END IF;

  -- MULTIPLE_BOOKMARK — quando menciona 2+ marcadores
  IF v_all ILIKE ANY(ARRAY['%marcadores%','%2 fitas%','%duas fitas%','%múltiplos marcadores%']) THEN
    v_result := array_append(v_result, 'MULTIPLE_BOOKMARK');
  END IF;

  -- POCKET — bolso interior ou frontal
  IF v_all ILIKE ANY(ARRAY[
    '%bolso%','%pocket%','%compartimento%','%bolso frontal%',
    '%bolso na contracapa%','%bolso interior%'
  ]) THEN v_result := array_append(v_result, 'POCKET'); END IF;

  -- PEN_LOOP — porta-caneta
  IF v_all ILIKE ANY(ARRAY[
    '%porta-caneta%','%porta caneta%','%suporte para caneta%',
    '%suporte para esferográfica%','%suporte para lapiseira%',
    '%loop caneta%','%pen loop%','%pen holder%','%porta-esferográfica%'
  ]) THEN v_result := array_append(v_result, 'PEN_LOOP'); END IF;

  -- ROUNDED — cantos arredondados
  IF v_all ILIKE ANY(ARRAY[
    '%cantos arredondados%','%rounded corners%','%canto arredondado%'
  ]) THEN v_result := array_append(v_result, 'ROUNDED'); END IF;

  -- PERFORATED — folhas destacáveis
  IF v_all ILIKE ANY(ARRAY[
    '%microperfurado%','%perfurad%','%destacável%','%destaca%',
    '%perforated%','%folhas removíveis%'
  ]) THEN v_result := array_append(v_result, 'PERFORATED'); END IF;

  -- NUMBERED — páginas numeradas
  IF v_all ILIKE ANY(ARRAY[
    '%páginas numeradas%','%numeração%','%numbered%','%paginado%'
  ]) THEN v_result := array_append(v_result, 'NUMBERED'); END IF;

  -- INDEX — índice
  IF v_all ILIKE ANY(ARRAY[
    '%índice%','%indice%','%index%','%sumário%'
  ]) THEN v_result := array_append(v_result, 'INDEX'); END IF;

  -- CALENDAR — calendário
  IF v_all ILIKE ANY(ARRAY[
    '%calendário%','%calendario%','%calendar%','%datas%importantes%'
  ]) THEN v_result := array_append(v_result, 'CALENDAR'); END IF;

  -- MAGNETIC — fecho magnético
  IF v_all ILIKE ANY(ARRAY[
    '%fecho magnético%','%fecho magnetico%','%magnetic%','%imã%',
    '%magnético%','%encerramento magnético%'
  ]) THEN v_result := array_append(v_result, 'MAGNETIC'); END IF;

  -- PEN_INCLUDED — caneta incluída no kit
  IF v_all ILIKE ANY(ARRAY[
    '%(inclusa)%','%caneta inclusa%','%esferográfica inclusa%',
    '%inclui caneta%','%inclui esferográfica%','%caneta incluída%',
    '% com caneta%'
  ]) THEN v_result := array_append(v_result, 'PEN_INCLUDED'); END IF;

  -- PEN_INCLUDED (inclusa sem "caneta" explícito — contexto de agenda com PEN_LOOP)
  -- Apenas se também tem PEN_LOOP (suporte + inclusa = caneta inclusa)
  -- Tratado no nível superior pela combinação

  -- PENCIL_INCLUDED — lápis incluído (ex: VILAÇA 53422)
  IF v_all ILIKE ANY(ARRAY[
    '%lápis%','%lapís%','%lapiseira%','%lapis%',
    '%inclus%lápis%','%inclui lápis%','%pencil%'
  ]) AND v_all NOT ILIKE '%porta-lápis%' THEN
    v_result := array_append(v_result, 'PENCIL_INCLUDED');
  END IF;

  -- RULER — régua inclusa
  IF v_all ILIKE ANY(ARRAY[
    '%régua%','%regua%','%ruler%'
  ]) THEN v_result := array_append(v_result, 'RULER'); END IF;

  -- STICKY_NOTES — bloco de notas adesivas incluído
  IF v_all ILIKE ANY(ARRAY[
    '%bloco adesivo%','%sticky%','%post-it%','%notas adesivas inclus%'
  ]) THEN v_result := array_append(v_result, 'STICKY_NOTES'); END IF;

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION public.fn_extract_notebook_feature_codes IS
  'Extrai array de feature codes de notebooks de tags + descrição. Retorna ARRAY vazio se nenhuma feature detectada.';
;
