-- Rollback: 20261101210000_sb0007_drop_noop_restrictive_policies.sql
-- Reconstroi as 10 policies RESTRICTIVE USING(true) removidas pela SB-0007.
-- Definicoes copiadas byte a byte de supabase/migrations-snapshot/SCHEMA_LIVE.sql
-- (snapshot de 2026-11-26, linhas 112832-112868) apenas para restaurar o estado
-- anterior. Sao no-op (sempre passam); recriar nao altera decisao de acesso.

CREATE POLICY "rls_restrictive_ai_usage_quotas" ON "public"."ai_usage_quotas" AS RESTRICTIVE TO "authenticated", "service_role" USING (true);
CREATE POLICY "rls_restrictive_kit_collaborators" ON "public"."kit_collaborators" AS RESTRICTIVE TO "authenticated", "service_role" USING (true);
CREATE POLICY "rls_restrictive_notification_preferences" ON "public"."notification_preferences" AS RESTRICTIVE TO "authenticated", "service_role" USING (true);
CREATE POLICY "rls_restrictive_product_ai_content" ON "public"."product_ai_content" AS RESTRICTIVE TO "authenticated", "service_role" USING (true);
CREATE POLICY "rls_restrictive_product_fiscal" ON "public"."product_fiscal" AS RESTRICTIVE TO "authenticated", "service_role" USING (true);
CREATE POLICY "rls_restrictive_product_seo" ON "public"."product_seo" AS RESTRICTIVE TO "authenticated", "service_role" USING (true);
CREATE POLICY "rls_restrictive_product_supply" ON "public"."product_supply" AS RESTRICTIVE TO "authenticated", "service_role" USING (true);
CREATE POLICY "rls_restrictive_push_subscriptions" ON "public"."push_subscriptions" AS RESTRICTIVE TO "authenticated", "service_role" USING (true);
CREATE POLICY "rls_restrictive_recently_viewed_products" ON "public"."recently_viewed_products" AS RESTRICTIVE TO "authenticated", "service_role" USING (true);
CREATE POLICY "rls_restrictive_system_kill_switches" ON "public"."system_kill_switches" AS RESTRICTIVE TO "authenticated", "service_role" USING (true);
