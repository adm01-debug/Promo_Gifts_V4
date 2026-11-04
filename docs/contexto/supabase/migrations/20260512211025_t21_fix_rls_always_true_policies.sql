ALTER POLICY "app_vitals_insert_any" ON public.app_vitals
  WITH CHECK (user_id = auth.uid());

ALTER POLICY "eventos_insert_service_role" ON public.cotacao_eventos
  TO service_role
  WITH CHECK (true);

CREATE POLICY "eventos_insert_authenticated" ON public.cotacao_eventos
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

ALTER POLICY "search_logs_write" ON public.product_search_logs
  WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY "pra_insert_authenticated" ON public.produto_ramo_atividade;

CREATE POLICY "pra_insert_service_role" ON public.produto_ramo_atividade
  FOR INSERT TO service_role
  WITH CHECK (true);

COMMENT ON POLICY "pra_insert_service_role" ON public.produto_ramo_atividade IS
  'Only service_role may create product-ramo links (admin operation). WITH CHECK (true) is intentional: service_role bypasses RLS entirely. T21 Phase 2 — 2026-05.';

ALTER POLICY "query_telemetry_insert_any" ON public.query_telemetry
  WITH CHECK (user_id = auth.uid());

DROP POLICY "wdm_insert_any" ON public.webhook_delivery_metrics;

CREATE POLICY "wdm_insert_service_role" ON public.webhook_delivery_metrics
  FOR INSERT TO service_role
  WITH CHECK (true);

COMMENT ON POLICY "wdm_insert_service_role" ON public.webhook_delivery_metrics IS
  'webhook_delivery_metrics rows are written exclusively by the webhook-dispatcher edge function via service_role. WITH CHECK (true) is safe: service_role bypasses RLS. T21 Phase 2 — 2026-05.';

ALTER POLICY "Authenticated can insert notifications" ON public.workspace_notifications
  WITH CHECK (user_id = auth.uid());
