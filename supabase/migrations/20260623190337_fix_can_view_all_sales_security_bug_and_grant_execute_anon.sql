
-- ============================================================
-- MELHORIA 5b: Fix bug de segurança + GRANT EXECUTE funções
-- BUG: can_view_all_sales() retornava TRUE para anon
--      por causa de `auth.uid() IS NULL` sem guard
-- RISCO: se alguma policy pública usar essa função,
--        anon poderia ver TODOS os dados de vendas
-- FIX: exigir UID não-nulo (autenticado) antes de checar roles
-- ============================================================

-- FIX: can_view_all_sales() — guard contra anon
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
$function$;

-- GRANT EXECUTE para anon em todas as funções SECURITY INVOKER
-- que aparecem em policies com roles={} (aplica a todos)
-- Todas retornam false para anon (auth.uid()=null ou input null)
GRANT EXECUTE ON FUNCTION public.can_view_all_sales()                TO anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role)            TO anon;
GRANT EXECUTE ON FUNCTION public.is_admin()                          TO anon;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid)                      TO anon;
GRANT EXECUTE ON FUNCTION public.is_admin_strict(uuid)               TO anon;
GRANT EXECUTE ON FUNCTION public.is_dev(uuid)                        TO anon;
GRANT EXECUTE ON FUNCTION public.is_kit_collaborator(uuid, uuid)     TO anon;
GRANT EXECUTE ON FUNCTION public.is_kit_owner(uuid, uuid)            TO anon;
GRANT EXECUTE ON FUNCTION public.is_supervisor_or_above(uuid)        TO anon;
GRANT EXECUTE ON FUNCTION public.user_belongs_to_org(uuid)           TO anon;

NOTIFY pgrst, 'reload schema';
;
