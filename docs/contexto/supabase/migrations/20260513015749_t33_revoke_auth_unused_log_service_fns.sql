-- T33: REVOKE authenticated from 9 additional SECURITY DEFINER functions that
-- are never called directly by the frontend (authenticated users).
-- These are called via service_role (edge functions) or are unused by any caller.
-- Idempotent: REVOKE on missing grant = no-op.

DO $$
BEGIN
  -- Not called from frontend; called via service_role admin client in edge functions
  REVOKE EXECUTE ON FUNCTION public.record_mcp_access_violation(uuid, text, text, text, uuid, text, text, text, jsonb)
    FROM authenticated;
  REVOKE EXECUTE ON FUNCTION public.register_ai_routing_decision(text, uuid, uuid[], uuid[], jsonb, uuid, uuid, integer, integer, text, uuid, text)
    FROM authenticated;

  -- Not found in any frontend, edge function, or DB caller code
  REVOKE EXECUTE ON FUNCTION public.rate_limit_check(text, text, integer, integer)
    FROM authenticated;
  REVOKE EXECUTE ON FUNCTION public.record_app_vital(text, double precision, text, text, text, text, uuid)
    FROM authenticated;
  REVOKE EXECUTE ON FUNCTION public.log_audit(text, text, text, jsonb)
    FROM authenticated;
  REVOKE EXECUTE ON FUNCTION public.log_login_attempt(text, boolean, uuid, text, text, text)
    FROM authenticated;
  REVOKE EXECUTE ON FUNCTION public.log_step_up_audit(text, step_up_action, jsonb)
    FROM authenticated;
  REVOKE EXECUTE ON FUNCTION public.log_voice_command(text, text, boolean, jsonb)
    FROM authenticated;
  REVOKE EXECUTE ON FUNCTION public.record_auth_attempt(text, text, boolean, text, text)
    FROM authenticated;

  RAISE NOTICE 'T33 complete: authenticated revoked from 9 unused/service-role functions.';

EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'T33 partial error: %', SQLERRM;
END;
$$;
