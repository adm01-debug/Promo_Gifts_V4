-- Revogar acesso anon de get_promo_sales_ranking (dados de vendas internos)
REVOKE EXECUTE ON FUNCTION public.get_promo_sales_ranking()
  FROM anon;

-- Verificar também get_catalog_bestseller_page — dados do catálogo são públicos, OK para anon
-- (mantém anon para catálogo público mas loga aviso de que é chamada não-autenticada)
