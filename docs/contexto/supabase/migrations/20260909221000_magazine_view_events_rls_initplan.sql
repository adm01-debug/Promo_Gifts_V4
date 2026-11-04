-- Otimiza auth.uid() nas policies das partições de analytics Magazine e
-- corrige o gerador para que partições futuras já nasçam sem initplan por linha.

CREATE OR REPLACE FUNCTION public.magazine_ensure_view_event_partitions(
  _months_ahead INTEGER DEFAULT 3
) RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions', 'pg_temp'
AS $$
DECLARE
  _created INTEGER := 0;
  _i INTEGER;
  _m DATE;
  _name TEXT;
BEGIN
  FOR _i IN 0.._months_ahead LOOP
    _m := (date_trunc('month', now()) + make_interval(months => _i))::DATE;
    _name := 'magazine_public_view_events_' || to_char(_m, 'YYYY_MM');

    IF NOT EXISTS (
      SELECT 1 FROM pg_class
      WHERE relname = _name AND relnamespace = 'public'::regnamespace
    ) THEN
      EXECUTE format(
        'CREATE TABLE public.%I PARTITION OF public.magazine_public_view_events'
        ' FOR VALUES FROM (%L) TO (%L)',
        _name, _m, (_m + interval '1 month')::DATE
      );
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', _name);
      EXECUTE format('REVOKE ALL ON TABLE public.%I FROM anon, authenticated', _name);
      EXECUTE format(
        'CREATE POLICY view_events_service_all ON public.%I'
        ' FOR ALL TO service_role USING (true) WITH CHECK (true)',
        _name
      );
      EXECUTE format(
        'CREATE POLICY view_events_read ON public.%I'
        ' FOR SELECT TO authenticated'
        ' USING ('
        '   has_role((SELECT auth.uid()), ''admin''::app_role)'
        '   OR EXISTS ('
        '     SELECT 1 FROM public.magazines m'
        '     WHERE m.id = %I.magazine_id'
        '       AND m.owner_id = (SELECT auth.uid())'
        '   )'
        ')',
        _name, _name
      );
      _created := _created + 1;
    END IF;
  END LOOP;
  RETURN _created;
END;
$$;

DO $$
DECLARE
  _partition TEXT;
BEGIN
  FOR _partition IN
    SELECT child.relname
    FROM pg_inherits inheritance
    JOIN pg_class parent ON parent.oid = inheritance.inhparent
    JOIN pg_class child ON child.oid = inheritance.inhrelid
    JOIN pg_namespace namespace ON namespace.oid = child.relnamespace
    WHERE parent.oid = to_regclass('public.magazine_public_view_events')
      AND namespace.nspname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS view_events_read ON public.%I', _partition);
    EXECUTE format(
      'CREATE POLICY view_events_read ON public.%I'
      ' FOR SELECT TO authenticated'
      ' USING ('
      '   has_role((SELECT auth.uid()), ''admin''::app_role)'
      '   OR EXISTS ('
      '     SELECT 1 FROM public.magazines m'
      '     WHERE m.id = %I.magazine_id'
      '       AND m.owner_id = (SELECT auth.uid())'
      '   )'
      ')',
      _partition, _partition
    );
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.magazine_ensure_view_event_partitions(INTEGER)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.magazine_ensure_view_event_partitions(INTEGER)
  TO service_role;
