-- Auditoria R4 — SEC-009 + SEC-010
-- Aplicado em produção (doufsxqlfjyuvxuezpln) em 2026-09-04
--
-- SEC-009: get_quote_token_by_value — exposição de PII via SELECT *
--   A função retorna SETOF quote_approval_tokens com SELECT *, incluindo:
--     • client_email   — e-mail do cliente (PII — LGPD)
--     • signer_document — CPF/CNPJ do signatário (PII de alta sensibilidade — LGPD)
--     • signer_ip / signer_user_agent — metadados de auditoria (LGPD)
--     • signature_hash — hash interno de integridade
--     • ip_address / user_agent — campos de auditoria legados
--     • seller_id — UUID interno
--   Qualquer caller anon com o token (token legítimo recebido por e-mail, ou link
--   interceptado/redirecionado) pode extrair esses dados via RPC.
--
--   FIX: Nova função get_quote_token_public(text) retorna jsonb explícito com
--   somente os campos necessários para o portal de aprovação. Anon deve chamar
--   get_quote_token_public; get_quote_token_by_value permanece acessível a anon
--   enquanto o frontend não for atualizado (migração de frontend pendente).
--
--   TODO-FRONTEND: atualizar chamada de get_quote_token_by_value → get_quote_token_public,
--   depois revogar: REVOKE EXECUTE ON FUNCTION public.get_quote_token_by_value(text) FROM anon;
--
-- SEC-010: enforce_password_reset_rate_limit — pg_temp no search_path
--   Trigger SECURITY DEFINER com SET search_path TO 'public', 'pg_temp'.
--   Risco: baixo (query já usa prefixo public. explícito), mas viola a política
--   "sem pg_temp em SECURITY DEFINER" estabelecida em SEC-007.
--   Fix: remover pg_temp do search_path.

-- ────────────────────────────────────────────────────────────────────────────
-- SEC-009: get_quote_token_public — substituto seguro para anon
-- Retorna apenas campos necessários para o portal de aprovação.
-- Nunca retorna: client_email, signer_document, signer_ip, signer_user_agent,
--   signature_hash, ip_address, user_agent, attempts, used_at, is_used,
--   approved, seller_id.
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_quote_token_public(
  _token text
)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT jsonb_build_object(
    'id',             qat.id,
    'quote_id',       qat.quote_id,
    'token',          qat.token,
    'status',         qat.status,
    'expires_at',     qat.expires_at,
    'client_name',    qat.client_name,
    'viewed_at',      qat.viewed_at,
    'responded_at',   qat.responded_at,
    'response',       qat.response,
    'response_notes', qat.response_notes,
    'created_at',     qat.created_at,
    'signer_name',    qat.signer_name,
    'signed_at',      qat.signed_at
  )
  FROM public.quote_approval_tokens qat
  WHERE qat.token = _token
  LIMIT 1;
$$;

REVOKE EXECUTE ON FUNCTION public.get_quote_token_public(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_quote_token_public(text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.get_quote_token_public(text) TO anon;

COMMENT ON FUNCTION public.get_quote_token_public(text) IS
  'Portal de aprovação (anon-safe): retorna campos não-sensíveis do token de cotação. '
  'Redacta: client_email, signer_document, signer_ip, signer_user_agent, signature_hash, '
  'ip_address, user_agent, seller_id. '
  'Substituto de get_quote_token_by_value para callers anon (SEC-009, 2026-09-04).';

-- ────────────────────────────────────────────────────────────────────────────
-- SEC-010: enforce_password_reset_rate_limit — remover pg_temp do search_path
-- ────────────────────────────────────────────────────────────────────────────
ALTER FUNCTION public.enforce_password_reset_rate_limit()
  SET search_path = 'public';

-- ────────────────────────────────────────────────────────────────────────────
-- Validação
-- ────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  v_fn_exists        boolean;
  v_anon_execute     boolean;
  v_sec010_path      text;
BEGIN
  -- SEC-009: verificar que get_quote_token_public existe e anon tem EXECUTE
  SELECT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'get_quote_token_public'
  ) INTO v_fn_exists;

  IF NOT v_fn_exists THEN
    RAISE EXCEPTION 'SEC-009: get_quote_token_public não foi criada!';
  END IF;
  RAISE NOTICE '✓ [SEC-009] get_quote_token_public criada.';

  SELECT has_function_privilege('anon', 'public.get_quote_token_public(text)', 'EXECUTE')
  INTO v_anon_execute;

  IF NOT v_anon_execute THEN
    RAISE EXCEPTION 'SEC-009: anon não tem EXECUTE em get_quote_token_public!';
  END IF;
  RAISE NOTICE '✓ [SEC-009] anon tem EXECUTE em get_quote_token_public.';

  -- Verificar que autenticado NÃO tem EXECUTE (apenas anon deve ter)
  IF has_function_privilege('authenticated', 'public.get_quote_token_public(text)', 'EXECUTE') THEN
    RAISE WARNING '[SEC-009] authenticated tem EXECUTE em get_quote_token_public — revisar.';
  ELSE
    RAISE NOTICE '✓ [SEC-009] authenticated não tem EXECUTE em get_quote_token_public (esperado).';
  END IF;

  -- SEC-010: verificar que pg_temp foi removido do search_path
  SELECT array_to_string(
    (SELECT proconfig FROM pg_proc p
     JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public' AND p.proname = 'enforce_password_reset_rate_limit'
     LIMIT 1),
    ','
  ) INTO v_sec010_path;

  IF v_sec010_path IS NOT NULL AND v_sec010_path LIKE '%pg_temp%' THEN
    RAISE EXCEPTION 'SEC-010: pg_temp ainda presente no search_path de enforce_password_reset_rate_limit!';
  END IF;
  RAISE NOTICE '✓ [SEC-010] enforce_password_reset_rate_limit: pg_temp removido do search_path (config atual: %)', v_sec010_path;

  RAISE NOTICE 'Migração SEC-009 + SEC-010 validada com sucesso.';
END;
$$;
