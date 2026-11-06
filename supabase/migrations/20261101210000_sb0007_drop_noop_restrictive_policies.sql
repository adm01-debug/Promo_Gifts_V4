-- SB-0007: DROP das 10 policies rls_restrictive_* USING (true) — código morto
-- Severidade: MÉDIO | Tipo: SEGURANÇA (reclassificado de INVÁLIDO para INTENCIONAL/removível)
-- Evidência: pg_policies WHERE policyname LIKE 'rls_restrictive%' AND qual = 'true' → 10 rows
-- Análise: RESTRICTIVE policies com USING(true) são semanticamente no-op (sempre passam, não restringem).
--   Cada tabela tem policies PERMISSIVE próprias que controlam o acesso real.
--   Estas policies não causam vulnerabilidade mas são dead code — confusão potencial e overhead.
-- ROLLBACK: recriar cada uma como RESTRICTIVE USING (true) — trivial, sem efeito funcional.
--
-- art_file_attachments NÃO tem rls_restrictive_*, portanto não está nesta lista.

DROP POLICY IF EXISTS rls_restrictive_ai_usage_quotas      ON public.ai_usage_quotas;
DROP POLICY IF EXISTS rls_restrictive_kit_collaborators     ON public.kit_collaborators;
DROP POLICY IF EXISTS rls_restrictive_notification_preferences ON public.notification_preferences;
DROP POLICY IF EXISTS rls_restrictive_product_ai_content    ON public.product_ai_content;
DROP POLICY IF EXISTS rls_restrictive_product_fiscal        ON public.product_fiscal;
DROP POLICY IF EXISTS rls_restrictive_product_seo           ON public.product_seo;
DROP POLICY IF EXISTS rls_restrictive_product_supply        ON public.product_supply;
DROP POLICY IF EXISTS rls_restrictive_push_subscriptions    ON public.push_subscriptions;
DROP POLICY IF EXISTS rls_restrictive_recently_viewed_products ON public.recently_viewed_products;
DROP POLICY IF EXISTS rls_restrictive_system_kill_switches  ON public.system_kill_switches;
