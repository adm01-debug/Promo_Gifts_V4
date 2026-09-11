
-- ═══════════════════════════════════════════════════════════════════════
-- M4-ext: REVOGAR authenticated de funções SECURITY DEFINER deprecated
-- que ficaram de fora do scope original do M4 (20260626130134).
--
-- Escopo:
--   fn_process_raw_v2         — DEFINER, deprecated 2026-06-05, 0 cron, 0 referências ativas
--   fn_sm_to_silver            — DEFINER, deprecated 2026-06-05, 0 cron, 0 refs ativas
--   process_supplier_product   — DEFINER, deprecated 2026-06-05, 0 cron, 0 refs ativas
--   fn_trigger_auto_sync_dimensions — trigger function, deprecated 2026-06-06, authenticated é no-op
--
-- Impacto:
--   authenticated NÃO pode mais chamar estas funções via PostgREST/RPC.
--   service_role (n8n/VPS) mantém acesso intacto.
--   Wrappers que as chamam internamente (ex: process_supplier_products_batch)
--   têm acl={postgres, service_role} — NÃO são chamáveis por authenticated → não quebram.
--
-- Idempotente: REVOKE de grant inexistente é no-op.
--
-- ANTI-REGRESSÃO (Lovable bot): NÃO reconceder EXECUTE a authenticated
-- nestas funções. São candidatas a DROP após confirmação via track_functions.
-- fix_version=2026-06-26_m4_ext_secdef_deprecated
-- ═══════════════════════════════════════════════════════════════════════

REVOKE EXECUTE ON FUNCTION public.fn_process_raw_v2(uuid, integer, boolean) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_sm_to_silver(uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.process_supplier_product(uuid, jsonb, text) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_trigger_auto_sync_dimensions() FROM authenticated;

-- Auto-validação: confirmar que authenticated foi removido de todas as 4
DO $$
DECLARE
  v_fn text;
  v_has_auth boolean;
BEGIN
  FOR v_fn IN
    SELECT p.proname
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public'
      AND p.proname IN ('fn_process_raw_v2','fn_sm_to_silver','process_supplier_product','fn_trigger_auto_sync_dimensions')
  LOOP
    SELECT EXISTS (
      SELECT 1
      FROM pg_proc p2
      JOIN pg_namespace n2 ON n2.oid=p2.pronamespace
      CROSS JOIN LATERAL aclexplode(COALESCE(p2.proacl, acldefault('f', p2.proowner))) ace
      WHERE n2.nspname='public' AND p2.proname=v_fn
        AND ace.privilege_type='EXECUTE'
        AND ace.grantee = (SELECT oid FROM pg_roles WHERE rolname='authenticated')
    ) INTO v_has_auth;

    IF v_has_auth THEN
      RAISE EXCEPTION 'FALHA VALIDAÇÃO: % ainda tem EXECUTE para authenticated', v_fn;
    END IF;
  END LOOP;

  RAISE NOTICE 'M4-ext OK: 4/4 funções sem authenticated EXECUTE';
END $$;

NOTIFY pgrst, 'reload schema';
;
