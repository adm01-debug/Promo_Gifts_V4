-- Forward-only: faz a view respeitar RLS/grants das relações subjacentes.
-- PREPARADA, NÃO APLICADA ao projeto canônico em 2026-08-28.

DO $precondition$
DECLARE
  _kind "char";
BEGIN
  SELECT c.relkind INTO _kind
  FROM pg_catalog.pg_class c
  JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relname = 'v_kit_component_print_areas_public';

  IF _kind IS NULL THEN
    RAISE EXCEPTION 'Precondition failed: public.v_kit_component_print_areas_public does not exist';
  END IF;
  IF _kind <> 'v' THEN
    RAISE EXCEPTION 'Precondition failed: expected ordinary view, relkind=%', _kind;
  END IF;
END
$precondition$;

ALTER VIEW public.v_kit_component_print_areas_public
  SET (security_invoker = true);

COMMENT ON VIEW public.v_kit_component_print_areas_public IS
  'security_invoker=true: respeita RLS/grants de kit_component_print_areas, product_kit_components e products.';

DO $postcondition$
DECLARE
  _options text[];
BEGIN
  SELECT c.reloptions INTO _options
  FROM pg_catalog.pg_class c
  WHERE c.oid = 'public.v_kit_component_print_areas_public'::regclass;

  IF NOT COALESCE(_options @> ARRAY['security_invoker=true'], false) THEN
    RAISE EXCEPTION 'Postcondition failed: security_invoker=true was not persisted';
  END IF;
END
$postcondition$;
