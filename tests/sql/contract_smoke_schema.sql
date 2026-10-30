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

-- Tabela products: necessária para product-webhook edge function (upsert + select + soft-delete).
-- Colunas mapeadas 1-to-1 com NormalizedProduct em supabase/functions/product-webhook/index.ts.
CREATE TABLE IF NOT EXISTS public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sku text NOT NULL,
  name text NOT NULL DEFAULT '',
  description text,
  sale_price numeric,
  min_quantity integer NOT NULL DEFAULT 1,
  category_id uuid,
  supplier_id uuid,
  brand text,
  stock_quantity integer NOT NULL DEFAULT 0,
  is_stockout boolean NOT NULL DEFAULT false,
  sync_status text NOT NULL DEFAULT 'synced',
  is_kit boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  is_featured boolean NOT NULL DEFAULT false,
  is_new boolean NOT NULL DEFAULT false,
  is_on_sale boolean NOT NULL DEFAULT false,
  is_deleted boolean NOT NULL DEFAULT false,
  deleted_at timestamptz,
  images text[] NOT NULL DEFAULT ARRAY[]::text[],
  videos jsonb NOT NULL DEFAULT '[]'::jsonb,
  colors jsonb NOT NULL DEFAULT '[]'::jsonb,
  materials text[] NOT NULL DEFAULT ARRAY[]::text[],
  tags jsonb NOT NULL DEFAULT '{}'::jsonb,
  schema_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_sync_at timestamptz,
  UNIQUE (sku)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.products TO service_role;

-- Tabela product_sync_logs: necessária para product-webhook (insert no início + update no fim).
-- Colunas mapeadas ao schema canônico em supabase/baseline/20261015140000_baseline_schema.sql.
CREATE TABLE IF NOT EXISTS public.product_sync_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  records_processed integer NOT NULL DEFAULT 0,
  records_inserted integer NOT NULL DEFAULT 0,
  records_updated integer NOT NULL DEFAULT 0,
  records_failed integer NOT NULL DEFAULT 0,
  duration_ms integer,
  payload jsonb,
  error_message text,
  triggered_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  products_received integer DEFAULT 0,
  products_created integer DEFAULT 0,
  products_updated integer DEFAULT 0,
  products_failed integer DEFAULT 0,
  completed_at timestamptz
);

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.product_sync_logs TO service_role;

NOTIFY pgrst, 'reload schema';
