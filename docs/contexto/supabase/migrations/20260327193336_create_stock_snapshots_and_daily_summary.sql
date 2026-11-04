-- ============================================================
-- MÓDULO: HISTÓRICO DE ESTOQUE & PREÇO (FORNECEDOR)
-- Camada 1: stock_snapshots (efêmera, retenção 14 dias)
-- Camada 2: stock_daily_summary (permanente)
-- ============================================================

-- CAMADA 1: SNAPSHOTS BRUTOS
-- Captura cada mudança de estoque ou preço em variant_supplier_sources
-- Usa bigint sequencial (não UUID) para performance em alto volume
CREATE TABLE IF NOT EXISTS stock_snapshots (
  id              bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  
  -- Referências (desnormalizadas para query rápida)
  variant_supplier_source_id uuid NOT NULL REFERENCES variant_supplier_sources(id) ON DELETE CASCADE,
  supplier_id     uuid NOT NULL REFERENCES suppliers(id),
  supplier_branch_id uuid REFERENCES supplier_branches(id),
  variant_id      uuid NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
  product_id      uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  
  -- Estoque - Armazém Principal
  stock_main_old  integer,
  stock_main_new  integer,
  stock_main_delta integer GENERATED ALWAYS AS (stock_main_new - stock_main_old) STORED,
  
  -- Estoque - Outros Armazéns
  stock_other_old integer,
  stock_other_new integer,
  stock_other_delta integer GENERATED ALWAYS AS (stock_other_new - stock_other_old) STORED,
  
  -- Estoque Total (calculado)
  stock_total_old integer GENERATED ALWAYS AS (COALESCE(stock_main_old, 0) + COALESCE(stock_other_old, 0)) STORED,
  stock_total_new integer GENERATED ALWAYS AS (COALESCE(stock_main_new, 0) + COALESCE(stock_other_new, 0)) STORED,
  
  -- Preço de Custo
  cost_price_old  numeric(12,4),
  cost_price_new  numeric(12,4),
  cost_price_delta numeric(12,4) GENERATED ALWAYS AS (cost_price_new - cost_price_old) STORED,
  
  -- Tipo de mudança capturada
  change_type     varchar(20) NOT NULL DEFAULT 'stock',
  -- 'stock' = só estoque mudou
  -- 'price' = só preço mudou  
  -- 'both'  = estoque E preço mudaram
  
  -- Metadata
  captured_at     timestamptz NOT NULL DEFAULT now(),
  sync_source     varchar(50) DEFAULT 'n8n'
);

-- Índices otimizados para queries analíticas
CREATE INDEX idx_snapshots_vss_captured 
  ON stock_snapshots (variant_supplier_source_id, captured_at DESC);

CREATE INDEX idx_snapshots_supplier_captured 
  ON stock_snapshots (supplier_id, captured_at DESC);

CREATE INDEX idx_snapshots_product_captured 
  ON stock_snapshots (product_id, captured_at DESC);

CREATE INDEX idx_snapshots_captured_at 
  ON stock_snapshots (captured_at DESC);

CREATE INDEX idx_snapshots_change_type 
  ON stock_snapshots (change_type, captured_at DESC);

-- Comentário na tabela
COMMENT ON TABLE stock_snapshots IS 'Camada 1: Snapshots brutos de mudanças de estoque e preço dos fornecedores. Retenção: 14 dias. Capturado automaticamente via trigger em variant_supplier_sources.';


-- ============================================================
-- CAMADA 2: RESUMO DIÁRIO (PERMANENTE)
-- ============================================================

CREATE TABLE IF NOT EXISTS stock_daily_summary (
  id              bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  
  -- Referências (desnormalizadas)
  variant_supplier_source_id uuid NOT NULL REFERENCES variant_supplier_sources(id) ON DELETE CASCADE,
  supplier_id     uuid NOT NULL REFERENCES suppliers(id),
  supplier_branch_id uuid REFERENCES supplier_branches(id),
  variant_id      uuid NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
  product_id      uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  
  -- Data do resumo
  summary_date    date NOT NULL,
  
  -- Estoque Total (main + other consolidado)
  stock_open      integer,         -- Primeiro registro do dia
  stock_close     integer,         -- Último registro do dia
  stock_min       integer,         -- Mínimo do dia
  stock_max       integer,         -- Máximo do dia
  net_change      integer,         -- stock_close - stock_open
  
  -- Movimentação detalhada
  units_depleted  integer DEFAULT 0,   -- Soma de deltas negativos (saídas)
  units_restocked integer DEFAULT 0,   -- Soma de deltas positivos (entradas)
  
  -- Detecção de reabastecimento
  restock_detected boolean DEFAULT false,
  restock_quantity integer DEFAULT 0,   -- Quantidade estimada de reabastecimento
  restock_count   smallint DEFAULT 0,   -- Quantos restocks no dia
  
  -- Preço do dia
  cost_price_open  numeric(12,4),   -- Preço no início do dia
  cost_price_close numeric(12,4),   -- Preço no fim do dia
  price_changed    boolean DEFAULT false,
  
  -- Metadata
  sync_count      smallint DEFAULT 0,  -- Quantas capturas no dia
  created_at      timestamptz NOT NULL DEFAULT now(),
  
  -- Constraint: um registro por variante/fornecedor/dia
  CONSTRAINT uq_stock_daily_vss_date UNIQUE (variant_supplier_source_id, summary_date)
);

-- Índices para análise temporal
CREATE INDEX idx_daily_vss_date 
  ON stock_daily_summary (variant_supplier_source_id, summary_date DESC);

CREATE INDEX idx_daily_supplier_date 
  ON stock_daily_summary (supplier_id, summary_date DESC);

CREATE INDEX idx_daily_product_date 
  ON stock_daily_summary (product_id, summary_date DESC);

CREATE INDEX idx_daily_date 
  ON stock_daily_summary (summary_date DESC);

CREATE INDEX idx_daily_restock 
  ON stock_daily_summary (restock_detected, summary_date DESC) 
  WHERE restock_detected = true;

COMMENT ON TABLE stock_daily_summary IS 'Camada 2: Resumo diário de movimentação de estoque e preço por variante/fornecedor. Retenção permanente. Gerado automaticamente por job noturno via pg_cron.';
