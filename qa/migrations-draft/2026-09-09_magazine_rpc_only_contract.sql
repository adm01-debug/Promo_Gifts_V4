-- OBJETIVO: contrair o rollout Magazine v2 para mutações exclusivamente via RPC.
-- ALVO: doufsxqlfjyuvxuezpln (Gold canônico).
-- RISCO: alto se aplicado antes do cliente v2 estar READY; quebra clientes legados.
-- PRÉ-CONDIÇÃO: deploy v2 READY + smoke autenticado + aprovação explícita do PO.
-- VALIDAÇÃO: scripts/test-magazine-hardening-v2.sh aplica este draft duas vezes.
-- STATUS: rascunho de promoção posterior; NUNCA autoexecutado por Supabase CLI.

BEGIN;

REVOKE ALL ON FUNCTION public.magazine_add_items_atomic(UUID,TIMESTAMPTZ,JSONB)
  FROM authenticated,service_role;
REVOKE ALL ON FUNCTION public.magazine_remove_items_atomic(UUID,TIMESTAMPTZ,UUID[])
  FROM authenticated,service_role;
REVOKE ALL ON FUNCTION public.magazine_reorder_items_atomic(UUID,TIMESTAMPTZ,UUID[])
  FROM authenticated,service_role;
REVOKE ALL ON FUNCTION public.magazine_duplicate_atomic(UUID,TEXT)
  FROM authenticated,service_role;
REVOKE ALL ON FUNCTION public.magazine_update_metadata_atomic(UUID,TIMESTAMPTZ,JSONB)
  FROM authenticated,service_role;
REVOKE ALL ON FUNCTION public.magazine_publish_atomic(UUID)
  FROM authenticated,service_role;

REVOKE INSERT, UPDATE, DELETE, TRUNCATE
  ON TABLE public.magazines, public.magazine_items
  FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON TABLE public.magazines, public.magazine_items
  TO authenticated, service_role;

COMMIT;
