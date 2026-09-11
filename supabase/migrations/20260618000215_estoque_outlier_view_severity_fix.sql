
-- Auditoria Estoque (follow-up de revisão): a severidade considerava só
-- vss.quantity, mas o WHERE admite linhas também por estoque FUTURO. Agora a
-- severidade usa GREATEST(quantity, max_future) — classifica corretamente
-- linhas que entram pela janela de futuro. (CodeRabbit/Cubic P2)
create or replace view public.vw_stock_quantity_outliers
with (security_invoker = true) as
select
  vss.id            as source_id,
  vss.variant_id,
  pv.product_id,
  p.sku             as product_sku,
  p.name            as product_name,
  vss.supplier_id,
  vsp.name          as supplier_name,
  vss.quantity      as current_quantity,
  greatest(coalesce(vss.next_quantity_1,0), coalesce(vss.next_quantity_2,0), coalesce(vss.next_quantity_3,0),
           coalesce(vss.next_quantity_4,0), coalesce(vss.next_quantity_5,0), coalesce(vss.next_quantity_6,0)) as max_future_quantity,
  vss.updated_at,
  case
    when greatest(coalesce(vss.quantity,0),
                  coalesce(vss.next_quantity_1,0), coalesce(vss.next_quantity_2,0), coalesce(vss.next_quantity_3,0),
                  coalesce(vss.next_quantity_4,0), coalesce(vss.next_quantity_5,0), coalesce(vss.next_quantity_6,0)) >= 1000000 then 'extreme'
    when greatest(coalesce(vss.quantity,0),
                  coalesce(vss.next_quantity_1,0), coalesce(vss.next_quantity_2,0), coalesce(vss.next_quantity_3,0),
                  coalesce(vss.next_quantity_4,0), coalesce(vss.next_quantity_5,0), coalesce(vss.next_quantity_6,0)) >= 100000 then 'high'
    else 'elevated'
  end as severity
from variant_supplier_sources vss
join product_variants pv on pv.id = vss.variant_id
join products p on p.id = pv.product_id
left join v_suppliers_public vsp on vsp.id = vss.supplier_id
where vss.is_active and (
  vss.quantity >= 50000
  or greatest(coalesce(vss.next_quantity_1,0), coalesce(vss.next_quantity_2,0), coalesce(vss.next_quantity_3,0),
              coalesce(vss.next_quantity_4,0), coalesce(vss.next_quantity_5,0), coalesce(vss.next_quantity_6,0)) >= 50000
);

comment on view public.vw_stock_quantity_outliers is
  'Observabilidade (read-only): linhas de vss com quantidade atual OU futura implausivelmente alta (>=50k) p/ revisão manual. Severidade = GREATEST(atual, futuro). NÃO altera dados; os valores são, em sua maioria, granel legítimo de grandes distribuidores. Auditoria Estoque 2026-06-17.';
;
