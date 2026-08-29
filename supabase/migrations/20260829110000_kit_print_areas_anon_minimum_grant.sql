-- Forward-only: completa o security_invoker da view pública sem expor a
-- tabela products inteira ao papel anon.

BEGIN;

DO $pre$
BEGIN
  IF to_regclass('public.v_kit_component_print_areas_public') IS NULL
     OR to_regclass('public.products') IS NULL THEN
    RAISE EXCEPTION 'Precondition failed: kit print-area view/products ausentes';
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

GRANT SELECT (id, is_active, is_deleted) ON public.products TO anon;

DO $post$
BEGIN
  IF NOT has_column_privilege('anon', 'public.products', 'id', 'SELECT')
     OR NOT has_column_privilege('anon', 'public.products', 'is_active', 'SELECT')
     OR NOT has_column_privilege('anon', 'public.products', 'is_deleted', 'SELECT') THEN
    RAISE EXCEPTION 'Postcondition failed: grants mínimos não persistidos';
  END IF;
  IF has_table_privilege('anon', 'public.products', 'SELECT') THEN
    RAISE EXCEPTION 'Postcondition failed: anon recebeu SELECT amplo em products';
  END IF;
END
$post$;

COMMIT;
