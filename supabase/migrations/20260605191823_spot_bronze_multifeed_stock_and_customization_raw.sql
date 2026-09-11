-- ════════ SPOT BRONZE — landing multi-feed (produto + estoque + gravação) ════════
-- Produto continua em supplier_products_raw.raw_data (OptionalsComplete) via insert_supplier_product_raw.
-- Estoque: mesmo grão do SKU -> colunas dedicadas (trilha independente do produto).
-- Gravação: catálogo-wide -> companheira supplier_customization_raw (grão = table_code_option).

-- 1) ESTOQUE no bronze (metadata-only: defaults constantes/nullable, sem rewrite)
ALTER TABLE public.supplier_products_raw
  ADD COLUMN IF NOT EXISTS stock_data         jsonb,
  ADD COLUMN IF NOT EXISTS stock_hash         text,
  ADD COLUMN IF NOT EXISTS stock_status       supplier_raw_status NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS stock_synced_at    timestamptz,
  ADD COLUMN IF NOT EXISTS stock_processed_at timestamptz;

COMMENT ON COLUMN public.supplier_products_raw.stock_data IS
  'Feed Stocks cru deste SKU (Quantity, NextQuantity1..6/NextDate1..6, Country). Mesmo grao da variante; trilha independente: NAO polui raw_data nem content_hash do produto.';
COMMENT ON COLUMN public.supplier_products_raw.stock_status IS
  'Trilha Bronze->Gold do estoque (independente de status). RPC reseta p/ pending quando stock_hash muda.';
COMMENT ON COLUMN public.supplier_products_raw.stock_hash IS
  'sha256(stock_data) mantido pela RPC upsert_supplier_stock_raw (coluna plana de proposito p/ evitar rewrite da tabela).';

CREATE INDEX IF NOT EXISTS idx_spr_stock_pending
  ON public.supplier_products_raw (supplier_id, stock_synced_at)
  WHERE stock_status <> 'processed';

-- 2) GRAVAÇÃO catálogo-wide -> companheira no Bronze
CREATE TABLE IF NOT EXISTS public.supplier_customization_raw (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id        uuid NOT NULL REFERENCES public.suppliers(id) ON DELETE RESTRICT,
  table_code         text NOT NULL,
  table_code_option  text NOT NULL,
  customization_type text,
  raw_data           jsonb NOT NULL CHECK (jsonb_typeof(raw_data) = 'object'),
  content_hash       text NOT NULL
                       GENERATED ALWAYS AS (encode(digest(raw_data::text,'sha256'),'hex')) STORED,
  status             supplier_raw_status NOT NULL DEFAULT 'pending',
  source_channel     text NOT NULL DEFAULT 'n8n',
  import_batch_id    uuid REFERENCES public.supplier_import_batches(id) ON DELETE SET NULL,
  imported_at        timestamptz NOT NULL DEFAULT now(),
  processed_at       timestamptz,
  process_errors     jsonb,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_scr_supplier_option UNIQUE (supplier_id, table_code_option)
);
COMMENT ON TABLE public.supplier_customization_raw IS
  'Bronze (layer) das tabelas de preco de gravacao por fornecedor. Grao = table_code_option (catalogo-wide, ~289 p/ SPOT). Aplicabilidade por SKU ja vive em supplier_products_raw.raw_data (CustomizationTables/Area1/TableCodes1...).';

CREATE INDEX IF NOT EXISTS idx_scr_unprocessed
  ON public.supplier_customization_raw (supplier_id, imported_at)
  WHERE status <> 'processed';

-- 3) RPCs de gravação (idempotentes; reset p/ 'pending' só quando o hash muda)
CREATE OR REPLACE FUNCTION public.upsert_supplier_stock_raw(
  p_supplier_id uuid, p_supplier_reference text, p_stock_data jsonb,
  p_import_batch_id uuid DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SET search_path TO 'public','extensions' AS $$
DECLARE v_id uuid; v_hash text;
BEGIN
  v_hash := encode(digest(p_stock_data::text,'sha256'),'hex');
  INSERT INTO supplier_products_raw
    (supplier_id, supplier_reference, supplier_sku, raw_data,
     stock_data, stock_hash, stock_synced_at, status, import_batch_id)
  VALUES
    (p_supplier_id, p_supplier_reference, p_supplier_reference, '{}'::jsonb,
     p_stock_data, v_hash, now(), 'skipped'::supplier_raw_status, p_import_batch_id)
  ON CONFLICT (supplier_id, supplier_reference) DO UPDATE SET
     stock_data      = EXCLUDED.stock_data,
     stock_hash      = v_hash,
     stock_synced_at = now(),
     import_batch_id = COALESCE(EXCLUDED.import_batch_id, supplier_products_raw.import_batch_id),
     stock_status    = CASE WHEN supplier_products_raw.stock_hash IS DISTINCT FROM v_hash
                            THEN 'pending'::supplier_raw_status ELSE supplier_products_raw.stock_status END,
     updated_at      = now()
  RETURNING id INTO v_id;
  RETURN v_id;
END $$;
COMMENT ON FUNCTION public.upsert_supplier_stock_raw(uuid,text,jsonb,uuid) IS
  'Grava feed Stocks na linha do SKU (trilha stock_*). Stub status=skipped se o produto ainda nao existir; reset stock_status->pending so quando o estoque muda.';

CREATE OR REPLACE FUNCTION public.upsert_supplier_customization_raw(
  p_supplier_id uuid, p_table_code_option text, p_raw_data jsonb,
  p_table_code text DEFAULT NULL, p_customization_type text DEFAULT NULL,
  p_import_batch_id uuid DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SET search_path TO 'public','extensions' AS $$
DECLARE v_id uuid; v_hash text;
BEGIN
  v_hash := encode(digest(p_raw_data::text,'sha256'),'hex');
  INSERT INTO supplier_customization_raw
    (supplier_id, table_code, table_code_option, customization_type, raw_data, import_batch_id)
  VALUES (p_supplier_id,
          COALESCE(p_table_code, regexp_replace(p_table_code_option, '-[^-]+$', '')),
          p_table_code_option, p_customization_type, p_raw_data, p_import_batch_id)
  ON CONFLICT (supplier_id, table_code_option) DO UPDATE SET
     raw_data           = EXCLUDED.raw_data,
     customization_type = COALESCE(EXCLUDED.customization_type, supplier_customization_raw.customization_type),
     import_batch_id    = COALESCE(EXCLUDED.import_batch_id, supplier_customization_raw.import_batch_id),
     status             = CASE WHEN supplier_customization_raw.content_hash IS DISTINCT FROM v_hash
                               THEN 'pending'::supplier_raw_status ELSE supplier_customization_raw.status END,
     updated_at         = now()
  RETURNING id INTO v_id;
  RETURN v_id;
END $$;
COMMENT ON FUNCTION public.upsert_supplier_customization_raw(uuid,text,jsonb,text,text,uuid) IS
  'Grava feed CustomizationTables (grao = table_code_option). Idempotente por content_hash.';

-- 4) Hardening (espelha o padrão do bronze)
ALTER TABLE public.supplier_customization_raw ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.supplier_customization_raw FROM anon, authenticated;
GRANT  ALL ON public.supplier_customization_raw TO service_role;
REVOKE EXECUTE ON FUNCTION public.upsert_supplier_stock_raw(uuid,text,jsonb,uuid)                   FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.upsert_supplier_customization_raw(uuid,text,jsonb,text,text,uuid) FROM anon, authenticated;;
