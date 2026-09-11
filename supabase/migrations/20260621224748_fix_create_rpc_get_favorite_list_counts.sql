
-- ============================================================
-- FIX #3: Cria RPC get_favorite_list_counts
-- Resolve HTTP 404 no endpoint /rest/v1/rpc/get_favorite_list_counts
--
-- Retorna a contagem de itens por lista de favoritos do usuário
-- autenticado atual. SECURITY DEFINER + auth.uid() garante que
-- cada usuário vê SOMENTE suas próprias listas.
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_favorite_list_counts()
RETURNS TABLE (
  list_id    uuid,
  item_count bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    fl.id          AS list_id,
    COUNT(fi.id)::bigint AS item_count
  FROM favorite_lists fl
  LEFT JOIN favorite_items fi ON fi.list_id = fl.id
  WHERE fl.user_id = (SELECT auth.uid())
    AND fl.is_archived = false  -- não conta listas arquivadas
  GROUP BY fl.id
  ORDER BY fl.position ASC NULLS LAST, fl.created_at ASC;
$$;

-- Apenas authenticated (anon não tem listas)
GRANT EXECUTE ON FUNCTION public.get_favorite_list_counts()
  TO authenticated;

COMMENT ON FUNCTION public.get_favorite_list_counts() IS
  'Retorna list_id + contagem de itens para todas as listas de favoritos ativas do usuário autenticado. SECURITY DEFINER: cada usuário vê somente suas próprias listas.';

NOTIFY pgrst, 'reload schema';
;
