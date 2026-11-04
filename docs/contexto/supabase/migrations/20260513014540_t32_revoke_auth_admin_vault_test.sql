-- T32: REVOKE authenticated from admin-only, vault, test-utility, and
-- security-internal SECURITY DEFINER functions.
-- These must never be callable by regular authenticated users.
-- Idempotent: REVOKE on missing grant = no-op.

DO $$
BEGIN
  -- Internal helper (leading underscore = private convention)
  REVOKE EXECUTE ON FUNCTION public._get_user_primary_role(uuid)            FROM authenticated;

  -- Admin audit tools (not frontend RPCs)
  REVOKE EXECUTE ON FUNCTION public.audit_ownership_orphans(text)           FROM authenticated;
  REVOKE EXECUTE ON FUNCTION public.audit_rls_coverage()                    FROM authenticated;
  REVOKE EXECUTE ON FUNCTION public.audit_rls_matrix()                      FROM authenticated;
  REVOKE EXECUTE ON FUNCTION public.check_hardening_status()                FROM authenticated;
  REVOKE EXECUTE ON FUNCTION public.check_telemetry_regression()            FROM authenticated;

  -- IP/geo security service (called by edge functions, not frontend)
  REVOKE EXECUTE ON FUNCTION public.block_ip_temp(text, text, integer)      FROM authenticated;
  REVOKE EXECUTE ON FUNCTION public.check_auth_throttling(text, text)       FROM authenticated;
  REVOKE EXECUTE ON FUNCTION public.check_geo_country_allowed(text)         FROM authenticated;
  REVOKE EXECUTE ON FUNCTION public.check_ip_access(text)                   FROM authenticated;
  REVOKE EXECUTE ON FUNCTION public.check_owner_email(uuid)                 FROM authenticated;
  REVOKE EXECUTE ON FUNCTION public.fn_check_geo_access(text)               FROM authenticated;
  REVOKE EXECUTE ON FUNCTION public.unblock_ip(text)                        FROM authenticated;

  -- Admin user management (superadmin actions, never end-user)
  REVOKE EXECUTE ON FUNCTION public.clear_auth_attempts(text)               FROM authenticated;
  REVOKE EXECUTE ON FUNCTION public.clear_user_token_revocations(uuid)      FROM authenticated;
  REVOKE EXECUTE ON FUNCTION public.execute_role_migration_batch(text, text, jsonb, boolean) FROM authenticated;
  REVOKE EXECUTE ON FUNCTION public.force_logout_all_users()                FROM authenticated;
  REVOKE EXECUTE ON FUNCTION public.force_user_logout(uuid)                 FROM authenticated;
  REVOKE EXECUTE ON FUNCTION public.grant_mcp_full_to_user(uuid, text)      FROM authenticated;
  REVOKE EXECUTE ON FUNCTION public.ownership_repair(uuid, boolean)         FROM authenticated;
  REVOKE EXECUTE ON FUNCTION public.reset_optimization_queue(boolean)       FROM authenticated;
  REVOKE EXECUTE ON FUNCTION public.reset_user_step_up_state(uuid)          FROM authenticated;
  REVOKE EXECUTE ON FUNCTION public.revoke_all_user_tokens(uuid)            FROM authenticated;
  REVOKE EXECUTE ON FUNCTION public.revoke_mcp_full_from_user(uuid)         FROM authenticated;

  -- Internal security event logging (called by service_role/triggers, not frontend)
  REVOKE EXECUTE ON FUNCTION public.log_full_scope_grant(text, uuid, text, uuid, uuid, text, boolean, timestamp with time zone, inet, text, text, jsonb) FROM authenticated;
  REVOKE EXECUTE ON FUNCTION public.lookup_request_id(text)                 FROM authenticated;
  REVOKE EXECUTE ON FUNCTION public.mcp_audit_violation(uuid, text, jsonb)  FROM authenticated;

  -- Vault functions — CRITICAL: secrets must never be accessible by authenticated
  REVOKE EXECUTE ON FUNCTION public.vault_delete_secret(text)               FROM authenticated;
  REVOKE EXECUTE ON FUNCTION public.vault_get_secret(text)                  FROM authenticated;
  REVOKE EXECUTE ON FUNCTION public.vault_list_secret_names()               FROM authenticated;
  REVOKE EXECUTE ON FUNCTION public.vault_set_secret(text, text, text)      FROM authenticated;

  -- Test-only utility (should never exist in production with user access)
  REVOKE EXECUTE ON FUNCTION public.seed_discount_test_users()              FROM authenticated;
  REVOKE EXECUTE ON FUNCTION public.e2e_cleanup_check_rate_limit(text, integer, integer) FROM authenticated;

  RAISE NOTICE 'T32 complete: authenticated revoked from admin/vault/test functions.';

EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'T32 partial error: %', SQLERRM;
END;
$$;
