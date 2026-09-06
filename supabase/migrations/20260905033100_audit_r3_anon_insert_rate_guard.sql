-- Auditoria r3 (2026-09-05) — Validação/Autorização: limite de volume por IP para INSERT anônimo
-- nas tabelas de telemetria que aceitam anon (policies WITH CHECK user_id IS NULL).
-- Aplicada em produção via MCP em 2026-09-05 e validada como anon (3º INSERT com limite 2 rejeitado;
-- authenticated não afetado).
-- Antes: só a edge limitava; via PostgREST direto não havia teto. Agora: contador por
-- (tabela, ip, minuto) em tabela própria (sem seq scan nas tabelas grandes), aplicado só
-- quando o JWT é anon. authenticated/service_role não são afetados.
-- Rollback: DROP TRIGGER trg_anon_rate_guard ON <tabela>; (6 tabelas) + DROP FUNCTION + DROP TABLE
--           + SELECT cron.unschedule('anon-insert-rate-purge');

CREATE TABLE IF NOT EXISTS public.anon_insert_rate (
  bucket_key   text PRIMARY KEY,
  n            integer NOT NULL DEFAULT 0,
  window_start timestamptz NOT NULL
);
ALTER TABLE public.anon_insert_rate ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.anon_insert_rate FROM PUBLIC, anon, authenticated;
DROP POLICY IF EXISTS anon_insert_rate_service_read ON public.anon_insert_rate;
CREATE POLICY anon_insert_rate_service_read ON public.anon_insert_rate
  FOR SELECT TO service_role USING (true);
COMMENT ON TABLE public.anon_insert_rate IS
  'Contadores (tabela|ip|minuto) do guard fn_anon_insert_rate_guard. Só o trigger (SECURITY DEFINER) escreve; purga via cron anon-insert-rate-purge.';

CREATE OR REPLACE FUNCTION public.fn_anon_insert_rate_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_role  text;
  v_limit integer := COALESCE(NULLIF(TG_ARGV[0], '')::integer, 120);
  v_ip    text;
  v_key   text;
  v_n     integer;
BEGIN
  v_role := COALESCE(
    NULLIF(current_setting('request.jwt.claim.role', true), ''),
    (NULLIF(current_setting('request.jwt.claims', true), ''))::jsonb ->> 'role',
    ''
  );
  IF v_role <> 'anon' THEN
    RETURN NEW;
  END IF;

  v_ip := COALESCE(
    NULLIF(btrim(split_part((NULLIF(current_setting('request.headers', true), ''))::jsonb ->> 'x-forwarded-for', ',', 1)), ''),
    'unknown'
  );
  v_key := TG_TABLE_NAME || '|' || v_ip || '|' || to_char(now() AT TIME ZONE 'UTC', 'YYYYMMDDHH24MI');

  INSERT INTO public.anon_insert_rate (bucket_key, n, window_start)
  VALUES (v_key, 1, date_trunc('minute', now()))
  ON CONFLICT (bucket_key) DO UPDATE SET n = public.anon_insert_rate.n + 1
  RETURNING n INTO v_n;

  IF v_n > v_limit THEN
    RAISE EXCEPTION 'anon_insert_rate_limit_exceeded: % (limite %/min por IP)', TG_TABLE_NAME, v_limit
      USING ERRCODE = 'P0001', HINT = 'Reduza a frequência de envio ou autentique-se.';
  END IF;
  RETURN NEW;
END
$$;
REVOKE EXECUTE ON FUNCTION public.fn_anon_insert_rate_guard() FROM PUBLIC, anon, authenticated;
COMMENT ON FUNCTION public.fn_anon_insert_rate_guard() IS
  'Trigger BEFORE INSERT: limita INSERTs de anon por IP/minuto (arg = limite). Ignora authenticated/service_role.';

DROP TRIGGER IF EXISTS trg_anon_rate_guard ON public.analytics_events;
CREATE TRIGGER trg_anon_rate_guard BEFORE INSERT ON public.analytics_events
  FOR EACH ROW EXECUTE FUNCTION public.fn_anon_insert_rate_guard('120');
DROP TRIGGER IF EXISTS trg_anon_rate_guard ON public.catalog_analytics;
CREATE TRIGGER trg_anon_rate_guard BEFORE INSERT ON public.catalog_analytics
  FOR EACH ROW EXECUTE FUNCTION public.fn_anon_insert_rate_guard('120');
DROP TRIGGER IF EXISTS trg_anon_rate_guard ON public.frontend_telemetry;
CREATE TRIGGER trg_anon_rate_guard BEFORE INSERT ON public.frontend_telemetry
  FOR EACH ROW EXECUTE FUNCTION public.fn_anon_insert_rate_guard('300');
DROP TRIGGER IF EXISTS trg_anon_rate_guard ON public.product_views;
CREATE TRIGGER trg_anon_rate_guard BEFORE INSERT ON public.product_views
  FOR EACH ROW EXECUTE FUNCTION public.fn_anon_insert_rate_guard('120');
DROP TRIGGER IF EXISTS trg_anon_rate_guard ON public.search_analytics;
CREATE TRIGGER trg_anon_rate_guard BEFORE INSERT ON public.search_analytics
  FOR EACH ROW EXECUTE FUNCTION public.fn_anon_insert_rate_guard('120');
DROP TRIGGER IF EXISTS trg_anon_rate_guard ON public.password_reset_requests;
CREATE TRIGGER trg_anon_rate_guard BEFORE INSERT ON public.password_reset_requests
  FOR EACH ROW EXECUTE FUNCTION public.fn_anon_insert_rate_guard('10');

SELECT cron.schedule(
  'anon-insert-rate-purge',
  '*/10 * * * *',
  $cron$DELETE FROM public.anon_insert_rate WHERE window_start < now() - interval '2 hours'$cron$
);

DO $$
DECLARE v_missing text;
BEGIN
  SELECT string_agg(t, ', ') INTO v_missing FROM unnest(ARRAY['analytics_events','catalog_analytics','frontend_telemetry','product_views','search_analytics','password_reset_requests']) t
  WHERE NOT EXISTS (SELECT 1 FROM pg_trigger tg WHERE tg.tgname='trg_anon_rate_guard' AND tg.tgrelid = ('public.'||t)::regclass);
  IF v_missing IS NOT NULL THEN RAISE EXCEPTION 'trigger ausente em: %', v_missing; END IF;
END $$;
