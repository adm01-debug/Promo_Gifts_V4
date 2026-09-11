
-- =============================================================
-- UTILITÁRIO: fn_normalize_product_name
-- Camada: Silver (Prata) — padronização de nomes de produto
-- Regras:
--   1. NULL → NULL (STRICT — não explode, apenas passa adiante)
--   2. Remove espaços duplos internos
--   3. Faz TRIM de espaços nas extremidades
--   4. Converte tudo para MAIÚSCULO (suporta UTF-8 / acentos PT-BR)
-- Propriedades:
--   IMMUTABLE   → resultado idêntico para entrada idêntica (seguro para índices)
--   STRICT      → retorna NULL quando a entrada é NULL (zero overhead com NULL)
--   PARALLEL SAFE → pode ser usado em queries paralelas sem restrição
-- =============================================================
CREATE OR REPLACE FUNCTION public.fn_normalize_product_name(p_nome TEXT)
RETURNS TEXT
LANGUAGE SQL
IMMUTABLE
STRICT
PARALLEL SAFE
SET search_path = public
AS $$
    SELECT UPPER(
               TRIM(
                   REGEXP_REPLACE(p_nome, '\s+', ' ', 'g')
               )
           )
$$;

COMMENT ON FUNCTION public.fn_normalize_product_name(TEXT) IS
'Normaliza nome de produto para a camada Silver:
 remove espaços duplos, faz TRIM e converte para MAIÚSCULO.
 STRICT: retorna NULL se a entrada for NULL.
 Aplicada em fn_standardize_raw (campo name) e no backfill de Silver/Gold.';
;
