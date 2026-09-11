
-- Corrigir race condition do debounce com advisory lock atômico
-- pg_try_advisory_xact_lock garante que apenas 1 processo passe por vez para o mesmo (term+user)

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
  v_last_logged  timestamptz;
  v_clean_term   text;
  v_safe_count   integer;
  v_lock_key     bigint;
  v_lock_acquired boolean;
BEGIN
  v_clean_term := LOWER(TRIM(LEFT(p_search_term, 200)));

  IF LENGTH(v_clean_term) < 2 THEN
    RETURN false;
  END IF;

  -- P0-B: Sanitizar results_count (sentinel -1 = valor suspeito do frontend)
  v_safe_count := CASE
    WHEN p_results_count IS NULL    THEN 0
    WHEN p_results_count < 0        THEN 0
    WHEN p_results_count > 2000     THEN -1  -- suspeito: total do catálogo
    ELSE GREATEST(0, p_results_count)
  END;

  -- P1-E FIX: Advisory lock atômico para eliminar race condition TOCTOU
  -- Lock por hash(term + user_id) → serializa apenas para o mesmo (usuário, termo)
  v_lock_key := hashtext(v_clean_term || COALESCE(auth.uid()::text, 'anon'))::bigint;
  v_lock_acquired := pg_try_advisory_xact_lock(v_lock_key);

  -- Se não conseguiu o lock, outro processo está tratando o mesmo termo → debounce implícito
  IF NOT v_lock_acquired THEN
    RETURN false;
  END IF;

  -- Debounce normal: verificar se foi logado recentemente
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
;
