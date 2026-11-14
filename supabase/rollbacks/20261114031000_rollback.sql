-- Rollback de 20261114031000: remove a coluna is_trusted.
-- Antes do DROP, copia (id, user_id, is_trusted) das linhas marcadas para
-- _backup_user_known_devices_YYYYMMDD (CONTRIBUTING.md), com RLS e sem acesso de anon/authenticated;
-- reexecução no mesmo dia não sobrescreve o backup. Restaurar após reaplicar a migration:
--   UPDATE public.user_known_devices d SET is_trusted = true
--   FROM public._backup_user_known_devices_YYYYMMDD b WHERE b.id = d.id;
DO $$
DECLARE
  b text := '_backup_user_known_devices_' || to_char(now() AT TIME ZONE 'UTC', 'YYYYMMDD');
BEGIN
  IF EXISTS (
       SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'user_known_devices' AND column_name = 'is_trusted'
     ) AND to_regclass('public.' || b) IS NULL THEN
    EXECUTE format(
      'CREATE TABLE public.%I AS SELECT id, user_id, is_trusted FROM public.user_known_devices WHERE is_trusted',
      b);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', b);
    EXECUTE format('REVOKE ALL ON public.%I FROM anon, authenticated', b);
  END IF;
END $$;

ALTER TABLE public.user_known_devices DROP COLUMN IF EXISTS is_trusted;
