-- ============================================================
-- SISTEMA DE GRUPOS DE SIMILARIDADE CROSS-SUPPLIER
-- ============================================================

-- TABELA 1: Grupos de similaridade
CREATE TABLE IF NOT EXISTS product_similarity_groups (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name             TEXT NOT NULL,
  category_id      UUID REFERENCES categories(id),
  material_family  TEXT NOT NULL,
  capacity_band    TEXT NOT NULL,
  capacity_min     INT,
  capacity_max     INT,
  match_criteria   JSONB DEFAULT '{}',
  match_source     TEXT NOT NULL DEFAULT 'automatic',
  is_active        BOOLEAN NOT NULL DEFAULT true,
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  UNIQUE(category_id, material_family, capacity_band)
);

-- TABELA 2: Membros dos grupos
CREATE TABLE IF NOT EXISTS product_similarity_group_members (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id              UUID NOT NULL REFERENCES product_similarity_groups(id) ON DELETE CASCADE,
  product_id            UUID NOT NULL REFERENCES products(id),
  supplier_id           UUID NOT NULL REFERENCES suppliers(id),
  is_reference_product  BOOLEAN NOT NULL DEFAULT false,
  similarity_score      NUMERIC(3,2) NOT NULL DEFAULT 1.00,
  match_source          TEXT NOT NULL DEFAULT 'automatic',
  notes                 TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  UNIQUE(group_id, product_id)
);

-- ÍNDICES DE PERFORMANCE
CREATE INDEX idx_psg_category ON product_similarity_groups(category_id);
CREATE INDEX idx_psg_material ON product_similarity_groups(material_family);
CREATE INDEX idx_psg_active ON product_similarity_groups(is_active) WHERE is_active = true;
CREATE INDEX idx_psgm_group ON product_similarity_group_members(group_id);
CREATE INDEX idx_psgm_product ON product_similarity_group_members(product_id);
CREATE INDEX idx_psgm_supplier ON product_similarity_group_members(supplier_id);

-- COMENTÁRIOS
COMMENT ON TABLE product_similarity_groups IS 'Grupos de produtos semelhantes cross-supplier. Cada grupo agrupa produtos de diferentes fornecedores com mesma família de material e faixa de capacidade.';
COMMENT ON TABLE product_similarity_group_members IS 'Membros dos grupos de similaridade. Derivam pares em product_relationships automaticamente.';
COMMENT ON COLUMN product_similarity_groups.material_family IS 'Família de material do corpo: ALUMINIO, INOX, PLASTICO, etc.';
COMMENT ON COLUMN product_similarity_groups.capacity_band IS 'Faixa de capacidade: ~400ml, ~500ml, ~600ml, ~700ml, ~800ml, ~1000ml, ~1200ml+';
