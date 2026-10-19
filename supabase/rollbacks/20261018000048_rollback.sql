-- Rollback de E047 lote 2: remove policies RESTRICTIVE das 5 tabelas PII
DROP POLICY IF EXISTS "rls_restrictive_notification_preferences" ON public.notification_preferences;
DROP POLICY IF EXISTS "rls_restrictive_push_subscriptions" ON public.push_subscriptions;
DROP POLICY IF EXISTS "rls_restrictive_recently_viewed_products" ON public.recently_viewed_products;
DROP POLICY IF EXISTS "rls_restrictive_kit_collaborators" ON public.kit_collaborators;
DROP POLICY IF EXISTS "rls_restrictive_ai_usage_quotas" ON public.ai_usage_quotas;
