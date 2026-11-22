-- Migration: 20261122180000_restore_definer_views_p06_e_compras.sql
-- Rollback: supabase/rollbacks/20261122180000_rollback.sql
--
-- CAUSA-RAIZ (medida em produção, projeto doufsxqlfjyuvxuezpln, 2026-11-22):
--   A 20261118172500_security_invoker_views_p06_parcial.sql ligou security_invoker=true em 5
--   views públicas justificando "toda base que elas leem é alcançável por anon — RLS ligada e
--   policy de SELECT para anon". Policy não substitui GRANT: com security_invoker=true a query
--   roda como `anon` e o PostgREST barra por falta de GRANT SELECT na TABELA (42501) antes de
--   chegar na RLS. Das 5, 4 quebraram; sobreviveram v_product_tags_public e
--   v_product_properties_public porque suas bases já tinham GRANT de tabela.
--
--   Prova via PostgREST com a anon key, antes desta migration:
--     v_suppliers_public                        -> 401 42501 permission denied for table suppliers
--     v_kit_component_media_public              -> 401 42501 ... table product_kit_components
--     v_product_compositions_public             -> 401 42501 ... materialized view mv_product_compositions
--     v_tabela_preco_gravacao_oficial_public    -> 401 42501 ... table tabela_preco_gravacao_oficial
--     v_compras_catalogo                        -> 401 42501 ... table products
--     v_compras_precos_faixa                    -> 401 42501 ... table product_customization_prices
--     v_compras_precos_variante                 -> 401 42501 ... view vw_variant_sale_prices
--
-- POR QUE A CORREÇÃO É VOLTAR PARA DEFINER, E NÃO CONCEDER GRANT — já adjudicado no repo:
--   A adjudicação de 2026-11-17 (supabase/MIGRATIONS_SYNC_LOG.md, seção "P06 / A-V01") mediu
--   view por view e concluiu que, nas 7 bloqueadas, o "fix" do A-V01 exigiria re-expor ao `anon`
--   a tabela-base que a view mascara, sem ganhar segurança — e em 3 quebra comportamento medido:
--     * v_suppliers_public  -> GRANT em `suppliers` exporia api_credentials/email/phone/cnpj ao anon
--     * v_variant_sale_prices_public -> GRANT exigiria expor cost_price_1..5 + markup_percent
--                              e zeraria o INNER JOIN (20592 -> 0 linhas) por policy org-scoped
--     * v_kit_component_media_public -> GRANT faria anon ler toda a tabela-base, inclusive
--                              componentes de produto inativo que a view esconde
--     * v_product_compositions_public -> o GRANT entregaria 8312 linhas, 434 de produto inativo
--     * v_product_tags_public -> 72 de 86 usuários logados veriam 0 linhas
--   A própria 20260717114423_fix_security_invoker_regression_suppliers_and_stock_velocity.sql
--   registra "NAO reintroduzir security_invoker=on nestas views", e 4 das 8 têm COMMENT ON VIEW
--   com proibição textual. A 20261118172500 contrariou essa decisão sem medir o efeito em anon.
--   Portanto: voltar as 4 para security_invoker=false (SECURITY DEFINER) é a correção alinhada
--   ao padrão do repo — views consumidas por `anon` expõem contrato fechado de colunas e rodam
--   com privilégio do dono. É exatamente o que .security/public-views-columns.json assere
--   ("as 8 views SECURITY DEFINER expostas ao anon").
--
--   As 3 views de compras (20261122100000) nasceram com security_invoker=on e falham pelo mesmo
--   motivo. Também não podem ser resolvidas por GRANT: o hook
--   Promo_Supply_V2/src/hooks/useCatalogoPim.ts exige cost_price/sale_price/suggested_price
--   (PimProduto) e unit_cost/unit_price (PimPrecoFaixa), e conceder SELECT em `products` para
--   anon exporia a tabela inteira sem o recorte da view.
--
-- ANTI-REGRESSAO: NAO religar security_invoker=true nestas views sem antes conceder os GRANTs e
--   medir linha a linha com `SET ROLE anon` — foi exatamente essa omissão que gerou os 401.

