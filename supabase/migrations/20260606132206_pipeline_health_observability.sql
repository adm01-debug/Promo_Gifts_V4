-- Observabilidade do pipeline canonico
create or replace function public.fn_pipeline_health()
returns jsonb
language sql
stable
security definer
set search_path to 'public','extensions'
as $fn$
  select jsonb_build_object(
    'checked_at', now(),
    'raw_pending_total', (select count(*) from supplier_products_raw where status='pending'),
    'raw_pending_by_supplier', coalesce((
        select jsonb_object_agg(code, n) from (
          select s.code, count(*) n
          from supplier_products_raw r
          join suppliers s on s.id = r.supplier_id
          where r.status='pending'
          group by s.code) a), '{}'::jsonb),
    'pad_standardized_pending', (select count(*) from produtos_padronizacao where status='standardized'),
    'pad_oldest_standardized',  (select min(updated_at) from produtos_padronizacao where status='standardized'),
    'pad_promoted',             (select count(*) from produtos_padronizacao where status='promoted'),
    'gold_products', (select count(*) from products),
    'gold_variants', (select count(*) from product_variants),
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
    'silver_quarantined', (
        to_regclass('public.silver_products') is null
        and to_regclass('public._deprecated_silver_products_20260606') is not null)
  );
$fn$;;
