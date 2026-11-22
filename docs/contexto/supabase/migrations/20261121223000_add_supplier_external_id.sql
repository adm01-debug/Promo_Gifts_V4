-- PR 1.3 do plano PIM/Promo Supply V2: identidade do produto no fornecedor (D-2(A))
--
-- Rollback: supabase/rollbacks/20261121223000_rollback.sql (dropa as 2 colunas;
-- o backfill é perdido com elas — reaplicar a migration o reconstitui).
-- Verificado em produção (21/11/2026): supplier_products_raw tem 14035 linhas com
-- raw_data->>'IdProduto', das quais 14035/14035 com product_id e 14031/14035 com
-- variant_id preenchidos -- o backfill usa esse join direto, sem match por nome/sku.

alter table public.products add column if not exists supplier_external_id text

alter table public.product_variants add column if not exists supplier_external_id text

with src_products as (
  select distinct on (product_id) product_id, raw_data->>'IdProduto' as id_produto
  from public.supplier_products_raw
  where raw_data ? 'IdProduto'
  order by product_id, imported_at desc
)
update public.products p
set supplier_external_id = src_products.id_produto
from src_products
where src_products.product_id = p.id
  and p.supplier_external_id is distinct from src_products.id_produto

with src_variants as (
  select distinct on (variant_id) variant_id, raw_data->>'IdProduto' as id_produto
  from public.supplier_products_raw
  where raw_data ? 'IdProduto' and variant_id is not null
  order by variant_id, imported_at desc
)
update public.product_variants v
set supplier_external_id = src_variants.id_produto
from src_variants
where src_variants.variant_id = v.id
  and v.supplier_external_id is distinct from src_variants.id_produto
