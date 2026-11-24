-- Migration: 20261124140000_close_anon_cost_surface.sql
-- Rollback: supabase/rollbacks/20261124140000_rollback.sql
--
-- QA etapas 002/003/004 assumidas do lote que ficou em branches de outro agente.
-- Recorte por CREDENCIAL (quem pode ler), nunca por COLUNA (o que a view projeta).
--
-- Estado medido no dump ao vivo `supabase/baseline/20261122200000_baseline_schema.sql`:
--
--   objeto                              | anon (GRANT)            | policy/clausula que barra o anon
--   ------------------------------------|-------------------------|-------------------------------------
--   v_compras_catalogo                  | so MAINTAIN             | WHERE can_view_all_sales() = false
--   v_compras_precos_faixa              | so MAINTAIN             | WHERE can_view_all_sales() = false
--   v_compras_precos_variante           | so MAINTAIN             | WHERE can_view_all_sales() = false
--   variant_supplier_sources            | SELECT                  | RLS por auth.uid() -> NULL -> 0 linhas
--   markup_configurations               | SELECT + escrita        | RLS sem policy p/ anon -> 0 linhas
--   vw_variant_sale_prices              | SELECT                  | invoker=true; vss barra -> 0 linhas
--   suppliers (col. default_markup_%)   | SELECT(coluna)          | RLS -> 0 linhas
--
-- Ou seja: hoje o anon NAO le custo/markup em nenhum desses objetos. O que o repositorio
-- declara, porem, e outra coisa:
--   * `20261122100000_compras_views_canonicas.sql` concedeu SELECT a `anon` nas 3 views de
--     compras; em producao isso ja foi revogado fora do repo. Num banco reconstruido pelas
--     migrations, a unica coisa entre o anon e o custo de compra e a clausula
--     `WHERE can_view_all_sales()` dentro da view - exatamente a clausula que a etapa 002
--     reescreve. Basta alguem editar a view e esquecer o WHERE para o GRANT do repo virar
--     vazamento real. Revogar aqui remove a municao.
--   * `variant_supplier_sources`, `markup_configurations`, `vw_variant_sale_prices` e a
--     coluna `suppliers.default_markup_percent` estao concedidos a `anon` no repo e no vivo,
--     sustentados apenas por RLS. Mesmo raciocinio: o privilegio nao deve existir.
--
-- O que esta migration NAO faz, de proposito (evita regressao de negocio):
--   * NAO mascara `cost_price`, `sale_price`, `suggested_price`, `supplier_reference` nem
--     `supplier_external_id` em `v_compras_catalogo`, nem `unit_cost`/`handling_cost` em
--     `v_compras_precos_faixa` (era o conteudo das etapas 002/003 - rejeitadas):
--       - `Promo_Supply_V2/src/pages/gerar-ordem/GerarOrdem.tsx:274` usa `supplier_reference`
--         como `codigo_fornecedor` (o codigo que o fornecedor recebe no pedido);
--       - `v_compras_precos_faixa.unit_cost` e `band.unit_cost` = `pcp.price[i]`, isto e o
--         PRECO da faixa: e a unica coluna monetaria nao nula da view e vira o
--         `valor_unitario` da cotacao
--         (`Promo_Supply_V2/docs/planos/PLANO_PROMO_SUPPLY_SO_COMPRAS_CATALOGO_NO_PROMO_GIFTS.md`
--         L213 e L354). Mascarar zeraria a cotacao inteira.
--     A fronteira de custo dessas views e a credencial (app interno = `authenticated`).
--   * NAO revoga nada de `tabela_preco_gravacao_oficial_faixa`: a coluna exposta la e
--     `preco_unitario` = preco de VENDA, publico por design desde `20260717173348_*`
--     (policy `..._public_read` para `anon` + view publica espelho). Etapa 007 rejeitada.
--
-- Seguranca da operacao:
--   * `REVOKE` e idempotente: reaplicar nao muda nada e nao falha.
--   * As views publicas do site sao SECURITY DEFINER (`v_products_public`,
--     `v_variant_sale_prices_public`, `v_compras_*`, `v_tabela_preco_gravacao_oficial_public`
--     - decisao registrada em `20261122180000_restore_definer_views_p06_e_compras.sql`):
--     executam como owner e nao dependem de GRANT em `anon` nas tabelas-base.
--   * `authenticated` nao perde nada (o post-check abaixo aborta a transacao se perder).

