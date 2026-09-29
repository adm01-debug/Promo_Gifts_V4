-- OBJETIVO: contrair o rollout Magazine v2 para mutações exclusivamente via RPC.
-- ALVO: doufsxqlfjyuvxuezpln (Gold canônico).
-- RISCO: alto se aplicado antes do cliente v2 estar READY; quebra clientes legados.
-- PRÉ-CONDIÇÃO: merge/deploy v2 READY + smoke autenticado + autorização explícita do PO.
-- VALIDAÇÃO: scripts/test-magazine-hardening-v2.sh aplica este draft duas vezes em PostgreSQL 17 descartável.
-- STATUS: draft forward-only final; não versionar/aplicar antes do workflow autorizado gerar o recibo canônico.
--
-- Magazine rollout contract: all authenticated writes go through the versioned
-- SECURITY DEFINER RPC surface. Direct table DML and the timestamp-based legacy
-- RPCs bypass edit_version CAS and must no longer remain public APIs.
--
-- Forward-only and idempotent. SELECT remains available to authenticated users
-- under RLS because the editor hydrates magazines/items through PostgREST.
-- Rollback: restaurar grants/policies de 20260716195353 e EXECUTE das RPCs legacy somente junto do rollback do frontend; não há rollback de dados.

REVOKE ALL ON FUNCTION public.magazine_add_items_atomic(UUID,TIMESTAMPTZ,JSONB)
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.magazine_remove_items_atomic(UUID,TIMESTAMPTZ,UUID[])
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.magazine_reorder_items_atomic(UUID,TIMESTAMPTZ,UUID[])
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.magazine_duplicate_atomic(UUID,TEXT)
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.magazine_update_metadata_atomic(UUID,TIMESTAMPTZ,JSONB)
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.magazine_publish_atomic(UUID)
  FROM PUBLIC, anon, authenticated, service_role;

REVOKE INSERT, UPDATE, DELETE, TRUNCATE
  ON TABLE public.magazines, public.magazine_items
  FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON TABLE public.magazines, public.magazine_items
  TO authenticated, service_role;

-- RPC-only means RLS must not retain a latent direct-write path. SECURITY
-- DEFINER RPCs enforce owner/admin + CAS themselves and do not need mutable
-- table policies. Keep collaborative reads only.
DROP POLICY IF EXISTS magazines_owner_all ON public.magazines;
DROP POLICY IF EXISTS magazines_all ON public.magazines;
DROP POLICY IF EXISTS magazines_admin_all ON public.magazines;
DROP POLICY IF EXISTS magazines_insert ON public.magazines;
DROP POLICY IF EXISTS magazines_update ON public.magazines;
DROP POLICY IF EXISTS magazines_delete ON public.magazines;
DROP POLICY IF EXISTS magazine_items_via_owner_or_org ON public.magazine_items;
DROP POLICY IF EXISTS magazine_items_select_owner_or_org ON public.magazine_items;
DROP POLICY IF EXISTS magazine_items_insert_owner_or_admin ON public.magazine_items;
DROP POLICY IF EXISTS magazine_items_update_owner_or_admin ON public.magazine_items;
DROP POLICY IF EXISTS magazine_items_delete_owner_or_admin ON public.magazine_items;

CREATE POLICY magazine_items_select_owner_or_org
ON public.magazine_items
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.magazines m
    WHERE m.id = magazine_items.magazine_id
      AND (
        m.owner_id = (SELECT auth.uid())
        OR public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
        OR (
          m.organization_id IS NOT NULL
          AND EXISTS (
            SELECT 1
            FROM public.organization_members om
            WHERE om.organization_id = m.organization_id
              AND om.user_id = (SELECT auth.uid())
          )
        )
      )
  )
);

DO $contract$
DECLARE
  signature TEXT;
  role_name TEXT;
