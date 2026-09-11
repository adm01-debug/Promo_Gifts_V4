
-- Atualizar fn_log_search_analytics para também popular user_search_history
-- (histórico pessoal de buscas por usuário autenticado)

CREATE OR REPLACE FUNCTION public.fn_log_search_analytics(
  p_search_term     text,
  p_results_count   integer DEFAULT 0,
  p_search_context  text DEFAULT NULL::text,
  p_debounce_seconds integer DEFAULT 2
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_last_logged   timestamptz;
  v_clean_term    text;
  v_safe_count    integer;
  v_lock_key      bigint;
  v_lock_acquired boolean;
  v_caller_id     uuid;
BEGIN
  v_clean_term := LOWER(TRIM(LEFT(p_search_term, 200)));
  IF LENGTH(v_clean_term) < 2 THEN RETURN false; END IF;

  -- P0-B: Sanitizar results_count
  v_safe_count := CASE
    WHEN p_results_count IS NULL    THEN 0
    WHEN p_results_count < 0        THEN 0
    WHEN p_results_count > 2000     THEN -1
    ELSE GREATEST(0, p_results_count)
  END;

  -- P1-E: Advisory lock para eliminar race condition TOCTOU
  v_lock_key      := hashtext(v_clean_term || COALESCE(auth.uid()::text, 'anon'))::bigint;
  v_lock_acquired := pg_try_advisory_xact_lock(v_lock_key);
  IF NOT v_lock_acquired THEN RETURN false; END IF;

  -- Debounce
  SELECT MAX(created_at) INTO v_last_logged
  FROM public.search_analytics sa
  WHERE sa.search_term = v_clean_term
    AND sa.user_id IS NOT DISTINCT FROM auth.uid()
    AND sa.created_at >= NOW() - (p_debounce_seconds || ' seconds')::interval;

  IF v_last_logged IS NOT NULL THEN RETURN false; END IF;

  -- Registrar na search_analytics (global)
  INSERT INTO public.search_analytics (
    search_term, results_count, search_context, user_id, created_at
  ) VALUES (
    v_clean_term, v_safe_count, p_search_context, auth.uid(), NOW()
  );

  -- P2-F: Registrar no histórico pessoal (apenas usuários logados)
  -- Upsert: se o mesmo termo já existe no histórico, atualiza updated_at e count
  v_caller_id := auth.uid();
  IF v_caller_id IS NOT NULL THEN
    INSERT INTO public.user_search_history (
      user_id, query_text, history_type, result_count, metadata, created_at, updated_at
    ) VALUES (
      v_caller_id,
      v_clean_term,
      COALESCE(p_search_context, 'catalog'),
      CASE WHEN v_safe_count = -1 THEN 0 ELSE v_safe_count END,
      jsonb_build_object('last_context', p_search_context),
      NOW(),
      NOW()
    )
    ON CONFLICT (user_id, query_text)
    DO UPDATE SET
      result_count = CASE WHEN v_safe_count = -1 THEN 0 ELSE v_safe_count END,
      updated_at   = NOW(),
      metadata     = jsonb_set(
        COALESCE(user_search_history.metadata, '{}'::jsonb),
        '{last_context}', to_jsonb(p_search_context)
      );
  END IF;

  RETURN true;

EXCEPTION WHEN OTHERS THEN
  RETURN false;
END;
$function$;

-- Verificar se há unique constraint em user_search_history para o ON CONFLICT
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.user_search_history'::regclass
      AND contype = 'u'
      AND array_length(conkey, 1) = 2
  ) THEN
    -- Criar constraint única (user_id, query_text) para o ON CONFLICT funcionar
    ALTER TABLE public.user_search_history
      ADD CONSTRAINT uq_user_search_history_user_query
      UNIQUE (user_id, query_text);
  END IF;
END;
$$;
;
