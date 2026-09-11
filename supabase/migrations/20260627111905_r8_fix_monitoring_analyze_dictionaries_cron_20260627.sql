-- ═══════════════════════════════════════════════════════════════════
-- R8 · Fix cegueira de monitoramento: ANALYZE cron para dicionários
-- fix_version: analyze_dicts_20260627
-- ═══════════════════════════════════════════════════════════════════

-- 1. Função de ANALYZE das tabelas dicionário (low-write)
CREATE OR REPLACE FUNCTION public.fn_analyze_dictionaries()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $fn$
-- fix_version: analyze_dicts_20260627
-- anti-regression: manter search_path + SECURITY DEFINER.
-- Propósito: corrigir n_live_tup=0 (falso) em tabelas que raramente recebem
--            writes e por isso o autovacuum não dispara ANALYZE automático.
BEGIN
  ANALYZE public.property_definitions;
  ANALYZE public.attribute_definitions;
  ANALYZE public.material_types;
  ANALYZE public.commemorative_dates;
  ANALYZE public.color_groups;
  ANALYZE public.color_nuances;
  ANALYZE public.variation_types;
  ANALYZE public.variation_values;
  ANALYZE public.attribute_groups;
  ANALYZE public.packaging_types;
  ANALYZE public.collections;
  ANALYZE public.tags;
  ANALYZE public.eco_material_config;
  ANALYZE public.feminine_color_config;
  ANALYZE public.material_equivalences;
  ANALYZE public.color_equivalences;
  ANALYZE public.supplier_property_mappings;
END;
$fn$;

COMMENT ON FUNCTION public.fn_analyze_dictionaries() IS
'[fix_version:analyze_dicts_20260627] Atualiza estatísticas de tabelas dicionário
 (low-write) para manter n_live_tup preciso em pg_stat_user_tables.
 Agendado via pg_cron analyze-dictionaries-daily às 02:00 UTC.
 Não remover/alterar sem atualizar o cron correspondente.';

REVOKE EXECUTE ON FUNCTION public.fn_analyze_dictionaries() FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.fn_analyze_dictionaries() TO service_role;

-- 2. Executar imediatamente para corrigir stats agora
SELECT public.fn_analyze_dictionaries();

-- 3. Agendar cron (idempotente via DO block — unschedule silencia erro se inexistente)
DO $$
BEGIN
  PERFORM cron.unschedule('analyze-dictionaries-daily');
EXCEPTION WHEN OTHERS THEN NULL;
END;
$$;

SELECT cron.schedule(
  'analyze-dictionaries-daily',
  '0 2 * * *',
  'SELECT public.fn_analyze_dictionaries()'
);;
