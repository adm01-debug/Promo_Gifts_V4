
-- Criar índice composto para o filtro principal de fn_generate_trends_insights
-- (seller_id, created_at DESC) cobre: WHERE seller_id=X AND created_at>=Y
CREATE INDEX IF NOT EXISTS idx_product_views_seller_created
  ON public.product_views(seller_id, created_at DESC);

-- Criar também índice para product_id + created_at (usado em get_trending_products)
CREATE INDEX IF NOT EXISTS idx_product_views_pid_created
  ON public.product_views(product_id, created_at DESC);
;
