-- ============================================================================
-- INCIDENTE 2026-10-13 — Fase 5 (Permissões, Auditoria, Secrets)
-- Ticket: incidente 2026-10-13, aprovado pelo PO neste chat (Agente 5/5).
-- REGRA #8 CLAUDE.md: DDL aplicada via MCP neste mesmo PR, com este arquivo
-- de migration versionado reproduzindo o efeito já aplicado em produção.
--
-- Cobre etapas 53, 54, 56, 57, 60, 62 do plano de correção.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- ETAPA 53/54 — admin_audit_log: funções de log chamadas diretamente pelo
-- frontend (log_access_denied, record_dev_route_telemetry, log_user_logout)
-- NÃO eram SECURITY DEFINER, apesar do COMMENT ON TABLE admin_audit_log
-- documentar todas como "SECURITY DEFINER". A policy de INSERT da tabela é
-- `is_admin_or_above(auth.uid()) AND user_id = auth.uid()` — ou seja, TODO
-- usuário autenticado comum (não-admin) que:
--   * tem uma rota bloqueada (log_access_denied / record_dev_route_telemetry)
--   * ou simplesmente faz logout (log_user_logout)
-- fazia a função tentar um INSERT que violava a RLS policy, sem tratamento
-- de erro no INSERT — a exceção de RLS subia para o cliente. Isso é
-- consistente com o volume de erros relatado no diagnóstico do incidente.
--
-- FIX: recriar as 3 funções como SECURITY DEFINER (owner postgres, mesmo
-- padrão de log_mcp_key_changes/audit_user_role_changes/etc.), mantendo o
-- early-return em auth.uid() IS NULL já existente em log_access_denied e
-- record_dev_route_telemetry (etapa 54), e adicionando o mesmo guard em
-- log_user_logout por consistência. Com SECURITY DEFINER, a função roda com
-- o privilégio do owner (postgres) e não depende mais do GRANT de tabela
-- concedido a `authenticated` nem da RLS de INSERT — o controle de acesso
-- passa a ser "só entra por aqui", não "a tabela é gravável por qualquer
-- authenticated".
-- ----------------------------------------------------------------------------

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
  'Incidente 2026-10-13: convertida para SECURITY DEFINER. Antes disso, INSERT em admin_audit_log violava a RLS (requer is_admin_or_above) para todo usuário autenticado não-admin que caísse numa rota bloqueada, propagando erro ao frontend.';
COMMENT ON FUNCTION public.record_dev_route_telemetry(text, text, text, integer) IS
  'Incidente 2026-10-13: convertida para SECURITY DEFINER. Mesmo motivo de log_access_denied.';
COMMENT ON FUNCTION public.log_user_logout() IS
  'Incidente 2026-10-13: convertida para SECURITY DEFINER e adicionado guard de auth.uid() IS NULL. Antes disso, todo logout de usuário não-admin violava a RLS de INSERT em admin_audit_log.';

-- ----------------------------------------------------------------------------
-- ETAPA 53/62 — admin_audit_log: revogar GRANTs de tabela que não são mais
-- necessários agora que a escrita acontece só via função SECURITY DEFINER.
-- SELECT permanece (gated por RLS/can_view_audit_logs). UPDATE/DELETE para
-- `authenticated` nunca tiveram policy correspondente (RLS já bloqueava),
-- mas o GRANT de tabela era puro excesso de superfície de ataque.
-- ----------------------------------------------------------------------------
REVOKE INSERT, UPDATE, DELETE ON public.admin_audit_log FROM authenticated;

-- ----------------------------------------------------------------------------
-- ETAPA 56 — GRANTs de funções RPC chamadas pelo frontend.
--
-- check_telemetry_regression: é SECURITY DEFINER, já valida internamente
-- has_role(auth.uid(), 'admin') e retorna {"error":"forbidden"} para
-- não-admin — está preparada para ser exposta a `authenticated` e é
-- legitimamente chamada via supabase.rpc() em
-- src/pages/admin/telemetry/useRegressionGuardrail.ts e useOptimizationQueue.ts.
-- Faltava o GRANT EXECUTE.
GRANT EXECUTE ON FUNCTION public.check_telemetry_regression() TO authenticated;

-- fn_get_product_customization_options: já tem GRANT EXECUTE para
-- `authenticated` (confirmado via information_schema.role_routine_grants).
-- Os 1.269 erros reportados no diagnóstico não são causados por falta de
-- GRANT — não há GRANT a corrigir aqui. Investigação da causa raiz dos
-- erros fica fora do escopo deste agente (Fase 5); documentado como
-- pendência de investigação funcional, não de permissão.

