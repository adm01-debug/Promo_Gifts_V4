-- ============================================================================
-- FASE 0 — Fundação da ingestão Bronze (AGNÓSTICA de executor: vale n8n ou Edge)
-- Princípio: só escreve no Bronze, via RPC idempotente. Transform fica no Postgres.
-- ============================================================================

-- 1) Log de corridas de ingestão (espelha pipeline_run_log da camada transform)
create table if not exists public.ingestion_run_log (
  id            bigint generated always as identity primary key,
  run_id        uuid not null,
  supplier_code text not null,
  feed          text not null check (feed in ('products','stock','customization')),
  started_at    timestamptz not null default now(),
  finished_at   timestamptz,
  duration_s    numeric,
  fetched       integer not null default 0,
  upserted      integer not null default 0,
  skipped       integer not null default 0,
  errors        integer not null default 0,
  status        text not null default 'running'
                check (status in ('running','ok','ok_com_erros','failed','aborted_rate_limit')),
  error_samples jsonb,
  created_at    timestamptz not null default now()
);
create index if not exists ix_ingestion_run_log_started  on public.ingestion_run_log (started_at desc);
create index if not exists ix_ingestion_run_log_sup_feed on public.ingestion_run_log (supplier_code, feed, started_at desc);
alter table public.ingestion_run_log enable row level security;  -- sem policy: só definer/superuser

-- helper: resolve supplier_id por code (fallback nome); erro se inativo/inexistente
create or replace function public.fn_resolve_supplier(p_code text)
returns uuid language plpgsql stable security definer set search_path=public as $$
declare v_id uuid; v_active boolean;
begin
  select id, active into v_id, v_active from suppliers
   where upper(code)=upper(p_code) or upper(name)=upper(p_code)
   order by (upper(code)=upper(p_code)) desc limit 1;
  if v_id is null   then raise exception 'Fornecedor % nao encontrado', p_code; end if;
  if v_active is false then raise exception 'Fornecedor % inativo', p_code; end if;
  return v_id;
end $$;

-- 2) ENTRYPOINT de ingestão — roteia p/ os RPCs idempotentes existentes
create or replace function public.fn_ingest_bronze_batch(
  p_supplier_code text, p_feed text, p_run_id uuid, p_items jsonb)
returns jsonb language plpgsql security definer set search_path=public as $$
declare
  v_sid uuid := public.fn_resolve_supplier(p_supplier_code);
  v_item jsonb; v_ref text; v_tco text;
  v_fetched int := 0; v_upserted int := 0; v_skipped int := 0; v_errors int := 0;
  v_errsamples jsonb := '[]'::jsonb;
begin
  if p_feed not in ('products','stock','customization') then raise exception 'feed invalido: %', p_feed; end if;
  if jsonb_typeof(p_items) <> 'array' then raise exception 'p_items deve ser array jsonb'; end if;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_fetched := v_fetched + 1;
    begin
      if p_feed in ('products','stock') then
        v_ref := coalesce(nullif(v_item->>'Sku',''), nullif(v_item->>'sku',''),
                          nullif(v_item->>'supplier_reference',''), nullif(v_item->>'referencia',''),
                          nullif(v_item->>'ProdReference',''), nullif(v_item->>'codigo',''));
        if v_ref is null then
          v_skipped := v_skipped + 1;
          if jsonb_array_length(v_errsamples) < 20 then
            v_errsamples := v_errsamples || jsonb_build_object('motivo','sem_chave_natural','item',v_item);
          end if;
          continue;
        end if;
        if p_feed = 'products'
          then perform public.insert_supplier_product_raw(v_sid, v_ref, v_item, p_run_id);
          else perform public.upsert_supplier_stock_raw  (v_sid, v_ref, v_item, p_run_id);
        end if;
        v_upserted := v_upserted + 1;
      else  -- customization
        v_tco := coalesce(nullif(v_item->>'TableCodeOption',''), nullif(v_item->>'table_code_option',''));
        if v_tco is null then
          v_skipped := v_skipped + 1;
          if jsonb_array_length(v_errsamples) < 20 then
            v_errsamples := v_errsamples || jsonb_build_object('motivo','sem_table_code_option','item',v_item);
          end if;
          continue;
        end if;
        perform public.upsert_supplier_customization_raw(
          v_sid, v_tco, v_item,
          nullif(v_item->>'TableCode',''),
          coalesce(nullif(v_item->>'CustomizationTypeName',''), nullif(v_item->>'customization_type','')),
          p_run_id);
        v_upserted := v_upserted + 1;
      end if;
    exception when others then
      v_errors := v_errors + 1;
      if jsonb_array_length(v_errsamples) < 20 then
        v_errsamples := v_errsamples || jsonb_build_object('erro',SQLERRM,'sqlstate',SQLSTATE,'ref',coalesce(v_ref,v_tco));
      end if;
    end;
  end loop;

  return jsonb_build_object('supplier_code',p_supplier_code,'feed',p_feed,'run_id',p_run_id,
    'fetched',v_fetched,'upserted',v_upserted,'skipped',v_skipped,'errors',v_errors,
    'error_samples',v_errsamples);