-- ---------------------------------------------------------------------------------------------
-- 1) Views públicas quebradas pela 20261118172500 (volta ao estado de antes dela)
-- ---------------------------------------------------------------------------------------------
alter view public.v_suppliers_public set (security_invoker = false);
alter view public.v_kit_component_media_public set (security_invoker = false);
alter view public.v_product_compositions_public set (security_invoker = false);
alter view public.v_tabela_preco_gravacao_oficial_public set (security_invoker = false);

-- ---------------------------------------------------------------------------------------------
-- 2) Views de compras (20261122100000) — read-path do bridge PIM -> Promo Supply V2
-- ---------------------------------------------------------------------------------------------
alter view public.v_compras_catalogo set (security_invoker = false);
alter view public.v_compras_precos_faixa set (security_invoker = false);
alter view public.v_compras_precos_variante set (security_invoker = false);

-- ---------------------------------------------------------------------------------------------
-- 3) Post-check na mesma transação: falha fechada se alguma view continuar em invoker=true.
--    reloptions é a fonte de verdade do atributo (pg_class.reloptions).
-- ---------------------------------------------------------------------------------------------
do $$
declare
  r record;
  invoker_ligado text := '';
begin
  for r in
    select c.relname
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public'
       and c.relkind = 'v'
       and c.relname in (
         'v_suppliers_public',
         'v_kit_component_media_public',
         'v_product_compositions_public',
         'v_tabela_preco_gravacao_oficial_public',
         'v_compras_catalogo',
         'v_compras_precos_faixa',
         'v_compras_precos_variante'
       )
       and coalesce(array_to_string(c.reloptions, ','), '') ilike '%security_invoker=true%'
  loop
    invoker_ligado := invoker_ligado || ' ' || r.relname;
  end loop;

  if invoker_ligado <> '' then
    raise exception 'security_invoker=true ainda ligado apos a migration:%', invoker_ligado;
  end if;
end $$;

-- ---------------------------------------------------------------------------------------------
-- 4) Refresca a guarda textual nas 4 views do P06 (a 20261118172500 nao a removeu, mas o texto
--    precisa refletir a nova decisao para o proximo agente nao repetir o erro).
-- ---------------------------------------------------------------------------------------------
comment on view public.v_suppliers_public is
  'Fornecedores publicos (SECURITY DEFINER, security_invoker=false). Contrato fechado de colunas: NAO expoe api_credentials/api_key/api_token/password/email/phone/cnpj/api_base_url/default_markup_percent. NAO religar security_invoker=true: anon nao tem GRANT SELECT em suppliers e a view responderia 401 42501 (regressao de 2026-11-22, revertida pela 20261122180000).';

comment on view public.v_kit_component_media_public is
  'Midias de componentes de kit (SECURITY DEFINER). NAO religar security_invoker=true: sem GRANT SELECT em product_kit_components o anon recebe 401 42501, e com GRANT passaria a ler componentes de produto inativo que esta view esconde. Regressao de 2026-11-22 revertida pela 20261122180000.';

comment on view public.v_product_compositions_public is
  'Composicoes de produto (SECURITY DEFINER). Cadeia de 2 niveis ate analytics.mv_product_compositions, que nao tem GRANT SELECT para anon. NAO religar security_invoker=true. Regressao de 2026-11-22 revertida pela 20261122180000.';

comment on view public.v_tabela_preco_gravacao_oficial_public is
  'Tabela de preco de gravacao oficial (SECURITY DEFINER). NAO religar security_invoker=true nem re-expor a tabela base ao anon: exigiria GRANT em 37 colunas. Regressao de 2026-11-22 revertida pela 20261122180000.';

comment on view public.v_compras_catalogo is
  'Catalogo canônico para o bridge PIM -> Promo Supply V2 (SECURITY DEFINER). Projeta cost_price/sale_price/suggested_price de proposito: useCatalogoPim.ts consome esses campos para recompra. O recorte e a projecao + o WHERE, nao o GRANT. NAO religar security_invoker=true.';

comment on view public.v_compras_precos_faixa is
  'Faixas de preco por quantidade para o bridge PIM (SECURITY DEFINER). Projeta unit_cost/unit_price de proposito (PimPrecoFaixa). NAO religar security_invoker=true.';

comment on view public.v_compras_precos_variante is
  'Precos por variante para o bridge PIM (SECURITY DEFINER). Depende de vw_variant_sale_prices, que nao tem GRANT SELECT para anon. NAO religar security_invoker=true.';