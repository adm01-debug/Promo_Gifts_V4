
-- Security fix: security_definer_view (2 ERROR advisors)
-- Switch both views from SECURITY DEFINER to SECURITY INVOKER
-- so RLS is enforced for the calling user, not the view owner.
ALTER VIEW public.v_products_public SET (security_invoker = on);
ALTER VIEW public.somarcas_catalogo_publico SET (security_invoker = on);
;
