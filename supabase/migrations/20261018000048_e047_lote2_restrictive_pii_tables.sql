-- P200-E047 lote 2: RESTRICTIVE em 5 tabelas com dados PII/sensíveis
-- Tabelas: notification_preferences, push_subscriptions, recently_viewed_products,
--          kit_collaborators, ai_usage_quotas
-- Com RESTRICTIVE TO authenticated, service_role USING(true), qualquer policy
-- PERMISSIVE futura só pode ampliar acesso para authenticated/service_role —
-- nunca para anon ou roles não listados. Mesma convenção do lote 1 (E047).

BEGIN;

DROP POLICY IF EXISTS "rls_restrictive_notification_preferences" ON public.notification_preferences;
CREATE POLICY "rls_restrictive_notification_preferences"
  ON public.notification_preferences
  AS RESTRICTIVE FOR ALL
  TO authenticated, service_role
  USING (true);

DROP POLICY IF EXISTS "rls_restrictive_push_subscriptions" ON public.push_subscriptions;
CREATE POLICY "rls_restrictive_push_subscriptions"
  ON public.push_subscriptions
  AS RESTRICTIVE FOR ALL
  TO authenticated, service_role
  USING (true);

DROP POLICY IF EXISTS "rls_restrictive_recently_viewed_products" ON public.recently_viewed_products;
CREATE POLICY "rls_restrictive_recently_viewed_products"
  ON public.recently_viewed_products
  AS RESTRICTIVE FOR ALL
  TO authenticated, service_role
  USING (true);

DROP POLICY IF EXISTS "rls_restrictive_kit_collaborators" ON public.kit_collaborators;
CREATE POLICY "rls_restrictive_kit_collaborators"
  ON public.kit_collaborators
  AS RESTRICTIVE FOR ALL
  TO authenticated, service_role
  USING (true);

DROP POLICY IF EXISTS "rls_restrictive_ai_usage_quotas" ON public.ai_usage_quotas;
CREATE POLICY "rls_restrictive_ai_usage_quotas"
  ON public.ai_usage_quotas
  AS RESTRICTIVE FOR ALL
  TO authenticated, service_role
  USING (true);

COMMIT;
