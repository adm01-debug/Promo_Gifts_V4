CREATE OR REPLACE FUNCTION public.fn_admin_ai_quota_summary(_search text DEFAULT NULL::text, _limit integer DEFAULT 200)
 RETURNS TABLE(user_id uuid, email text, role text, monthly_limit integer, is_unlimited boolean, used_this_month integer, remaining integer, success_month integer, error_month integer, pending_count integer, last_activity timestamp with time zone)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_limit integer := LEAST(GREATEST(COALESCE(_limit, 200), 1), 500);
  v_search text := NULLIF(btrim(COALESCE(_search, '')), '');
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Autenticacao obrigatoria.' USING ERRCODE = '42501';
  END IF;

  IF NOT public.is_admin_or_above(auth.uid()) THEN
    RAISE EXCEPTION 'Acesso restrito a administradores.' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  WITH resumo AS (
    SELECT
      ur.user_id,
      u.email::text AS email,
      ur.role::text AS role,
      COALESCE(aq.monthly_limit, 0)              AS monthly_limit,
      COALESCE(aq.is_unlimited, false)           AS is_unlimited,
      COALESCE(SUM(
        CASE WHEN al.status != 'error'
                  AND al.created_at >= date_trunc('month', NOW())
                  AND (al.status != 'pending' OR al.created_at >= NOW() - INTERVAL '5 minutes')
             THEN 1 ELSE 0 END
      ), 0)::int                                 AS used_this_month,
      CASE
        WHEN COALESCE(aq.is_unlimited, false) THEN -1
        ELSE GREATEST(0, COALESCE(aq.monthly_limit, 0) -
          COALESCE(SUM(
            CASE WHEN al.status != 'error'
                      AND al.created_at >= date_trunc('month', NOW())
                      AND (al.status != 'pending' OR al.created_at >= NOW() - INTERVAL '5 minutes')
                 THEN 1 ELSE 0 END
          ), 0)::int)
      END                                        AS remaining,
      COALESCE(SUM(
        CASE WHEN al.status = 'success'
                  AND al.created_at >= date_trunc('month', NOW())
             THEN 1 ELSE 0 END
      ), 0)::int                                 AS success_month,
      COALESCE(SUM(
        CASE WHEN al.status = 'error'
                  AND al.created_at >= date_trunc('month', NOW())
             THEN 1 ELSE 0 END
      ), 0)::int                                 AS error_month,
      COALESCE(SUM(
        CASE WHEN al.status = 'pending' THEN 1 ELSE 0 END
      ), 0)::int                                 AS pending_count,
      MAX(al.updated_at)                         AS last_activity
    FROM public.user_roles ur
    JOIN auth.users u ON u.id = ur.user_id AND u.deleted_at IS NULL
    LEFT JOIN public.ai_usage_quotas aq ON aq.role = ur.role
    LEFT JOIN public.ai_usage_logs al ON al.user_id = ur.user_id
    GROUP BY ur.user_id, u.email, ur.role, aq.monthly_limit, aq.is_unlimited
  )
  SELECT
    r.user_id, r.email, r.role, r.monthly_limit, r.is_unlimited, r.used_this_month,
    r.remaining, r.success_month, r.error_month, r.pending_count, r.last_activity
  FROM resumo r
  WHERE v_search IS NULL
     OR r.email ILIKE '%' || v_search || '%'
     OR r.role ILIKE '%' || v_search || '%'
  ORDER BY r.used_this_month DESC NULLS LAST, r.email
  LIMIT v_limit;
END;
$function$
