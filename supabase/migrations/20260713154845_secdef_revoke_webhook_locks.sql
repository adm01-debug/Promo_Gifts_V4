-- ============================================================================
-- Revoke SECURITY DEFINER EXECUTE from PUBLIC/anon/authenticated
-- Keep EXECUTE for service_role only (edge functions & cron)
-- ============================================================================

BEGIN;

-- 1) claim_webhook_delivery — atomic delivery lock, chamada só em edge
REVOKE EXECUTE ON FUNCTION public.claim_webhook_delivery(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.claim_webhook_delivery(uuid, text) TO service_role;

-- 2) release_webhook_delivery_lock — libera lock após entrega
REVOKE EXECUTE ON FUNCTION public.release_webhook_delivery_lock(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.release_webhook_delivery_lock(uuid, text) TO service_role;

-- 3) cleanup_stale_webhook_locks — limpeza de locks expirados (cron)
REVOKE EXECUTE ON FUNCTION public.cleanup_stale_webhook_locks() FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.cleanup_stale_webhook_locks() TO service_role;

COMMIT;;
