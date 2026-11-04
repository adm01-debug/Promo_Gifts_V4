CREATE OR REPLACE FUNCTION public.can_view_all_sales()
 RETURNS boolean
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  -- SEGURANÇA: auth.uid() deve ser NOT NULL (usuário autenticado)
  -- Antes: auth.uid() IS NULL retornava TRUE para anon (bug!)
  SELECT auth.uid() IS NOT NULL AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'manager'::app_role)
    OR public.has_role(auth.uid(), 'supervisor'::app_role)
    OR public.has_role(auth.uid(), 'dev'::app_role)
  );
$function$
