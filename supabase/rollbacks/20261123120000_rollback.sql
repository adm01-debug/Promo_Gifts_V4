-- Rollback: 20261123120000_revoke_variante_anon_grants.sql
-- Restaura os grants (reverte para o estado pos 20261122200000).

grant select on public.v_compras_precos_variante to anon;
grant select on public.variant_supplier_sources to anon;
grant select on public.markup_configurations to anon;
grant select (default_markup_percent) on public.suppliers to anon;
