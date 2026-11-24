-- Rollback: 20261124163000_revoke_anon_unit_cost_print_areas.sql
-- Restaura o estado anterior (anon com SELECT de tabela e view projetando unit_cost).

REVOKE SELECT ON TABLE public.print_area_techniques FROM anon;
GRANT SELECT ON TABLE public.print_area_techniques TO anon;

DROP VIEW IF EXISTS public.v_print_area_techniques_public;

CREATE VIEW public.v_print_area_techniques_public WITH (security_invoker = true) AS
SELECT
  "id",
  "product_id",
  "tabela_preco_id",
  "location_code",
  "location_name",
  "location_order",
  "max_width",
  "max_height",
  "is_curved",
  "shape",
  "technique_order",
  "is_active",
  "notes",
  "unit_cost",
  "created_at",
  "updated_at"
FROM public.print_area_techniques
WHERE is_active = true;

ALTER VIEW public.v_print_area_techniques_public OWNER TO postgres;
GRANT SELECT ON public.v_print_area_techniques_public TO anon, authenticated, service_role;
