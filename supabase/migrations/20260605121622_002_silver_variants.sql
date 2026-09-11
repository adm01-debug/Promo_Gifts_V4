
-- ============================================================
-- TABELA 2: silver_variants
-- Variante normalizada — 1 linha por (supplier_id, supplier_sku)
-- ============================================================
CREATE TABLE IF NOT EXISTS silver_variants (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Origem
  silver_product_id    UUID NOT NULL REFERENCES silver_products(id) ON DELETE CASCADE,
  supplier_id          UUID NOT NULL REFERENCES suppliers(id),
  bronze_id            UUID REFERENCES supplier_products_raw(id),

  -- Chave do fornecedor
  supplier_sku         VARCHAR(100) NOT NULL,

  -- Destino Gold
  gold_variant_id      UUID REFERENCES product_variants(id) ON DELETE SET NULL,

  -- Cor normalizada
  color_code           VARCHAR(30),
  color_name           TEXT,
  color_hex            VARCHAR(7),
  color_hex_secondary  VARCHAR(7),
  norm_color_id        UUID REFERENCES color_variations(id),

  -- Tamanho
  size_code            VARCHAR(20),
  size_name            TEXT,

  -- Estoque
  stock_quantity       INTEGER DEFAULT 0,
  stock_sp_quantity    INTEGER,
  next_restock_date    DATE,
  is_stockout          BOOLEAN DEFAULT false,

  -- Faixas de preço (até 10 níveis — padrão SPOT)
  min_qty_1            INTEGER,
  cost_price_1         NUMERIC(12,4),
  min_qty_2            INTEGER,
  cost_price_2         NUMERIC(12,4),
  min_qty_3            INTEGER,
  cost_price_3         NUMERIC(12,4),
  min_qty_4            INTEGER,
  cost_price_4         NUMERIC(12,4),
  min_qty_5            INTEGER,
  cost_price_5         NUMERIC(12,4),
  min_qty_6            INTEGER,
  cost_price_6         NUMERIC(12,4),
  min_qty_7            INTEGER,
  cost_price_7         NUMERIC(12,4),
  min_qty_8            INTEGER,
  cost_price_8         NUMERIC(12,4),
  min_qty_9            INTEGER,
  cost_price_9         NUMERIC(12,4),
  min_qty_10           INTEGER,
  cost_price_10        NUMERIC(12,4),

  primary_image_url    TEXT,

  -- Flags
  is_active            BOOLEAN NOT NULL DEFAULT true,
  norm_status          silver_norm_status NOT NULL DEFAULT 'raw',

  -- Auditoria
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (supplier_id, supplier_sku)
);

CREATE INDEX IF NOT EXISTS idx_sv_silver_product_id ON silver_variants(silver_product_id);
CREATE INDEX IF NOT EXISTS idx_sv_gold_variant_id   ON silver_variants(gold_variant_id);
CREATE INDEX IF NOT EXISTS idx_sv_norm_color_id     ON silver_variants(norm_color_id);
CREATE INDEX IF NOT EXISTS idx_sv_norm_status       ON silver_variants(norm_status);
CREATE INDEX IF NOT EXISTS idx_sv_is_active         ON silver_variants(is_active) WHERE is_active = true;

COMMENT ON TABLE silver_variants IS
  'Camada Silver — variante normalizada por fornecedor. '
  'Cor mapeada via color_equivalences. Faixas de preço até 10 níveis (padrão SPOT). '
  '1 linha por (supplier_id, supplier_sku).';
;
