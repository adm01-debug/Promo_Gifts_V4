-- Auditoria R4 — BUG-3 + CRIT-1 + SEC-006
-- Aplicado em produção (doufsxqlfjyuvxuezpln) em 2026-09-04

-- ────────────────────────────────────────────────────────────────────────────
-- BUG-3 v2: magazine_ensure_view_event_partitions
-- Garante que cada nova partição receba AMBAS as policies:
--   view_events_service_all (TO service_role, ALL)
--   view_events_read        (TO authenticated, SELECT — admin ou dono do magazine)
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.magazine_ensure_view_event_partitions(
  _months_ahead integer DEFAULT 2
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
-- BUG-3 retroativo: partições 2026_11 e 2026_12 criadas sem view_events_read
-- Adicionar policy faltante e normalizar nome mpve_all_service → view_events_service_all
-- ────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  _parts text[] := ARRAY[
    'magazine_public_view_events_2026_11',
    'magazine_public_view_events_2026_12'
  ];
  _p text;
BEGIN
  FOREACH _p IN ARRAY _parts LOOP
    -- Adicionar view_events_read se ausente
    IF NOT EXISTS (
      SELECT 1 FROM pg_policy
      WHERE polrelid = ('public.' || _p)::regclass
        AND polname = 'view_events_read'
    ) THEN
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
        _p, _p
      );
    END IF;
    -- Renomear mpve_all_service → view_events_service_all (consistência)
    IF EXISTS (
      SELECT 1 FROM pg_policy
      WHERE polrelid = ('public.' || _p)::regclass
        AND polname = 'mpve_all_service'
    ) THEN
      EXECUTE format(
        'ALTER POLICY mpve_all_service ON public.%I RENAME TO view_events_service_all',
        _p
      );
    END IF;
  END LOOP;
END;
$$;

-- ────────────────────────────────────────────────────────────────────────────
-- CRIT-1: anon tinha DELETE, INSERT, UPDATE, TRIGGER, REFERENCES em audit log
-- Revogado — anon não deve jamais escrever em tabela de auditoria
-- ────────────────────────────────────────────────────────────────────────────
REVOKE DELETE, INSERT, UPDATE, TRIGGER, REFERENCES
  ON TABLE public.anon_catalog_grant_audit_log
  FROM anon;

-- ────────────────────────────────────────────────────────────────────────────
-- SEC-006: authenticated tinha DELETE, INSERT, UPDATE, TRIGGER, REFERENCES
-- em tabela de audit log — over-provisioned (bloqueado por RLS sem policies,
-- mas grants excessivos violam princípio de menor privilégio)
-- Mantém SELECT (pode ser necessário para leitura futura com policy própria)
-- ────────────────────────────────────────────────────────────────────────────
REVOKE DELETE, INSERT, UPDATE, TRIGGER, REFERENCES
  ON TABLE public.anon_catalog_grant_audit_log
  FROM authenticated;
