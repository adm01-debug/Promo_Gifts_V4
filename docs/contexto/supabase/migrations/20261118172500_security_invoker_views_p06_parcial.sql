-- Migration: 20261118172500_security_invoker_views_p06_parcial.sql
-- FASE B — P06 (resgate parcial): security_invoker=true nas views públicas em que isso é
-- comprovadamente seguro. Completa o trabalho da PR #3720, fechada sem merge, cuja versão
-- original (20261101000001_security_invoker_views_p06.sql) nunca chegou a produção.
-- Aprovado pelo PO (PR #2443 mergeada 2026-10-26 + autorização 2026-11-01), escopo reduzido
-- com a medição abaixo.
--
-- POR QUE O ESCOPO É MENOR QUE O DA #3720 — medido em 2026-11-18 no projeto canônico:
--   * v_products_public FICA DE FORA: ela lê internal.mv_product_leaf_category, e
--     information_schema.role_table_grants não tem NENHUMA linha de anon/authenticated para
--     essa matview (só USAGE no schema internal). Com security_invoker=true a leitura passa
--     a correr com os privilégios de quem chama, e TODO acesso público ao catálogo passaria
--     a falhar por permissão. Aplicar como estava derrubaria a vitrine.
--   * v_system_health_dashboard FICA DE FORA: depende de auth.users, pg_catalog.* e de
--     ai_enrichment_queue / stock_daily_summary / stock_snapshots / supplier_products_raw,
--     que não têm policy para anon. Com invoker, o painel quebra para todo papel que não
--     seja superusuário.
--   * v_product_properties_public já está com security_invoker=true; não entra.
--
-- AS 5 ABAIXO SÃO SEGURAS: toda base que elas leem é alcançável por anon —
--   product_kit_components, products, product_tags, tags, suppliers e
--   tabela_preco_gravacao_oficial têm RLS ligada e policy de SELECT para anon;
--   public.mv_product_compositions tem GRANT SELECT para anon e authenticated.
--
-- ROLLBACK: supabase/rollbacks/20261118172500_rollback.sql
--           (ALTER VIEW ... RESET (security_invoker) em cada uma das 5)

ALTER VIEW public.v_kit_component_media_public SET (security_invoker = true)

ALTER VIEW public.v_product_compositions_public SET (security_invoker = true)

ALTER VIEW public.v_product_tags_public SET (security_invoker = true)

ALTER VIEW public.v_suppliers_public SET (security_invoker = true)

ALTER VIEW public.v_tabela_preco_gravacao_oficial_public SET (security_invoker = true)
