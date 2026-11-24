-- Rollback: 20261124140000_close_anon_cost_surface.sql
--
-- Volta o estado de privilegios declarado pelo repositorio antes da migration
-- (equivalente ao que `20261122100000_compras_views_canonicas.sql` e os grants originais
-- deixavam). Nao reabre leitura real para `anon` por si so: continua valendo o
-- `WHERE can_view_all_sales()` das views de compras e a RLS das tabelas-base.
--
-- Aplicar via `db-apply-migration.yml` com aprovacao humana (Regra 8).

grant select on table public.v_compras_catalogo        to anon;
grant select on table public.v_compras_precos_faixa    to anon;
grant select on table public.v_compras_precos_variante to anon;
grant select on table public.variant_supplier_sources  to anon;
grant select on table public.markup_configurations     to anon;
grant select on table public.vw_variant_sale_prices    to anon;
grant select (default_markup_percent) on table public.suppliers to anon;
