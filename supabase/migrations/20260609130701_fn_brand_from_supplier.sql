
-- ══════════════════════════════════════════════════════════════
-- PASSO 1: fn_brand_from_supplier
-- Retorna o nome canônico do supplier para uso como brand.
-- STABLE (lê tabela, mas mesma transação = mesmo resultado).
-- STRICT → NULL se supplier_id for NULL.
-- ══════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.fn_brand_from_supplier(p_supplier_id uuid)
RETURNS text
LANGUAGE sql
STABLE
STRICT
PARALLEL SAFE
SET search_path = public
AS $$
    SELECT name FROM public.suppliers WHERE id = p_supplier_id LIMIT 1;
$$;

COMMENT ON FUNCTION public.fn_brand_from_supplier(uuid) IS
'Retorna o nome do supplier como brand canônico do produto.
 Regra: brand = nome do fornecedor para todos os produtos.
 Usada em fn_standardize_raw para garantir preenchimento permanente na Silver.';
;
