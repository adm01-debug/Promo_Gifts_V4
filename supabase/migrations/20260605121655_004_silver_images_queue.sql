
-- ============================================================
-- TABELA 4: silver_images_queue
-- Fila de imagens: download do fornecedor → upload CDN Cloudflare
-- ============================================================
CREATE TABLE IF NOT EXISTS silver_images_queue (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Origem
  silver_product_id    UUID NOT NULL REFERENCES silver_products(id) ON DELETE CASCADE,
  silver_variant_id    UUID REFERENCES silver_variants(id) ON DELETE CASCADE,
  supplier_id          UUID NOT NULL REFERENCES suppliers(id),

  -- URL de origem (API do fornecedor)
  source_url           TEXT NOT NULL,

  -- Destino Gold
  gold_image_id        UUID REFERENCES product_images(id) ON DELETE SET NULL,
  cloudflare_image_id  VARCHAR(100),
  url_cdn              TEXT,

  -- Tipo: gallery | main | area | component | box | lifestyle
  image_type           TEXT NOT NULL DEFAULT 'gallery',
  component_ref        TEXT,
  display_order        INTEGER DEFAULT 0,
  is_primary           BOOLEAN DEFAULT false,

  -- Metadados (preenchidos após download)
  width_px             INTEGER,
  height_px            INTEGER,
  file_size_bytes      BIGINT,
  format               VARCHAR(10),

  -- Pipeline: pending → downloading → validating → uploading → done | failed
  img_status           TEXT NOT NULL DEFAULT 'pending',
  img_error            TEXT,
  attempts             INTEGER NOT NULL DEFAULT 0,
  last_attempt_at      TIMESTAMPTZ,

  is_active            BOOLEAN NOT NULL DEFAULT true,

  -- Auditoria
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_siq_silver_product_id ON silver_images_queue(silver_product_id);
CREATE INDEX IF NOT EXISTS idx_siq_silver_variant_id ON silver_images_queue(silver_variant_id);
CREATE INDEX IF NOT EXISTS idx_siq_img_status        ON silver_images_queue(img_status);
CREATE INDEX IF NOT EXISTS idx_siq_pending           ON silver_images_queue(img_status) WHERE img_status = 'pending';
CREATE INDEX IF NOT EXISTS idx_siq_source_url        ON silver_images_queue(source_url);

COMMENT ON TABLE silver_images_queue IS
  'Camada Silver — fila de imagens. '
  'img_status: pending → downloading → validating → uploading → done | failed. '
  'Após done, gold_image_id aponta para product_images no Gold.';

-- ============================================================
-- TRIGGER: updated_at automático para todas as tabelas Silver
-- ============================================================
CREATE OR REPLACE FUNCTION fn_silver_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DO $$
DECLARE tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'silver_products', 'silver_variants',
    'silver_print_areas', 'silver_images_queue'
  ] LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS trg_silver_updated_at ON %I; '
      'CREATE TRIGGER trg_silver_updated_at '
      'BEFORE UPDATE ON %I '
      'FOR EACH ROW EXECUTE FUNCTION fn_silver_set_updated_at();',
      tbl, tbl
    );
  END LOOP;
END $$;
;
