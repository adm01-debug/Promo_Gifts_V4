-- Espelho do ledger (reconciliação B2, 2026-10-15)
-- version=20261013170913 name=incidente20261013_fase5_permissoes_auditoria
-- Aplicada em doufsxqlfjyuvxuezpln em 2026-10-13 via MCP apply_migration (Agente 5, incidente 2026-10-13).
-- O arquivo existia como 20261013120000_* (timestamp diferente do ledger). Renomeado e com o
-- corpo substituído pelos statements do ledger, byte a byte: md5 = 58a805b0099333a30853aa7fcf590eb3.
-- A justificativa etapa a etapa (53/54/56/57/60/62) está na versão comentada anterior:
--   git show 1b59d0f:supabase/migrations/20261013120000_incidente20261013_fase5_permissoes_auditoria.sql
-- Já está no ledger: NÃO reaplicar.
-- >>> statements do ledger (byte-exato) abaixo desta linha <<<
-- ============================================================================
-- INCIDENTE 2026-10-13 — Fase 5 (Permissões, Auditoria, Secrets)
-- Ticket: incidente 2026-10-13, aprovado pelo PO neste chat (Agente 5/5).
-- ============================================================================

CREATE OR REPLACE FUNCTION public.log_access_denied(
  _blocked_path text,
  _required_role text,
  _user_role text DEFAULT NULL::text,
  _reason text DEFAULT 'route_blocked'::text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN RETURN; END IF;
  IF _required_role NOT IN ('dev','admin','supervisor') THEN
    RAISE EXCEPTION 'invalid required_role: %', _required_role;
  END IF;
  INSERT INTO public.admin_audit_log (
    user_id, action, resource_type, resource_id, status, source,
    started_at, finished_at, duration_ms, request_id, payload_summary, details
  ) VALUES (
    _uid, 'route.access_denied', 'route', _blocked_path, 'denied', 'frontend-guard',
    now(), now(), 0, gen_random_uuid()::text,
    jsonb_build_object('blocked_path', _blocked_path),
    jsonb_build_object('reason', _reason, 'blocked_path', _blocked_path,
                       'required_role', _required_role, 'user_role', _user_role)
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.record_dev_route_telemetry(
  _event_type text,
  _blocked_path text,
  _user_role text DEFAULT NULL::text,
  _duration_ms integer DEFAULT NULL::integer
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _safe_path text; _safe_role text; _safe_duration integer; _recent_count integer;
  _allowed_events constant text[] := ARRAY['view','back','retry','fallback','request_access','copy_link','mail','abandon'];
BEGIN
  IF _uid IS NULL THEN RETURN; END IF;
  IF NOT (_event_type = ANY (_allowed_events)) THEN
    RAISE EXCEPTION 'invalid event_type: %', _event_type USING ERRCODE = '22023';
  END IF;
  _safe_path := substring(coalesce(_blocked_path, '') from 1 for 200);
  IF length(_safe_path) = 0 THEN RAISE EXCEPTION 'blocked_path required' USING ERRCODE = '22023'; END IF;
  _safe_role := substring(coalesce(_user_role, '') from 1 for 32);
  IF _safe_role NOT IN ('dev','admin','supervisor','agente','agent','vendedor','') THEN _safe_role := 'unknown'; END IF;
  IF length(_safe_role) = 0 THEN _safe_role := NULL; END IF;
  IF _duration_ms IS NULL THEN _safe_duration := NULL;
  ELSIF _duration_ms < 0 THEN _safe_duration := 0;
  ELSIF _duration_ms > 3600000 THEN _safe_duration := 3600000;
  ELSE _safe_duration := _duration_ms; END IF;
  SELECT count(*) INTO _recent_count FROM public.admin_audit_log
  WHERE user_id = _uid AND action = 'route.ux_event' AND source = 'dev-route-ui'
    AND created_at > now() - interval '1 minute';
  IF _recent_count >= 30 THEN RETURN; END IF;
  INSERT INTO public.admin_audit_log (
    user_id, action, resource_type, resource_id, status, source,
    started_at, finished_at, duration_ms, request_id, payload_summary, details
  ) VALUES (
    _uid, 'route.ux_event', 'route', _safe_path,
    CASE WHEN _event_type IN ('view','abandon','copy_link','mail') THEN 'denied'
         WHEN _event_type IN ('back','retry','fallback') THEN 'partial'
         WHEN _event_type = 'request_access' THEN 'success' ELSE 'denied' END,
    'dev-route-ui', now(), now(), _safe_duration, gen_random_uuid()::text,
    jsonb_build_object('event_type', _event_type, 'blocked_path', _safe_path),
    jsonb_build_object('event_type', _event_type, 'blocked_path', _safe_path, 'user_role', _safe_role, 'duration_ms', _safe_duration)
  );
END; $function$;

CREATE OR REPLACE FUNCTION public.log_user_logout()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN RETURN; END IF;
  INSERT INTO public.admin_audit_log (
    user_id, action, resource_type, status, source, details
  ) VALUES (
    _uid, 'user.logout', 'auth', 'success', 'client.auth',
    jsonb_build_object('timestamp', now())
  );
END;
$function$;

COMMENT ON FUNCTION public.log_access_denied(text, text, text, text) IS
  'Incidente 2026-10-13: convertida para SECURITY DEFINER. Antes disso, INSERT em admin_audit_log violava a RLS (requer is_admin_or_above) para todo usuario autenticado nao-admin que caisse numa rota bloqueada, propagando erro ao frontend.';
COMMENT ON FUNCTION public.record_dev_route_telemetry(text, text, text, integer) IS
  'Incidente 2026-10-13: convertida para SECURITY DEFINER. Mesmo motivo de log_access_denied.';
COMMENT ON FUNCTION public.log_user_logout() IS
  'Incidente 2026-10-13: convertida para SECURITY DEFINER e adicionado guard de auth.uid() IS NULL. Antes disso, todo logout de usuario nao-admin violava a RLS de INSERT em admin_audit_log.';

REVOKE INSERT, UPDATE, DELETE ON public.admin_audit_log FROM authenticated;

GRANT EXECUTE ON FUNCTION public.check_telemetry_regression() TO authenticated;

REVOKE ALL PRIVILEGES ON public.profiles FROM anon;
REVOKE ALL PRIVILEGES ON public.user_roles FROM anon;
REVOKE ALL PRIVILEGES ON public.ip_access_control FROM anon;
REVOKE ALL PRIVILEGES ON public.outbound_webhooks FROM anon;

REVOKE INSERT, UPDATE, DELETE ON public.mcp_api_keys FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.secret_rotation_log FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.login_attempts FROM authenticated;

COMMENT ON TABLE public.video_import_queue IS
'Fila de importacao de videos YouTube -> Cloudflare Stream.
Consumida pelo VPS /workspace/xbz_video_import.js em background.

---- ESTADOS (coluna status) ----
  pending          -> aguardando processamento
  downloading      -> yt-dlp baixando o MP4 (FOR UPDATE SKIP LOCKED -- safe para parallel)
  error_download   -> falha no download (retry automatico ate max_retries=3)
  error_upload     -> falha no upload CF (retry automatico ate max_retries=3)
  done             -> upload CF concluido (aguardando link ao produto)
  linked           -> fn_xbz_link_video executada com sucesso (estado final)

---- FORNECEDORES ----
  ''SPOT'' (padrao): 139 videos na conta (historico, pipeline anterior)
  ''xbz'':          155 videos enfileirados em 2026-06-07 (129 pendentes, 22 linked, 3 error)

---- PROCESSADORES ----
  fn_video_queue_next(supplier)  -> pega proximo item (SECURITY DEFINER, FOR UPDATE SKIP LOCKED)
  fn_video_queue_update(...)     -> atualiza status/campos CF
  fn_video_link_to_products(id)  -> vincula SPOT ao produto (INSERT em product_videos)
  fn_xbz_link_video(...)         -> vincula XBZ ao produto (UPDATE em product_videos existente)

---- VPS SCRIPT ----
  /workspace/xbz_video_import.js (v3, Node.js, DELAY_MS=8000)
  Monitorar: cat /workspace/xbz_video_stats.json
  Resetar itens stuck: UPDATE video_import_queue SET status=''pending'', started_at=NULL
    WHERE source_supplier=''xbz'' AND status=''downloading''

---- CLOUDFLARE STREAM ----
  Account ID:      cd0f4eee542191c4957567814e1f8ca1
  Account Hash:    ksi0mrlcw6rwzezz   (subdomain correto, != accountId)
  Token:           ver vault/integration_credentials -- NAO colocar token em COMMENT ON (incidente 2026-10-13: token cfat_* ficou exposto em texto claro aqui por ~4 meses; ROTACAO PENDENTE -- decisao do PO, nao executada por sessao automatizada).
  Storage:         ~208min usados / 1.000min no plano (em 2026-06-07, revisar)
  Throttle:        code 971 = rate limit de uploads (~7/min). Aguardar 30s extras.';
