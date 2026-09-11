
DROP VIEW IF EXISTS public.v_print_area_techniques_public CASCADE;

CREATE VIEW public.v_print_area_techniques_public AS
SELECT
  id,
  product_id,
  tabela_preco_id,
  location_code,
  location_name,
  location_order,
  max_width,
  max_height,
  is_curved,
  shape,
  technique_order,
  is_active,
  notes,
  unit_cost,
  created_at,
  updated_at
FROM public.print_area_techniques
WHERE is_active = true;

ALTER VIEW public.v_print_area_techniques_public SET (security_invoker = false);
GRANT SELECT ON public.v_print_area_techniques_public TO anon, authenticated;

SELECT COUNT(*) AS total_ativas FROM v_print_area_techniques_public;
;