revoke select on table public.v_compras_catalogo        from anon;
revoke select on table public.v_compras_precos_faixa    from anon;
revoke select on table public.v_compras_precos_variante from anon;
revoke select on table public.variant_supplier_sources  from anon;
revoke select on table public.markup_configurations     from anon;
revoke select on table public.vw_variant_sale_prices    from anon;
-- Em `suppliers` o repositorio declara SELECT de COLUNA; um banco reconstruido pode ter
-- SELECT de TABELA. Revogar as duas formas e idempotente quando uma nao existe.
revoke select on table public.suppliers from anon;
revoke select (default_markup_percent) on table public.suppliers from anon;

-- Post-check: se qualquer afirmacao abaixo falhar, a transacao inteira aborta e nada e aplicado.

do $$
declare
  v_obj  text;
  v_bad  text;
  v_miss text;
  v_def  text;
begin
  -- 1. anon nao pode ter SELECT (de tabela nem de coluna) nos objetos sensiveis.
  select string_agg(c.relname, ', ' order by c.relname) into v_bad
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public'
     and c.relname = any (array[
           'v_compras_catalogo', 'v_compras_precos_faixa', 'v_compras_precos_variante',
           'variant_supplier_sources', 'markup_configurations', 'vw_variant_sale_prices',
           'suppliers'])
     and (has_table_privilege('anon', c.oid, 'select')
          or exists (select 1
                       from pg_attribute a
                      where a.attrelid = c.oid
                        and a.attnum > 0
                        and not a.attisdropped
                        and has_column_privilege('anon', c.oid, a.attnum, 'select')));
  if v_bad is not null then
    raise exception 'anon ainda tem SELECT em: %', v_bad;
  end if;

  -- 2. authenticated nao pode perder SELECT de tabela. `suppliers` fica fora de proposito:
  --    ele nunca teve SELECT de tabela para authenticated, so grants por coluna.
  select string_agg(c.relname, ', ' order by c.relname) into v_miss
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public'
     and c.relname = any (array[
           'v_compras_catalogo', 'v_compras_precos_faixa', 'v_compras_precos_variante',
           'variant_supplier_sources', 'markup_configurations', 'vw_variant_sale_prices'])
     and not has_table_privilege('authenticated', c.oid, 'select');
  if v_miss is not null then
    raise exception 'authenticated perdeu SELECT em: %', v_miss;
  end if;

  -- 3. Anti-regressao das etapas 002/003: a projecao de negocio tem que continuar existindo
  --    e nao pode estar mascarada com NULL::<tipo> AS <coluna>.
  for v_obj, v_def in
    select t.view_name, pg_get_viewdef(format('public.%I', t.view_name)::regclass, true)
      from (values ('v_compras_catalogo'), ('v_compras_precos_faixa')) as t(view_name)
  loop
    if v_obj = 'v_compras_catalogo'
       and v_def ~* 'null::[a-z0-9 ]+ as (cost_price|sale_price|suggested_price|supplier_reference|supplier_external_id)' then
      raise exception 'v_compras_catalogo com coluna de negocio mascarada (etapa 002 rejeitada)';
    end if;
    if v_obj = 'v_compras_precos_faixa'
       and v_def ~* 'null::[a-z0-9 ]+ as (unit_cost|handling_cost)' then
      raise exception 'v_compras_precos_faixa com coluna de negocio mascarada (etapa 003 rejeitada)';
    end if;
  end loop;

  -- 4. As views publicas do site continuam SECURITY DEFINER: se alguem religar
  --    security_invoker=true nelas, o anon deixa de ler o catalogo (regressao silenciosa).
  select string_agg(c.relname, ', ' order by c.relname) into v_bad
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public'
     and c.relname = any (array[
           'v_products_public', 'v_variant_sale_prices_public',
           'v_compras_catalogo', 'v_compras_precos_faixa', 'v_compras_precos_variante',
           'v_tabela_preco_gravacao_oficial_public'])
     and coalesce(array_to_string(c.reloptions, ','), '') ~~ '%security_invoker=true%';
  if v_bad is not null then
    raise exception 'view publica com security_invoker=true (site cego para anon): %', v_bad;
  end if;
end
$$;
