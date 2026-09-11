
-- ============================================================
-- APLICADO: 2026-06-23 — Fix bugs console HEAD 403/500
-- PROBLEMA: useCloudStatus dispara HEAD/COUNT antes do JWT
--           estar pronto → requisições saem como role=anon
-- ============================================================

-- FIX 1: GRANT SELECT para anon em tabelas sem grant
-- (anon + RLS sem policy matching = 0 linhas, sem erro HTTP)
GRANT SELECT ON public.discount_approval_requests TO anon;
GRANT SELECT ON public.workspace_notifications TO anon;

-- FIX 2: GRANT EXECUTE nas funções SECURITY DEFINER usadas
-- em RLS policies FOR PUBLIC (que o anon executa ao tentar COUNT)
-- Seguro: SECURITY DEFINER roda como postgres; retorna false para anon
GRANT EXECUTE ON FUNCTION public.user_is_org_member(uuid)    TO anon;
GRANT EXECUTE ON FUNCTION public.is_coord_or_above(uuid)     TO anon;
GRANT EXECUTE ON FUNCTION public.is_org_owner_or_admin(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.is_org_member(uuid, uuid)   TO anon;
GRANT EXECUTE ON FUNCTION public.is_admin_or_above(uuid)     TO anon;

-- FIX 3: Forçar reload do schema cache do PostgREST
-- (view v_products_public foi modificada pelo Lovable bot sem NOTIFY)
NOTIFY pgrst, 'reload schema';
;