-- ----------------------------------------------------------------------------
-- ETAPA 57 — Levantamento de GRANTs em tabelas sensíveis e revogação do que
-- é largo demais. Resumo do levantamento (ver PR para a query completa):
--
--   * profiles, user_roles, ip_access_control, outbound_webhooks: role
--     `anon` tinha INSERT/UPDATE/DELETE/REFERENCES/TRIGGER concedido a nível
--     de tabela. Não há nenhuma policy de RLS que libere anon nessas tabelas
--     (todas usam auth.uid()/is_admin_or_above, que é NULL/false para anon),
--     então hoje o GRANT não abre um buraco ativo — mas é um GRANT morto que
--     só serve como superfície de ataque caso uma policy futura tenha um bug
--     (ex.: um `USING (true)` acidental). anon deve ter ZERO grants nessas
--     tabelas, nunca "RLS cobre".
--   * admin_settings, integration_credentials, ip_access_control,
--     outbound_webhooks: GRANT de INSERT/UPDATE/DELETE para `authenticated`
--     é necessário — é o padrão "admin via RLS" (policies exigem
--     has_role/is_admin_or_above/is_admin com condição real, não bloqueada).
--     Mantido como está.
--   * mcp_api_keys, secret_rotation_log: GRANT de INSERT/UPDATE/DELETE para
--     `authenticated` é puro excesso — as próprias policies de RLS têm
--     `WITH CHECK (false)` / `USING (false)` para essas operações (ninguém
--     nunca escreve por aqui via JWT, só service_role/triggers). Revogado.
--   * login_attempts: só existe policy de SELECT (devs). Não há policy de
--     INSERT/UPDATE/DELETE para `authenticated`, logo o GRANT de tabela
--     também é excesso (grava via service_role nas edge functions de login).
--     Revogado para authenticated.
--   * profiles, user_roles: GRANTs de INSERT/UPDATE para `authenticated`
--     são necessários (auto-cadastro de perfil, gestão de papéis por
--     admin/dev — ambos gated por policy real). Mantidos.
-- ----------------------------------------------------------------------------

REVOKE ALL PRIVILEGES ON public.profiles FROM anon;
REVOKE ALL PRIVILEGES ON public.user_roles FROM anon;
REVOKE ALL PRIVILEGES ON public.ip_access_control FROM anon;
REVOKE ALL PRIVILEGES ON public.outbound_webhooks FROM anon;

REVOKE INSERT, UPDATE, DELETE ON public.mcp_api_keys FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.secret_rotation_log FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.login_attempts FROM authenticated;

-- ----------------------------------------------------------------------------
-- ETAPA 60 — COMMENT ON TABLE video_import_queue expunha um token Cloudflare
-- (prefixo `cfat_7CnrimH0S6...`) em texto claro. Comentário sanitizado.
-- O token em si NÃO foi rotacionado por este agente (fora do escopo de uma
-- sessão automatizada tocar credenciais externas) — ver PR para a pendência
-- de rotação manual pelo PO.
-- ----------------------------------------------------------------------------
COMMENT ON TABLE public.video_import_queue IS
'Fila de importação de vídeos YouTube → Cloudflare Stream.
Consumida pelo VPS /workspace/xbz_video_import.js em background.

---- ESTADOS (coluna status) ----
  pending          -> aguardando processamento
  downloading      -> yt-dlp baixando o MP4 (FOR UPDATE SKIP LOCKED -- safe para parallel)
  error_download   -> falha no download (retry automatico até max_retries=3)
  error_upload     -> falha no upload CF (retry automatico até max_retries=3)
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

-- ----------------------------------------------------------------------------
-- ETAPA 62 — Confirmado (sem alteração necessária):
--   * admin_audit_log não tem policy de UPDATE/DELETE para ninguém (RLS
--     bloqueia por ausência de policy) e, com este migration, o GRANT de
--     tabela para `authenticated` também foi removido (ver acima).
--   * Retenção de 90 dias já existe e está ATIVA: cron job 21
--     (cleanup-security-logs, diário 03:30) e cron job 271
--     (cleanup-log-tables-weekly, domingo 03:07) — ambos `active=true`.
--   * admin_audit_log hoje tem 524 linhas / 568 kB — dentro do esperado
--     ("< 500 rows" é o alvo documentado; levemente acima, não é anomalia).
-- Nenhuma DDL necessária para esta etapa — documentado aqui apenas para
-- registro de que a verificação foi feita.
-- ----------------------------------------------------------------------------
