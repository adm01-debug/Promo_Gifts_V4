
-- ============================================================
-- TABELA 3: silver_print_areas
-- Área de gravação normalizada — componente + local + técnica
-- ============================================================
CREATE TABLE IF NOT EXISTS silver_print_areas (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Origem
  silver_product_id       UUID NOT NULL REFERENCES silver_products(id) ON DELETE CASCADE,
  supplier_id             UUID NOT NULL REFERENCES suppliers(id),

  -- Componente (SPOT: Component{1..8} | SM: 'PRODUTO' como padrão)
  component_code          TEXT NOT NULL DEFAULT 'PRODUTO',
  component_name          TEXT,
  component_order         INTEGER DEFAULT 1,

  -- Localização (SPOT: Location{1..8})
  location_code           TEXT NOT NULL,
  location_name           TEXT,
  location_order          INTEGER DEFAULT 1,

  -- Dimensões área (SEMPRE EM CM — SPOT vem em MM, ÷10)
  area_width_cm           NUMERIC(8,2),
  area_height_cm          NUMERIC(8,2),
  area_cm2                NUMERIC(10,2),
  is_curved               BOOLEAN DEFAULT false,
  shape                   TEXT DEFAULT 'rectangle',

  -- Técnica normalizada (via supplier_technique_mappings)
  norm_technique_code     TEXT REFERENCES tecnicas_gravacao(codigo),
  gold_tabela_preco_id    UUID REFERENCES tabela_preco_gravacao_oficial(id),

  -- Dados brutos (rastreabilidade)
  supplier_technique_raw  TEXT,
  supplier_location_raw   TEXT,
  supplier_table_code_raw TEXT,

  -- Parâmetros
  max_colors              INTEGER,
  is_default              BOOLEAN DEFAULT false,

  -- Flags e pipeline
  is_active               BOOLEAN NOT NULL DEFAULT true,
  norm_status             silver_norm_status NOT NULL DEFAULT 'raw',
  mapping_confidence      NUMERIC(4,3) DEFAULT 0,

  -- Auditoria
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_spa_silver_product_id    ON silver_print_areas(silver_product_id);
CREATE INDEX IF NOT EXISTS idx_spa_norm_technique_code  ON silver_print_areas(norm_technique_code);
CREATE INDEX IF NOT EXISTS idx_spa_gold_tabela_preco_id ON silver_print_areas(gold_tabela_preco_id);
CREATE INDEX IF NOT EXISTS idx_spa_norm_status          ON silver_print_areas(norm_status);
CREATE INDEX IF NOT EXISTS idx_spa_mapping_confidence   ON silver_print_areas(mapping_confidence);
CREATE INDEX IF NOT EXISTS idx_spa_product_location     ON silver_print_areas(silver_product_id, location_code);

COMMENT ON TABLE silver_print_areas IS
  'Camada Silver — área de gravação normalizada. '
  'Técnica mapeada via supplier_technique_mappings. '
  'Dimensões sempre em CM. SPOT: até 8 componentes × 8 localizações × 8 técnicas.';
;
