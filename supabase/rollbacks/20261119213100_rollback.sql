-- Rollback: 20261119213100_create_freight_settings
--
-- Remove a tabela de parâmetros globais do frete (CEP de origem, divisores de
-- cubagem, fator de aproveitamento, folga e regra de personalização).
--
-- Antes do DROP, copia freight_settings para _backup_freight_settings_YYYYMMDD
-- (CONTRIBUTING.md), com RLS ligada e sem acesso de anon/authenticated.
-- Reexecutar no mesmo dia não sobrescreve o backup.
--
-- Restaurar: reaplicar a migration (que recria a linha única com os padrões) e
--   UPDATE public.freight_settings s
--   SET origin_cep = b.origin_cep,
--       cubic_divisor_correios = b.cubic_divisor_correios,
--       cubic_divisor_rodoviario = b.cubic_divisor_rodoviario,
--       default_fill_factor = b.default_fill_factor,
--       internal_buffer_days = b.internal_buffer_days,
--       multi_personalization_rule = b.multi_personalization_rule,
--       updated_by = b.updated_by
--   FROM public._backup_freight_settings_YYYYMMDD b
--   WHERE s.id AND b.id
--
-- O DROP TABLE leva junto o trigger e as duas policies. A função
-- public.update_updated_at_column() é compartilhada e NÃO é removida.

DO $$
DECLARE
  b text := '_backup_freight_settings_' || to_char(now() AT TIME ZONE 'UTC', 'YYYYMMDD');
BEGIN
  IF to_regclass('public.freight_settings') IS NOT NULL AND to_regclass('public.' || b) IS NULL THEN
    EXECUTE format('CREATE TABLE public.%I AS TABLE public.freight_settings', b);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', b);
    EXECUTE format('REVOKE ALL ON public.%I FROM anon, authenticated', b);
  END IF;
END $$;

DROP TABLE IF EXISTS public.freight_settings;
