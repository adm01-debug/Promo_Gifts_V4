-- ============================================================
-- ROLLBACK da migration 20261121223000_add_supplier_external_id.sql
--
-- Remove as duas colunas criadas pela migration (products e product_variants).
-- O backfill a partir de supplier_products_raw.raw_data->>'IdProduto' vai junto
-- com as colunas; reaplicar a migration reconstitue o valor.
--
-- ATENCAO: a view public.v_compras_catalogo referencia p.supplier_external_id
-- na versao da migration 20261121223100. Se aquele delta de view tiver sido
-- aplicado, este rollback falha por dependencia — reverta a view antes.
-- ============================================================

alter table public.product_variants drop column if exists supplier_external_id;
alter table public.products drop column if exists supplier_external_id;