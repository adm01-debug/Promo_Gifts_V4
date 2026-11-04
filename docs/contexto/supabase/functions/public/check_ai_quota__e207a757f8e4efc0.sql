CREATE OR REPLACE FUNCTION public.check_ai_quota(_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  v_role       text;
  v_limit      int;
  v_unlimited  boolean;
  v_used       int;
BEGIN
  v_role := public._get_user_primary_role(_user_id);

  -- FIX BUG-QUOTA-001: cast role::text para comparar com v_role text
  SELECT monthly_limit, is_unlimited INTO v_limit, v_unlimited
  FROM public.ai_usage_quotas WHERE role::text = v_role;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'allowed', true, 'used', 0, 'limit', -1, 'remaining', -1,
      'unlimited', true, 'reason', 'no_quota_for_role'
    );
  END IF;

  -- FIX BUG-QUOTA-002: excluir rows 'pending' órfãs (> 5 min) da contagem.
  -- Justificativa:
  --   status='success' → request concluiu com êxito → conta na quota
  --   status='pending' < 5 min → request em voo → conta (evita double-spend)
  --   status='pending' > 5 min → isolate morreu antes de updateAiLog → NÃO conta
  --   status='error' → request falhou → NÃO conta (check_ai_quota usa != 'error')
  -- Coerente com pg_cron job 149 que converte pending > 5 min → error a cada 10 min.
  SELECT count(*)::int INTO v_used
  FROM public.ai_usage_logs
  WHERE user_id = _user_id
    AND created_at >= date_trunc('month', now())
    AND status != 'error'
    AND (
      status != 'pending'
      OR created_at >= NOW() - INTERVAL '5 minutes'
    );

  IF v_unlimited THEN
    RETURN jsonb_build_object(
      'allowed', true, 'used', v_used, 'limit', -1, 'remaining', -1, 'unlimited', true
    );
  END IF;

  RETURN jsonb_build_object(
    'allowed', v_used < v_limit,
    'used', v_used,
    'limit', v_limit,
    'remaining', greatest(0, v_limit - v_used),
    'unlimited', false
  );
END;
$function$
