
-- Patch cirúrgico: adiciona bloco novelties ao fn_pipeline_health()
-- Preserva 100% do código existente, adiciona apenas as novas keys
CREATE OR REPLACE FUNCTION public.fn_pipeline_health()
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  select jsonb_build_object(
    'checked_at', now(),

    -- fila principal
    'raw_pending_total',  (select count(*) from supplier_products_raw where status='pending'),
    'raw_failed_total',   (select count(*) from supplier_products_raw where status='failed'),
    'raw_quarantined_total', (select count(*) from supplier_products_raw where status='quarantined'),
    'raw_pending_by_supplier', coalesce((
        select jsonb_object_agg(code, n) from (
          select s.code, count(*) n
          from supplier_products_raw r join suppliers s on s.id = r.supplier_id
          where r.status='pending' group by s.code) a), '{}'::jsonb),
    'raw_failed_by_supplier', coalesce((
        select jsonb_object_agg(code, n) from (
          select s.code, count(*) n
          from supplier_products_raw r join suppliers s on s.id = r.supplier_id
          where r.status in ('failed','quarantined') group by s.code) a), '{}'::jsonb),

    -- eixos laterais do Bronze
    'images_pending',  (select count(*) from supplier_products_raw where images_status='pending'),
    'stock_pending',   (select count(*) from supplier_products_raw where stock_status='pending'),
    'site_failed',     (select count(*) from supplier_products_raw where site_status='failed'),
    'site_pending',    (select count(*) from supplier_products_raw where site_status='pending'),

    -- silver / gold
    'pad_standardized_pending', (select count(*) from produtos_padronizacao where status='standardized'),
    'pad_oldest_standardized',  (select min(updated_at) from produtos_padronizacao where status='standardized'),
    'pad_promoted',             (select count(*) from produtos_padronizacao where status='promoted'),
    'gold_products',        (select count(*) from products),
    'gold_products_ativos', (select count(*) from products where is_active),
    'gold_variants',        (select count(*) from product_variants),

    -- integridade/qualidade visível ao cliente
    'gold_ativos_sem_imagem',    (select count(*) from products p where p.is_active
                                    and not exists (select 1 from product_images i where i.product_id=p.id)),
    'gold_ativos_sem_variante',  (select count(*) from products p where p.is_active
                                    and not exists (select 1 from product_variants v where v.product_id=p.id)),
    'gold_preco_estagnado_7d',   (select count(*) from products where is_active
                                    and (price_verified_at is null or price_verified_at < now()-interval '7 days')),
    'estoque_divergente_variantes', (select count(*) from (
        select v.id from product_variants v
        left join variant_supplier_sources s on s.variant_id=v.id and s.is_active
        where v.is_active group by v.id, v.stock_quantity
        having coalesce(v.stock_quantity,0) is distinct from coalesce(sum(s.quantity),0)) z),

    -- histórico (pós-fix deve ficar em centenas/dia; >50k/dia = hash poluído de novo)
    'history_rows_24h', (select count(*) from supplier_products_raw_history
                          where captured_at > now()-interval '24 hours'),
    'history_legacy_restante', (select coalesce((select count(*) from supplier_products_raw_history_legacy),0)),

    -- orquestrador
    'last_tick', (
        select to_jsonb(t) from (
          select started_at, finished_at, status, duration_s,
                 result->>'pais_promovidos'      as pais,
                 result->>'variantes_promovidas' as vars,
                 result->>'erros'                as erros
          from pipeline_run_log
          where job='promote_tick' and status <> 'running'
          order by started_at desc limit 1) t),
    'ticks_last_24h',  (select count(*) from pipeline_run_log
                        where job='promote_tick' and started_at > now()-interval '24 hours'),
    'errors_last_24h', (select coalesce(sum((result->>'erros')::int),0) from pipeline_run_log
                        where job='promote_tick' and started_at > now()-interval '24 hours'),

    -- ══ NOVIDADES (bloco adicionado jun/2026) ══════════════════════
    'novelties', jsonb_build_object(
        'total_active',     (select count(*) from product_novelties where is_active = true),
        'total_highlighted',(select count(*) from product_novelties where is_active = true and is_highlighted = true),
        'expiring_7d',      (select count(*) from product_novelties
                             where is_active = true
                               and expires_at is not null
                               and expires_at between now() and now() + interval '7 days'),
        'stale_is_new',     (select count(*) from products
                             where is_new = true
                               and novelty_expires_at is not null
                               and novelty_expires_at < now()),
        'by_supplier',      coalesce((
            select jsonb_object_agg(supplier_code, n) from (
              select supplier_code, count(*) n
              from product_novelties
              where is_active = true
              group by supplier_code) a), '{}'::jsonb),
        'by_source',        coalesce((
            select jsonb_object_agg(source, n) from (
              select source, count(*) n
              from product_novelties
              where is_active = true
              group by source) a), '{}'::jsonb),
        'last_sync',        (select max(updated_at) from product_novelties)
    )
    -- ══════════════════════════════════════════════════════════════
  );
$function$;
;
