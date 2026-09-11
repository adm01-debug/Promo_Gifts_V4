
-- ============================================================
-- PEÇA 2: Migrar as 3 funções que usam auth_login_attempts
-- para usar login_attempts (canônica, 1.240 linhas ativas)
-- e depois arquivar auth_login_attempts
-- ============================================================

-- 2A: record_auth_attempt → delega para log_login_attempt (já canônica)
CREATE OR REPLACE FUNCTION public.record_auth_attempt(
  _email    text,
  _ip       text,
  _success  boolean,
  _reason   text DEFAULT NULL,
  _ua       text DEFAULT NULL
)
RETURNS void
LANGUAGE sql
SET search_path TO 'public'
AS $$
  -- MIGRADO em 2026-06-15: era INSERT em auth_login_attempts (vazia).
  -- Agora delega para log_login_attempt → login_attempts (canônica, ativa).
  SELECT public.log_login_attempt(
    _email        := _email,
    _success      := _success,
    _user_id      := NULL,
    _ip           := _ip,
    _user_agent   := _ua,
    _failure_reason := _reason
  );
$$;

-- 2B: check_auth_throttling → lê de login_attempts em vez de auth_login_attempts
-- Mantém assinatura idêntica para não quebrar callers
CREATE OR REPLACE FUNCTION public.check_auth_throttling(
  _email text,
  _ip    text
)
RETURNS TABLE(allowed boolean, remaining_seconds integer)
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  recent_failures     INT;
  last_failure_at     TIMESTAMP WITH TIME ZONE;
  lockout_duration    INT;
  elapsed_since_last  INT;
BEGIN
  -- MIGRADO em 2026-06-15: era auth_login_attempts (0 linhas).
  -- Agora lê de login_attempts (canônica). Lógica de throttling idêntica.
  SELECT COUNT(*), MAX(created_at)
    INTO recent_failures, last_failure_at
  FROM public.login_attempts
  WHERE (email = _email OR ip_address = _ip)
    AND success = false
    AND created_at > now() - INTERVAL '15 minutes';

  IF recent_failures < 5 THEN
    RETURN QUERY SELECT true, 0;
    RETURN;
  END IF;

  IF    recent_failures < 10 THEN lockout_duration := 300;
  ELSIF recent_failures < 15 THEN lockout_duration := 900;
  ELSE                             lockout_duration := 3600;
  END IF;

  elapsed_since_last := EXTRACT(EPOCH FROM (now() - last_failure_at))::INT;

  IF elapsed_since_last >= lockout_duration THEN
    RETURN QUERY SELECT true, 0;
  ELSE
    RETURN QUERY SELECT false, (lockout_duration - elapsed_since_last);
  END IF;
END;
$function$;

-- 2C: clear_auth_attempts → deleta de login_attempts por email
CREATE OR REPLACE FUNCTION public.clear_auth_attempts(_email text)
RETURNS void
LANGUAGE sql
SET search_path TO 'public'
AS $$
  -- MIGRADO em 2026-06-15: era DELETE em auth_login_attempts (vazia).
  -- Agora limpa login_attempts (canônica).
  DELETE FROM public.login_attempts WHERE email = _email;
$$;

-- 2D: Arquivar auth_login_attempts (0 linhas, agora sem callers)
ALTER TABLE public.auth_login_attempts SET SCHEMA archive;

-- Comentário pós-arquivo
COMMENT ON TABLE archive.auth_login_attempts IS
'[ARQUIVADA → schema archive em 2026-06-15]
Tabela duplicata de public.login_attempts — criada para um
sistema de seguranca paralelo (check_auth_throttling +
record_auth_attempt + clear_auth_attempts) que nunca recebeu
dados (0 linhas em producao).

As 3 funcoes callers foram migradas para login_attempts
(canonica, 1.240 linhas ativas) em 2026-06-15.
Schema: email, ip_address, success, failure_reason, user_agent.
login_attempts e superset: adiciona user_id e metadata.

Candidata a DROP apos confirmar estabilidade das 3 funcoes migradas.';
;
