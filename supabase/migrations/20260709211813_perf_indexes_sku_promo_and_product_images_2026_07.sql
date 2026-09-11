
-- ═══════════════════════════════════════════════════════════════════
-- MIGRATION: perf_indexes_sku_promo_and_product_images_2026_07
-- 
-- Gaps identificados na Auditoria Master v5 (Battery M07):
-- 1. products.sku_promo não tem index → seq scan em cada lookup por SKU
-- 2. product_images não tem composite index para o padrão de join mais
--    frequente: WHERE product_id=X AND is_primary=true AND cf_sync_status='verified'
-- 3. product_images não tem index em cf_verified_at → slow pipeline queries
--
-- Impacto: cada busca por sku_promo (ex: Admin, Carrinhos, Audit queries)
-- fazia sequential scan em 7244+ linhas. Cada join de image fetch
-- precisava escanear todos os registros do produto.
-- ═══════════════════════════════════════════════════════════════════

-- 1. UNIQUE INDEX em products(sku_promo)
-- Pré-validado: 0 nulls, 0 duplicatas
-- Benefício: lookup por SKU passa de O(n) para O(log n)
CREATE UNIQUE INDEX IF NOT EXISTS idx_products_sku_promo
  ON products (sku_promo)
  WHERE sku_promo IS NOT NULL;

-- 2. Composite INDEX em product_images para o padrão de join primário
-- Padrão: JOIN product_images ON product_id=X WHERE is_primary=true AND cf_sync_status='verified'
-- Partial index: só registros ativos (is_active=true) para reduzir tamanho
CREATE INDEX IF NOT EXISTS idx_product_images_primary_verified
  ON product_images (product_id, is_primary, cf_sync_status)
  WHERE is_active = true;

-- 3. INDEX em product_images(cf_verified_at)
-- Usado em queries de pipeline: WHERE cf_verified_at >= NOW() - INTERVAL '5 minutes'
CREATE INDEX IF NOT EXISTS idx_product_images_cf_verified_at
  ON product_images (cf_verified_at)
  WHERE cf_sync_status = 'verified' AND is_active = true;

-- 4. INDEX em product_images(cf_sync_status) + produto ativo
-- Padrão: WHERE cf_sync_status='pending' AND is_active=true (pipeline queries)
-- Verificar se já não existe um mais genérico
CREATE INDEX IF NOT EXISTS idx_product_images_status_active
  ON product_images (cf_sync_status)
  WHERE is_active = true;
;
