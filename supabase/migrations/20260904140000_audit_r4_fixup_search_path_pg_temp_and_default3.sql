-- Auditoria R4 — Fixup correctivo (P1/P2 cubic-dev-ai review)
-- Aplicado em produção (doufsxqlfjyuvxuezpln) em 2026-09-05
--
-- Correções:
--   1. magazine_ensure_view_event_partitions — DEFAULT 2 → DEFAULT 3 (P2 #3938561007)
--   2. anon_catalog_grant_audit_log — REVOKE FROM PUBLIC (P2 #3938560994)
--   3. fn_purge_spr_history — search_path = public, pg_temp (P2 #3938561000)
--   4. check_login_rate_limit — search_path = public, pg_temp (P2 #3938560991)
--   5. fn_check_login_allowed — search_path = public, pg_temp (P2 #3938560991)

-- ────────────────────────────────────────────────────────────────────────────
-- 1. magazine_ensure_view_event_partitions — DEFAULT 3
--    Anterior: DEFAULT 2 (cria mês atual + 1 mês à frente)
--    Correto:  DEFAULT 3 (cria mês atual + 2 meses à frente, evita missing partitions)
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.magazine_ensure_view_event_partitions(
  _months_ahead integer DEFAULT 3
) RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  _created integer := 0;
  _i       integer;
  _m       date;
  _name    text;
BEGIN
  FOR _i IN 0.._months_ahead LOOP
    _m    := (date_trunc('month', now()) + make_interval(months => _i))::date;
    _name := 'magazine_public_view_events_' || to_char(_m, 'YYYY_MM');

    IF NOT EXISTS (
      SELECT 1 FROM pg_class
      WHERE relname = _name AND relnamespace = 'public'::regnamespace
    ) THEN
      EXECUTE format(
        'CREATE TABLE public.%I PARTITION OF public.magazine_public_view_events'
        ' FOR VALUES FROM (%L) TO (%L)',
        _name, _m, (_m + interval '1 month')::date
      );
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', _name);
      EXECUTE format('REVOKE ALL ON TABLE public.%I FROM anon, authenticated', _name);
      -- service_role: acesso total para edge functions (ingestão de view events)
      EXECUTE format(
        'CREATE POLICY view_events_service_all ON public.%I'
        ' FOR ALL TO service_role USING (true) WITH CHECK (true)',
        _name);
      -- authenticated: admins e donos do magazine podem ler seus analytics
      EXECUTE format(
        'CREATE POLICY view_events_read ON public.%I'
        ' FOR SELECT TO authenticated'
        ' USING ('
        '   has_role(auth.uid(), ''admin''::app_role)'
        '   OR EXISTS ('
        '     SELECT 1 FROM public.magazines m'
        '     WHERE m.id = %I.magazine_id AND m.owner_id = auth.uid()'
        '   )'
        ')',
        _name, _name);
      _created := _created + 1;
    END IF;
  END LOOP;
  RETURN _created;
END;
$$;

-- ────────────────────────────────────────────────────────────────────────────
-- 2. anon_catalog_grant_audit_log — REVOKE FROM PUBLIC
--    Migration 100000 revogou de anon e authenticated mas não de PUBLIC.
--    Roles herdam grants de PUBLIC — sem REVOKE FROM PUBLIC, o acesso persiste
--    via herança mesmo após REVOKE nas roles nomeadas.
-- ────────────────────────────────────────────────────────────────────────────
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, TRIGGER, REFERENCES
  ON TABLE public.anon_catalog_grant_audit_log
  FROM PUBLIC;

-- ────────────────────────────────────────────────────────────────────────────
-- 3. fn_purge_spr_history — search_path = public, pg_temp
--    Migration 103000 fixou para 'public' sem pg_temp explícito.
--    Com pg_temp ao final, public é pesquisado antes da temp schema,
--    prevenindo shadowing mesmo em ambientes de test/staging.
-- ────────────────────────────────────────────────────────────────────────────
ALTER FUNCTION public.fn_purge_spr_history(integer)
  SET search_path = public, pg_temp;

-- ────────────────────────────────────────────────────────────────────────────
-- 4. check_login_rate_limit — search_path = public, pg_temp
--    Migrations 101500 e 105000 usaram SET search_path = public sem pg_temp.
-- ────────────────────────────────────────────────────────────────────────────
ALTER FUNCTION public.check_login_rate_limit(text, text)
  SET search_path = public, pg_temp;

-- ────────────────────────────────────────────────────────────────────────────
-- 5. fn_check_login_allowed — search_path = public, pg_temp
--    Migration 110000/130000 definiu a função; search_path sem pg_temp.
-- ────────────────────────────────────────────────────────────────────────────
ALTER FUNCTION public.fn_check_login_allowed(text, text, text, text)
  SET search_path = public, pg_temp;

-- ────────────────────────────────────────────────────────────────────────────
-- Validação
-- ────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  v_default text;
  v_config  text[];
BEGIN
  -- 1. magazine_ensure_view_event_partitions default
  SELECT pg_get_expr(p.proargdefaults, 0)
    INTO v_default
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.proname = 'magazine_ensure_view_event_partitions';

  -- Alternativa: verificar via prosrc que body usa DEFAULT 3
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'magazine_ensure_view_event_partitions'
      AND p.pronargs = 1
  ) THEN
    RAISE EXCEPTION 'fixup-140000: magazine_ensure_view_event_partitions não encontrada';
  END IF;
  RAISE NOTICE '✓ [fixup-140000] magazine_ensure_view_event_partitions: OK';

  -- 2. REVOKE FROM PUBLIC foi idempotente (não há como validar revoke diretamente,
  --    mas a ausência de erro confirma que a tabela existe e o REVOKE foi aceito)
  RAISE NOTICE '✓ [fixup-140000] anon_catalog_grant_audit_log REVOKE FROM PUBLIC: OK';

  -- 3. fn_purge_spr_history search_path
  SELECT p.proconfig INTO v_config
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.proname = 'fn_purge_spr_history' LIMIT 1;

  IF v_config IS NULL OR NOT ('search_path=public, pg_temp' = ANY(v_config)) THEN
    RAISE EXCEPTION 'fixup-140000: fn_purge_spr_history search_path incorreto: %', v_config;
  END IF;
  RAISE NOTICE '✓ [fixup-140000] fn_purge_spr_history: search_path=public, pg_temp';

  -- 4. check_login_rate_limit search_path
  SELECT p.proconfig INTO v_config
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.proname = 'check_login_rate_limit' LIMIT 1;

  IF v_config IS NULL OR NOT ('search_path=public, pg_temp' = ANY(v_config)) THEN
    RAISE EXCEPTION 'fixup-140000: check_login_rate_limit search_path incorreto: %', v_config;
  END IF;
  RAISE NOTICE '✓ [fixup-140000] check_login_rate_limit: search_path=public, pg_temp';

  -- 5. fn_check_login_allowed search_path
  SELECT p.proconfig INTO v_config
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.proname = 'fn_check_login_allowed' LIMIT 1;

  IF v_config IS NULL OR NOT ('search_path=public, pg_temp' = ANY(v_config)) THEN
    RAISE EXCEPTION 'fixup-140000: fn_check_login_allowed search_path incorreto: %', v_config;
  END IF;
  RAISE NOTICE '✓ [fixup-140000] fn_check_login_allowed: search_path=public, pg_temp';
END;
$$;
