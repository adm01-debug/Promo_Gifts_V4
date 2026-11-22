-- Migration: 20261122200000_fix_cadeia_views_compras_e_compositions.sql
-- Rollback: supabase/rollbacks/20261122200000_rollback.sql
--
-- CAUSA-RAIZ (medida ao vivo em producao, projeto doufsxqlfjyuvxuezpln, 2026-11-22,
-- via PostgREST com a anon key publica do bundle de producao): a 20261122180000 restaurou
-- security_invoker=false nas 7 views EXTERNAS, mas as 2 que continuam em 401 42501 leem uma
-- view INTERMEDIARIA que ficou em security_invoker=true. security_invoker NAO cascateia de
-- volta: o nivel invoker rebaixa o privilegio para o chamador e o 42501 estoura no objeto-base.
--   v_product_compositions_public -> 401 42501 permission denied for materialized view mv_product_compositions
--       cadeia: v_product_compositions_public -> public.mv_product_compositions (invoker=true)
--               -> analytics.mv_product_compositions (GRANT SELECT so authenticated/service_role)
--   v_compras_precos_variante     -> 401 42501 permission denied for table variant_supplier_sources
--       cadeia: v_compras_precos_variante -> public.vw_variant_sale_prices (invoker=true)
--               -> variant_supplier_sources / suppliers / markup_configurations
-- As outras 5 ja respondem 200 ao vivo: v_suppliers_public, v_kit_component_media_public,
-- v_tabela_preco_gravacao_oficial_public, v_compras_catalogo, v_compras_precos_faixa.
--
-- AS DUAS FALHAS NAO TEM A MESMA CORRECAO. Tratar as duas como "bota definer" quebraria a
-- decisao de seguranca da matview e furaria a RLS de custo. Detalhe por caso:
--
-- (A) public.mv_product_compositions -> security_invoker=false.
--     Nao existe saida por GRANT: analytics.mv_product_compositions concede SELECT apenas a
--     authenticated/service_role e matview NAO suporta RLS, logo grant a anon exporia as
--     linhas cruas de composicao, sem o recorte da view. Com definer a view interna roda como
--     postgres e o contrato exposto continua sendo o de .security/public-views-columns.json
--     (product_id, product_name, total_materials, total_percentage, materials_detail).
--     public.mv_product_compositions e VIEW sobre a matview analytics.* — nao rode REFRESH aqui.
--
-- (B) public.vw_variant_sale_prices -> NAO vira definer. Ela projeta cost_price_1..5 e
--     markup_percent; definer deixaria custo e markup legiveis sem RLS, furando a policy
--     org-scoped variant_stocks_select_org (RLS ligada em variant_supplier_sources) e a
--     proibicao explicita de custo em v_variant_sale_prices_public. A correcao certa e
--     privilegio MINIMO na cadeia, mantendo RLS e recorte por organizacao ativos.
--
--     Medido antes de decidir (nao teorico): v_compras_catalogo ja responde 200 a anon com
--     {"cost_price":4.34,"sale_price":9.33}, ou seja o custo de compra ja e publico nesta
--     familia de views por decisao da 20261122100000. Logo conceder SELECT em
--     variant_supplier_sources a anon nao inaugura vazamento novo: a RLS
--     variant_stocks_select_org usa auth.uid() e, para anon (NULL), retorna ZERO linhas.
--     O INNER JOIN com variant_supplier_sources entao devolve 0 linhas — a view passa a
--     responder 200 vazio em vez de 401, sem expor nada. O consumidor legitimo de custo e
--     autenticado (o Promo Supply V2 le via external-db-bridge, cuja allowlist autoriza
--     somente v_compras_catalogo e v_compras_precos_faixa — nenhuma delas tocada aqui).
--
--     Achado extra neste fix: a cadeia tambem esta quebrada para AUTHENTICATED, e nao so para
--     anon. suppliers concede SELECT apenas (id) e (name); o COALESCE da view usa
--     s.default_markup_percent, coluna sem GRANT para nenhum dos dois roles. Por isso o grant
--     de coluna abaixo vale para anon E authenticated.
--
-- ANTI-REGRESSAO: security_invoker nao cascateia. Antes de ligar invoker em qualquer view,
-- percorrer TODA a cadeia ate o objeto-base medindo de verdade (`SET ROLE anon` + select).

-- ---------------------------------------------------------------------------------------------
-- (A) Intermediaria do caminho de composicoes -> definer (justificativa acima)
-- ---------------------------------------------------------------------------------------------
alter view public.mv_product_compositions set (security_invoker = false);

comment on view public.mv_product_compositions is
  'VIEW publica sobre a matview analytics.mv_product_compositions (refresh CONCURRENTLY pelo cron 47, horario). public.mv_* e VIEW, nao matview - nao rode REFRESH aqui. SECURITY DEFINER desde 20261122200000 porque a matview-base nao concede SELECT a anon nem suporta RLS. NAO religar security_invoker=true.';

-- ---------------------------------------------------------------------------------------------
-- (B) Cadeia de precos por variante -> privilegio minimo, RLS preservada
--     (nao mexer em security_invoker desta view: ver justificativa no cabecalho)
-- ---------------------------------------------------------------------------------------------
grant select on table public.vw_variant_sale_prices to anon;
grant select on table public.variant_supplier_sources to anon;
grant select on table public.markup_configurations to anon;
grant select (default_markup_percent) on table public.suppliers to anon, authenticated;

-- ---------------------------------------------------------------------------------------------
-- Post-check na mesma transacao: falha fechada, uma assercao por causa raiz.
-- ---------------------------------------------------------------------------------------------
do $$
declare
  v_invoker text;
  v_faltando text := '';
  alvo record;
begin
  -- (A) a intermediaria nao pode continuar em invoker
  select coalesce(array_to_string(c.reloptions, ','), '')
    into v_invoker
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relname = 'mv_product_compositions';

  if v_invoker ilike '%security_invoker=true%' or v_invoker ilike '%security_invoker=on%' then
    raise exception 'mv_product_compositions continua com security_invoker ligado: %', v_invoker;
  end if;

  -- (B) anon precisa alcancar a cadeia inteira
  for alvo in
    select * from (values ('variant_supplier_sources'),
                          ('markup_configurations'),
                          ('vw_variant_sale_prices')) t(nome)
  loop
    if not has_table_privilege('anon', 'public.' || alvo.nome, 'select') then
      v_faltando := v_faltando || ' anon:' || alvo.nome;
    end if;
  end loop;

  -- a coluna que quebrava a cadeia para os DOIS roles
  if not has_column_privilege('anon', 'public.suppliers', 'default_markup_percent', 'select') then
    v_faltando := v_faltando || ' anon:suppliers.default_markup_percent';
  end if;
  if not has_column_privilege('authenticated', 'public.suppliers', 'default_markup_percent', 'select') then
    v_faltando := v_faltando || ' authenticated:suppliers.default_markup_percent';
  end if;

  if v_faltando <> '' then
    raise exception 'privilegio ausente apos a migration:%', v_faltando;
  end if;
end $$;
