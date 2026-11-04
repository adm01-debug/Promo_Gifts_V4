-- Add classification columns to products table
ALTER TABLE products ADD COLUMN IF NOT EXISTS auto_category TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS auto_material TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS classification_confidence FLOAT;
CREATE INDEX IF NOT EXISTS idx_products_auto_cat ON products(auto_category);
CREATE INDEX IF NOT EXISTS idx_products_auto_mat ON products(auto_material);

-- Product search log for analytics
CREATE TABLE IF NOT EXISTS product_search_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query TEXT NOT NULL,
  filters JSONB DEFAULT '{}',
  results_count INTEGER DEFAULT 0,
  latency_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE product_search_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "search_logs_read" ON product_search_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "search_logs_write" ON product_search_logs FOR INSERT TO authenticated WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_search_logs_query ON product_search_logs(query);
CREATE INDEX IF NOT EXISTS idx_search_logs_date ON product_search_logs(created_at DESC);