BEGIN
  FOREACH signature IN ARRAY ARRAY[
    'public.magazine_create_v2(uuid,text,text)',
    'public.magazine_update_metadata_v2(uuid,bigint,jsonb)',
    'public.magazine_add_items_v2(uuid,bigint,jsonb)',
    'public.magazine_remove_items_v2(uuid,bigint,uuid[])',
    'public.magazine_reorder_items_v2(uuid,bigint,uuid[])',
    'public.magazine_update_item_v2(uuid,bigint,uuid,jsonb)',
    'public.magazine_publish_v2(uuid,bigint)',
    'public.magazine_unpublish_v2(uuid,bigint)',
    'public.magazine_archive_v2(uuid,bigint)',
    'public.magazine_reactivate_v2(uuid,bigint)',
    'public.magazine_soft_delete_v2(uuid,bigint)',
    'public.magazine_restore_v2(uuid,bigint)',
    'public.magazine_duplicate_v2(uuid,bigint,text,text)',
    'public.magazine_import_local_v2(text,jsonb)'
  ] LOOP
    IF to_regprocedure(signature) IS NULL
       OR NOT has_function_privilege('authenticated', signature, 'EXECUTE') THEN
      RAISE EXCEPTION 'Magazine RPC-only precondition failed: %', signature;
    END IF;
  END LOOP;

  FOREACH signature IN ARRAY ARRAY[
    'public.magazine_add_items_atomic(uuid,timestamp with time zone,jsonb)',
    'public.magazine_remove_items_atomic(uuid,timestamp with time zone,uuid[])',
    'public.magazine_reorder_items_atomic(uuid,timestamp with time zone,uuid[])',
    'public.magazine_duplicate_atomic(uuid,text)',
    'public.magazine_update_metadata_atomic(uuid,timestamp with time zone,jsonb)',
    'public.magazine_publish_atomic(uuid)'
  ] LOOP
    FOREACH role_name IN ARRAY ARRAY['anon', 'authenticated', 'service_role'] LOOP
      IF has_function_privilege(role_name, signature, 'EXECUTE') THEN
        RAISE EXCEPTION 'Magazine legacy RPC still executable by %: %', role_name, signature;
      END IF;
    END LOOP;
  END LOOP;

  FOREACH signature IN ARRAY ARRAY[
    'public.magazine_create_v2(uuid,text,text)',
    'public.magazine_update_metadata_v2(uuid,bigint,jsonb)',
    'public.magazine_add_items_v2(uuid,bigint,jsonb)',
    'public.magazine_remove_items_v2(uuid,bigint,uuid[])',
    'public.magazine_reorder_items_v2(uuid,bigint,uuid[])',
    'public.magazine_update_item_v2(uuid,bigint,uuid,jsonb)',
    'public.magazine_publish_v2(uuid,bigint)',
    'public.magazine_unpublish_v2(uuid,bigint)',
    'public.magazine_archive_v2(uuid,bigint)',
    'public.magazine_reactivate_v2(uuid,bigint)',
    'public.magazine_soft_delete_v2(uuid,bigint)',
    'public.magazine_restore_v2(uuid,bigint)',
    'public.magazine_duplicate_v2(uuid,bigint,text,text)',
    'public.magazine_import_local_v2(text,jsonb)'
  ] LOOP
    IF has_function_privilege('anon', signature, 'EXECUTE') THEN
      RAISE EXCEPTION 'Magazine v2 RPC unexpectedly executable by anon: %', signature;
    END IF;
  END LOOP;

  FOREACH role_name IN ARRAY ARRAY['anon', 'authenticated', 'service_role'] LOOP
    IF has_table_privilege(role_name, 'public.magazines', 'INSERT,UPDATE,DELETE,TRUNCATE')
       OR has_table_privilege(role_name, 'public.magazine_items', 'INSERT,UPDATE,DELETE,TRUNCATE') THEN
      RAISE EXCEPTION 'Magazine RPC-only contract still exposes DML to %', role_name;
    END IF;
  END LOOP;

  IF NOT has_table_privilege('authenticated', 'public.magazines', 'SELECT')
     OR NOT has_table_privilege('authenticated', 'public.magazine_items', 'SELECT')
     OR NOT has_table_privilege('service_role', 'public.magazines', 'SELECT')
     OR NOT has_table_privilege('service_role', 'public.magazine_items', 'SELECT') THEN
    RAISE EXCEPTION 'Magazine RPC-only contract removed required SELECT privileges';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_policy p
    JOIN pg_class c ON c.oid = p.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname IN ('magazines', 'magazine_items')
      AND p.polcmd IN ('*', 'a', 'w', 'd')
      AND (
        p.polroles = ARRAY[0::oid]
        OR (SELECT oid FROM pg_roles WHERE rolname = 'authenticated') = ANY(p.polroles)
      )
  ) THEN
    RAISE EXCEPTION 'Magazine RPC-only contract retains mutable authenticated policy';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname IN ('magazines', 'magazine_items')
      AND NOT c.relrowsecurity
  ) THEN
    RAISE EXCEPTION 'Magazine RPC-only contract requires RLS on both tables';
  END IF;
END
$contract$;
