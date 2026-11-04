ALTER TABLE public.inbound_webhook_events ADD COLUMN IF NOT EXISTS contract_version text NOT NULL DEFAULT '1';
