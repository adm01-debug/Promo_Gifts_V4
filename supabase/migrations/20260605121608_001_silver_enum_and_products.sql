
-- ============================================================
-- Silver Layer — Parte 1: ENUM + silver_products
-- ============================================================

-- ENUM do pipeline Silver
DO $$ BEGIN
  CREATE TYPE silver_norm_status AS ENUM (
    'raw',
    'normalizing',
    'normalized',
    'validated',
    'rejected',
    'promoted'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- TABELA 1: silver_products
-- Produto normalizado — 1 linha por (supplier_id, supplier_reference)
-- ============================================================
CREATE TABLE IF NOT EXISTS silver_products (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id      UUID NOT NULL DEFAULT '5db5aee1-064b-4ef4-9193-345dcd8274ea',

  -- Origem (Bronze)
  supplier_id          UUID NOT NULL REFERENCES suppliers(id),
  bronze_id            UUID REFERENCES supplier_products_raw(id),
  import_batch_id      UUID REFERENCES supplier_import_batches(id),

  -- Chaves
  supplier_reference   TEXT NOT NULL,
  internal_reference   TEXT,

  -- Destino Gold (NULL até fn_silver_to_gold)
  gold_product_id      UUID REFERENCES products(id) ON DELETE SET NULL,

  -- Identificação
  name                 TEXT NOT NULL,
  short_description    VARCHAR(500),
  description          TEXT,
  brand                VARCHAR(100),

  -- Dimensões produto (TUDO EM CM — regra imutável)
  length_cm            NUMERIC(8,2),
  width_cm             NUMERIC(8,2),
  height_cm            NUMERIC(8,2),
  diameter_cm          NUMERIC(8,2),
  weight_g             NUMERIC(9,2),
  capacity_ml          INTEGER,

  -- Caixa (TUDO EM CM)
  box_length_cm        NUMERIC(8,2),
  box_width_cm         NUMERIC(8,2),
  box_height_cm        NUMERIC(8,2),
  box_weight_kg        NUMERIC(8,3),
  box_quantity         INTEGER,
  box_inner_quantity   INTEGER,

  -- Fiscal
  ncm_code             VARCHAR(10),
  ipi_rate             NUMERIC(5,2),
  origin_country       VARCHAR(50),

  -- Produto
  min_order_quantity   INTEGER DEFAULT 1,
  lead_time_days       INTEGER,
  supply_mode          VARCHAR(40) DEFAULT 'pronta_entrega_liso',
  is_textil            BOOLEAN DEFAULT false,
  is_thermal           BOOLEAN DEFAULT false,
  is_imported          BOOLEAN DEFAULT true,
  gender               VARCHAR(10),
  has_colors           BOOLEAN DEFAULT false,
  has_sizes            BOOLEAN DEFAULT false,
  has_capacity         BOOLEAN DEFAULT false,

  -- Embalagem
  packing_type         VARCHAR(100),
  repacking_type       VARCHAR(100),

  -- Mapeamentos canônicos
  norm_category_id     UUID REFERENCES categories(id),
  norm_material_id     UUID REFERENCES material_types(id),

  -- Metadados do fornecedor
  supplier_updated_at  TIMESTAMPTZ,
  is_active            BOOLEAN NOT NULL DEFAULT true,
  is_deleted           BOOLEAN NOT NULL DEFAULT false,

  -- Pipeline
  norm_status          silver_norm_status NOT NULL DEFAULT 'raw',
  norm_errors          JSONB NOT NULL DEFAULT '[]',
  norm_warnings        JSONB NOT NULL DEFAULT '[]',
  norm_confidence      NUMERIC(4,3) DEFAULT 0,
  normalized_by        TEXT DEFAULT 'system',
  normalized_at        TIMESTAMPTZ,
  validated_at         TIMESTAMPTZ,
  promoted_at          TIMESTAMPTZ,

  -- Auditoria
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Unicidade por fornecedor
  UNIQUE (supplier_id, supplier_reference)
);

CREATE INDEX IF NOT EXISTS idx_sp_supplier_id     ON silver_products(supplier_id);
CREATE INDEX IF NOT EXISTS idx_sp_bronze_id       ON silver_products(bronze_id);
CREATE INDEX IF NOT EXISTS idx_sp_gold_product_id ON silver_products(gold_product_id);
CREATE INDEX IF NOT EXISTS idx_sp_norm_status     ON silver_products(norm_status);
CREATE INDEX IF NOT EXISTS idx_sp_is_active       ON silver_products(is_active) WHERE is_active = true;

COMMENT ON TABLE silver_products IS
  'Camada Silver — produto normalizado por fornecedor. '
  'Regra: todas dimensões em CM. 1 linha por (supplier_id, supplier_reference). '
  'FK gold_product_id = NULL até promoção via fn_silver_to_gold().';
;
