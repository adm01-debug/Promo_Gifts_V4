-- Rollback: supabase/rollbacks/20261120013000_rollback.sql
--
-- Migration: products.ships_separately — produto "não mistura" no frete
--
-- Bloco D, etapa 31 do plano de frete de 19/11/2026. O motor (src/lib/freight)
-- recebe este flag por item: produto marcado vai sempre em caixa própria, e o
-- flag vence a escolha "misturar" do vendedor no orçamento.
--
-- Só adiciona uma coluna booleana com DEFAULT false: nenhuma linha existente
-- muda de comportamento e nenhuma view é recriada. As views que listam
-- products continuam com a lista de colunas que já tinham; se alguma delas
-- (ex.: v_products_public) precisar expor o flag, isso é uma migration à parte.
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS ships_separately boolean NOT NULL DEFAULT false

COMMENT ON COLUMN public.products.ships_separately IS
  'Vai sempre em caixa própria no frete: frágil, líquido, volumoso. Vence a escolha do vendedor.'
