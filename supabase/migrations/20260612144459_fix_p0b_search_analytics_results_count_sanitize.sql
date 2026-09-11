
-- 1) Sanitizar histórico: resultados > 2000 = lixo do frontend → sentinel -1
UPDATE public.search_analytics
SET results_count = -1
WHERE results_count > 2000;

-- 2) Fix fn_log_search_analytics: sanitizar results_count na entrada
--    Valores > 2000 quase certamente são totais de catálogo, não contagens reais
--    Sentinel -1 indica "valor não confiável / enviado pelo frontend incorretamente"
CREATE OR REPLACE FUNCTION public.fn_log_search_analytics(
  p_search_term text,
  p_results_count integer DEFAULT 0,
  p_search_context text DEFAULT NULL::text,
  p_debounce_seconds integer DEFAULT 2
)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_last_logged timestamptz;
  v_clean_term  text;
  v_safe_count  integer;
BEGIN
  v_clean_term := LOWER(TRIM(LEFT(p_search_term, 200)));

  IF LENGTH(v_clean_term) < 2 THEN
    RETURN false;
  END IF;

  -- Sanitizar results_count:
  --   -1  = sentinel "valor suspeito/não-confiável" (frontend enviou total do catálogo)
  --    0  = zero genuíno (nenhum resultado encontrado)
  --   >0  = contagem real (plausível: entre 1 e 5000)
  v_safe_count := CASE
    WHEN p_results_count IS NULL        THEN 0
    WHEN p_results_count < 0            THEN 0      -- negativos → zero
    WHEN p_results_count > 2000         THEN -1     -- suspeito → sentinel
    ELSE GREATEST(0, p_results_count)
  END;

  -- Debounce: mesmo termo + mesmo usuário na janela de tempo
  SELECT MAX(created_at) INTO v_last_logged
  FROM public.search_analytics sa
  WHERE sa.search_term = v_clean_term
    AND sa.user_id IS NOT DISTINCT FROM auth.uid()
    AND sa.created_at >= NOW() - (p_debounce_seconds || ' seconds')::interval;

  IF v_last_logged IS NOT NULL THEN
    RETURN false;
  END IF;

  INSERT INTO public.search_analytics (
    search_term, results_count, search_context, user_id, created_at
  ) VALUES (
    v_clean_term, v_safe_count, p_search_context, auth.uid(), NOW()
  );

  RETURN true;

EXCEPTION
  WHEN OTHERS THEN
    RETURN false;
END;
$function$;

-- 3) Invalidar cache stale gerado com dados incorretos
DELETE FROM public.ai_insights_cache
WHERE function_name = 'fn_generate_trends_insights';
;
