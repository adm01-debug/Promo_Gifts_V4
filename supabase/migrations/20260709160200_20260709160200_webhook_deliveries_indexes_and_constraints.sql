CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_webhook_id ON public.webhook_deliveries(webhook_id);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_hash_success ON public.webhook_deliveries(payload_hash) WHERE success=true AND payload_hash IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_webhook_time ON public.webhook_deliveries(webhook_id, delivered_at DESC NULLS LAST);
ALTER TABLE public.outbound_webhooks ALTER COLUMN signature_header SET DEFAULT 'x-webhook-signature';
ALTER TABLE public.outbound_webhooks ALTER COLUMN contract_version SET NOT NULL;
