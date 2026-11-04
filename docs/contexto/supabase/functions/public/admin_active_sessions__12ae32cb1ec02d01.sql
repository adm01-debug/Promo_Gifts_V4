CREATE OR REPLACE FUNCTION public.admin_active_sessions()
 RETURNS TABLE(user_id uuid, email text, session_id uuid, session_created_at timestamp with time zone, session_updated_at timestamp with time zone, refreshed_at timestamp with time zone, not_after timestamp with time zone, ip text, user_agent text, live_refresh_token boolean)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
BEGIN
  IF NOT public.has_role(auth.uid(), 'dev'::public.app_role) THEN
    RAISE EXCEPTION 'insufficient_privilege: requer role dev'
      USING ERRCODE = '42501';
  END IF;

  -- Espelha mfaAal2 da rota: claim aal do JWT já verificado pelo PostgREST.
  IF coalesce(auth.jwt() ->> 'aal', '') <> 'aal2' THEN
    RAISE EXCEPTION 'insufficient_privilege: requer sessão AAL2'
      USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    u.id,
    u.email::text,
    s.id,
    s.created_at,
    s.updated_at,
    s.refreshed_at::timestamptz,
    s.not_after,
    s.ip::text,
    s.user_agent,
    (
      EXISTS (
        SELECT 1
        FROM auth.refresh_tokens rt
        WHERE rt.session_id = s.id
          AND rt.revoked IS NOT TRUE
      )
      -- Refresh tokens v2 vivem na própria sessão (hmac_key + counter),
      -- sem linha em auth.refresh_tokens.
      OR s.refresh_token_hmac_key IS NOT NULL
    ) AS live_refresh_token
  FROM auth.users u
  JOIN auth.sessions s ON s.user_id = u.id
  WHERE s.not_after IS NULL OR s.not_after > now()
  ORDER BY s.updated_at DESC NULLS LAST;
END;
$function$
