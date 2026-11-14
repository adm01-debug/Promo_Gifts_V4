-- Rollback: supabase/rollbacks/20261114170845_rollback.sql
-- Achado P0 da auditoria exaustiva de 2026-11-14 (docs/AUDITORIA-EXAUSTIVA-2026-11-14.md):
-- a policy de INSERT viva em produção em workspace_notifications ainda é a versão fraca
-- de 20260622143055 ("Authenticated can insert notifications for valid users",
-- WITH CHECK (auth.uid() IS NOT NULL AND user_id IS NOT NULL)) — qualquer usuário
-- autenticado pode inserir notificação com o user_id de QUALQUER outro usuário
-- (spam/phishing cross-tenant), sem nem validar que o target existe.
--
-- A migration 20260622185000 já reapertava isso para WITH CHECK (user_id = auth.uid()),
-- mas, confirmado via pg_policies em produção (doufsxqlfjyuvxuezpln) em 2026-11-14,
-- nunca foi de fato aplicada — a policy viva continua sendo a de 20260622143055.
--
-- Verificado antes de reaplicar que nenhum caller legítimo quebra com o check estrito:
--   - src/hooks/bi/useSeasonalPeakNotifications.ts:71 e
--     src/lib/access/request-dev-access.ts:93 — os 2 únicos INSERTs diretos do
--     frontend — já usam user_id: user.id (auto-notificação).
--   - Edge functions (connections-health-check, comparison-price-watcher,
--     collections-watcher, favorites-watcher, send-transactional-email) usam
--     service_role → bypassam RLS, não afetadas.
--   - Notificação cross-user de aprovação de desconto roda via trigger
--     notify_discount_approval_request, SECURITY DEFINER (prosecdef=true,
--     confirmado em pg_proc) → bypassa a policy de authenticated, não afetada.
--   - fn_notify_user (criada em 20260622143055) continua disponível como caminho
--     SECURITY DEFINER para qualquer notificação cross-user legítima futura.

DROP POLICY IF EXISTS "Authenticated can insert notifications for valid users" ON public.workspace_notifications;

CREATE POLICY "Authenticated can insert own notifications"
ON public.workspace_notifications
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = (SELECT auth.uid())
);

NOTIFY pgrst, 'reload schema';
