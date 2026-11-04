-- Harden anon attack surface: revoke EXECUTE from anon/PUBLIC on internal
-- SECURITY DEFINER functions that have NO unauthenticated caller (verified in
-- app code + edge functions). Explicit authenticated/service_role grants are
-- preserved, so the admin UI (smoke tests) and service-role edge functions
-- (send-digest, send-notification) keep working. Public/pre-auth RPCs
-- (check_login_rate_limit, enforce_password_reset_rate_limit,
-- get_quote_token_by_value, submit_quote_response) are intentionally NOT touched.
REVOKE EXECUTE ON FUNCTION public.fn_run_and_persist_smoke_tests() FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_dnd_active(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.send_digest_notification(uuid, uuid[], integer) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.sync_user_org_to_org_members() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.validate_edge_functions_base_url(text) FROM PUBLIC, anon;
