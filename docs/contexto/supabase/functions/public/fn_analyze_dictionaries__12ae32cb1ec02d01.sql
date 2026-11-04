CREATE OR REPLACE FUNCTION public.fn_analyze_dictionaries()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
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
$function$
