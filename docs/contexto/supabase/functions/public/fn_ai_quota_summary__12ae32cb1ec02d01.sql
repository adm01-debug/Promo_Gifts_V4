CREATE OR REPLACE FUNCTION public.fn_ai_quota_summary()
 RETURNS TABLE(user_id uuid, email text, role text, monthly_limit integer, is_unlimited boolean, used_this_month integer, remaining integer, success_month integer, error_month integer, pending_count integer, last_activity timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    ur.user_id,
    u.email::text,
    ur.role::text,
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
  LEFT JOIN public.ai_usage_quotas aq ON aq.role = ur.role  -- JOIN direto: ambos app_role
  LEFT JOIN public.ai_usage_logs al ON al.user_id = ur.user_id
  GROUP BY ur.user_id, u.email, ur.role, aq.monthly_limit, aq.is_unlimited
  ORDER BY used_this_month DESC NULLS LAST, u.email;
END;
$function$