end $$;

-- 3) SWEEP de descontinuados (chamar SÓ após full-pull de produtos 100% OK)
create or replace function public.fn_bronze_mark_absent(p_supplier_code text, p_run_id uuid)
returns integer language plpgsql security definer set search_path=public as $$
declare v_sid uuid := public.fn_resolve_supplier(p_supplier_code); v_n int;
begin
  update supplier_products_raw
     set status = 'skipped'::supplier_raw_status, updated_at = now()
   where supplier_id = v_sid
     and status::text in ('pending','processing','processed')
     and coalesce(import_batch_id,'00000000-0000-0000-0000-000000000000'::uuid) <> p_run_id;
  get diagnostics v_n = row_count;
  return v_n;
end $$;

-- 4) Abre/fecha corrida no log
create or replace function public.fn_ingestion_run_open(p_supplier_code text, p_feed text)
returns uuid language plpgsql security definer set search_path=public as $$
declare v_run uuid := gen_random_uuid();
begin
  if p_feed not in ('products','stock','customization') then raise exception 'feed invalido: %', p_feed; end if;
  insert into ingestion_run_log(run_id, supplier_code, feed, status)
  values (v_run, p_supplier_code, p_feed, 'running');
  return v_run;
end $$;

create or replace function public.fn_ingestion_run_close(
  p_run_id uuid, p_status text, p_fetched int, p_upserted int, p_skipped int, p_errors int,
  p_error_samples jsonb default null)
returns void language plpgsql security definer set search_path=public as $$
begin
  update ingestion_run_log
     set finished_at = now(),
         duration_s  = extract(epoch from (now()-started_at)),
         status = p_status, fetched = p_fetched, upserted = p_upserted,
         skipped = p_skipped, errors = p_errors,
         error_samples = coalesce(p_error_samples, error_samples)
   where run_id = p_run_id;
end $$;

-- 5) Health da ingestão (standalone; será unido ao fn_pipeline_health quando ligarmos os extractors)
create or replace function public.fn_ingestion_health()
returns jsonb language sql stable security definer set search_path=public as $$
  select jsonb_build_object(
    'checked_at', now(),
    'por_fornecedor_feed', (
      select coalesce(jsonb_agg(jsonb_build_object(
               'supplier_code', supplier_code, 'feed', feed, 'ultimo_status', status,
               'ultimo_run', started_at,
               'idade_horas', round((extract(epoch from (now()-started_at))/3600)::numeric,2),
               'fetched', fetched, 'upserted', upserted, 'errors', errors) order by supplier_code, feed), '[]'::jsonb)
      from (select distinct on (supplier_code,feed) supplier_code,feed,status,started_at,fetched,upserted,errors
            from ingestion_run_log order by supplier_code,feed,started_at desc) ult),
    'corridas_24h', (select count(*) from ingestion_run_log where started_at > now()-interval '24 hours'),
    'falhas_24h',   (select count(*) from ingestion_run_log where started_at > now()-interval '24 hours'
                                                                and status in ('failed','aborted_rate_limit')))
$$;

-- Grants: tudo restrito a service_role (Edge/n8n usam service_role)
revoke all on function public.fn_resolve_supplier(text)                          from public, anon, authenticated;
revoke all on function public.fn_ingest_bronze_batch(text,text,uuid,jsonb)       from public, anon, authenticated;
revoke all on function public.fn_bronze_mark_absent(text,uuid)                   from public, anon, authenticated;
revoke all on function public.fn_ingestion_run_open(text,text)                   from public, anon, authenticated;
revoke all on function public.fn_ingestion_run_close(uuid,text,int,int,int,int,jsonb) from public, anon, authenticated;
revoke all on function public.fn_ingestion_health()                              from public, anon, authenticated;
grant execute on function public.fn_ingest_bronze_batch(text,text,uuid,jsonb)       to service_role;
grant execute on function public.fn_bronze_mark_absent(text,uuid)                   to service_role;
grant execute on function public.fn_ingestion_run_open(text,text)                   to service_role;
grant execute on function public.fn_ingestion_run_close(uuid,text,int,int,int,int,jsonb) to service_role;
grant execute on function public.fn_ingestion_health()                              to service_role;;
