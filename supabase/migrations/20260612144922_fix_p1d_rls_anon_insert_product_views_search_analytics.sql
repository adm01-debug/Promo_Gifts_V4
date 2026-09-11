
-- Permitir que usuários anônimos (visitantes não-logados) registrem:
-- 1) Visualizações de produtos (product_views)
-- 2) Buscas realizadas (search_analytics)
-- Ambas com seller_id/user_id = NULL (identificador nulo para anon)

-- Política para product_views (anon pode inserir com seller_id=NULL)
CREATE POLICY "anon_can_insert_product_views"
  ON public.product_views
  FOR INSERT TO anon
  WITH CHECK (seller_id IS NULL);

-- Política para search_analytics (anon pode inserir com user_id=NULL)
CREATE POLICY "anon_can_insert_search_analytics"
  ON public.search_analytics
  FOR INSERT TO anon
  WITH CHECK (user_id IS NULL);

-- Grant de EXECUTE para anon nas funções de log/analytics
-- (fn_log_search_analytics já é SECURITY DEFINER então não precisa)
-- Verificar grants atuais
GRANT EXECUTE ON FUNCTION public.fn_log_search_analytics(text, integer, text, integer)
  TO anon;
;
