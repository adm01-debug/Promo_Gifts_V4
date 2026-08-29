-- Forward-only: torna explícito todo o conjunto mínimo de privilégios exigido
-- pela view security_invoker, sem devolver SELECT amplo às tabelas-base.

BEGIN;

DO $pre$
BEGIN
  IF to_regclass('public.v_kit_component_print_areas_public') IS NULL
     OR to_regclass('public.products') IS NULL
     OR to_regclass('public.product_kit_components') IS NULL
     OR to_regclass('public.kit_component_print_areas') IS NULL THEN
    RAISE EXCEPTION 'Precondition failed: relações da view pública de kits ausentes';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_class c
    WHERE c.oid = 'public.v_kit_component_print_areas_public'::regclass
      AND COALESCE(c.reloptions, ARRAY[]::text[]) @> ARRAY['security_invoker=true']
  ) THEN
    RAISE EXCEPTION 'Precondition failed: view precisa estar com security_invoker=true';
  END IF;
END
$pre$;

REVOKE SELECT ON public.products FROM anon;
REVOKE SELECT ON public.product_kit_components FROM anon;
REVOKE SELECT ON public.kit_component_print_areas FROM anon;

GRANT SELECT (id, is_active, is_deleted)
  ON public.products TO anon;
GRANT SELECT (id, kit_product_id)
  ON public.product_kit_components TO anon;
GRANT SELECT (
  id, kit_component_id, location_code, location_name, location_order,
  max_width, max_height, shape, is_curved, technique_order, is_active
) ON public.kit_component_print_areas TO anon;
GRANT SELECT ON public.v_kit_component_print_areas_public TO anon;

DO $post$
BEGIN
  IF NOT has_table_privilege('anon', 'public.v_kit_component_print_areas_public', 'SELECT')
     OR NOT has_column_privilege('anon', 'public.product_kit_components', 'kit_product_id', 'SELECT')
     OR NOT has_column_privilege('anon', 'public.kit_component_print_areas', 'is_active', 'SELECT')
     OR NOT has_column_privilege('anon', 'public.products', 'is_deleted', 'SELECT') THEN
    RAISE EXCEPTION 'Postcondition failed: conjunto mínimo da view não persistido';
  END IF;
  IF has_table_privilege('anon', 'public.products', 'SELECT')
     OR has_table_privilege('anon', 'public.product_kit_components', 'SELECT')
     OR has_table_privilege('anon', 'public.kit_component_print_areas', 'SELECT') THEN
    RAISE EXCEPTION 'Postcondition failed: anon manteve SELECT amplo em tabela-base';
  END IF;
END
$post$;

COMMIT;
