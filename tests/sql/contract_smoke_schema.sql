-- Minimal local-only schema for `.github/workflows/contract-tests.yml`.
--
-- The contract smoke deliberately boots Supabase without the production
-- migration history because that history contains operations on hosted,
-- managed objects that cannot be replayed by the local owner. These tables
-- are only the dependencies reached before the three HTTP contracts can
-- return their documented status codes. This file is never a production
-- migration and must never be applied to the canonical project.

CREATE TABLE IF NOT EXISTS public.webhook_request_nonces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL,
  nonce text NOT NULL,
  request_timestamp timestamptz NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source, nonce)
);

CREATE TABLE IF NOT EXISTS public.inbound_webhook_endpoints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  source_system text NOT NULL DEFAULT 'contract-smoke',
  hmac_secret_ref text,
  allowed_events text[] NOT NULL DEFAULT ARRAY[]::text[],
  allowed_ips text[] NOT NULL DEFAULT ARRAY[]::text[],
  is_active boolean NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS public.outbound_webhooks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  url text NOT NULL,
  secret_ref text,
  events text[] NOT NULL DEFAULT ARRAY[]::text[],
  active boolean NOT NULL DEFAULT true,
  contract_version text NOT NULL DEFAULT 'v1'
);

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
  public.webhook_request_nonces,
  public.inbound_webhook_endpoints,
  public.outbound_webhooks
TO service_role;

NOTIFY pgrst, 'reload schema';
