-- MELHORIA 2: vw_somarcas_materials expunha cost_price a anon (security_invoker=false
-- + grant anon = bypass de RLS). vw_material_health expunha metricas/fornecedores a anon.
-- profiles = somente staff (sales/admin/manager); clientes B2B navegam como anon.
-- Fix: security_invoker=on + REVOKE anon. Mantem authenticated (staff legitimamente ve custo).
ALTER VIEW public.vw_material_health    SET (security_invoker = on);
ALTER VIEW public.vw_somarcas_materials SET (security_invoker = on);
REVOKE SELECT ON public.vw_material_health    FROM anon;
REVOKE SELECT ON public.vw_somarcas_materials FROM anon;;
