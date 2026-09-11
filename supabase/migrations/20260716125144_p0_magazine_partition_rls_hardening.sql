-- P0-1: magazine_public_view_events partition RLS hardening
-- Audit 2026-07-16: partições _2026_07..10 tinham rls_enabled=FALSE + GRANT ALL para anon.

ALTER TABLE public.magazine_public_view_events_2026_07 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.magazine_public_view_events_2026_08 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.magazine_public_view_events_2026_09 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.magazine_public_view_events_2026_10 ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.magazine_public_view_events_2026_07 FROM anon, authenticated;
REVOKE ALL ON TABLE public.magazine_public_view_events_2026_08 FROM anon, authenticated;
REVOKE ALL ON TABLE public.magazine_public_view_events_2026_09 FROM anon, authenticated;
REVOKE ALL ON TABLE public.magazine_public_view_events_2026_10 FROM anon, authenticated;
REVOKE ALL ON TABLE public.magazine_public_view_events_default  FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.magazine_ensure_view_event_partitions(
  _months_ahead integer DEFAULT 3
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
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
      _created := _created + 1;
    END IF;
  END LOOP;
  RETURN _created;
END;
$function$;

DO $$
DECLARE
  _bad_count integer;
BEGIN
  SELECT count(*)
  INTO   _bad_count
  FROM   information_schema.role_table_grants g
  WHERE  g.table_schema = 'public'
    AND  g.table_name   LIKE 'magazine_public_view_events_20%'
    AND  g.grantee      IN ('anon', 'authenticated');

  IF _bad_count > 0 THEN
    RAISE EXCEPTION 'REVOKE incompleto: ainda existem % grant(s) anon/authenticated em partições de magazine_public_view_events', _bad_count;
  END IF;

  RAISE NOTICE 'P0-1 OK: todas as partições magazine_public_view_events_20%% estão hardenadas.';
END $$;;
