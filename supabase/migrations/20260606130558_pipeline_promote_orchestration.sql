-- Consolidação 2026-06-06: orquestração do pipeline canônico (padronizacao -> Gold)
-- Camada silver_* foi diagnosticada como duplicata de chat paralelo; pipeline canônica = padronizacao.

-- 1) Controle de pausa (kill-switch leve, sem precisar desagendar o cron)
create table if not exists public.pipeline_control (
  name       text primary key,
  enabled    boolean not null default true,
  note       text,
  updated_at timestamptz not null default now()
);
insert into public.pipeline_control(name, enabled, note)
values ('promote_tick', true, 'Tick Bronze->padronizacao->Gold. enabled=false pausa sem desagendar.')
on conflict (name) do nothing;

-- 2) Log de execução do tick (convenção log-por-dominio da casa)
create table if not exists public.pipeline_run_log (
  id          bigint generated always as identity primary key,
  job         text not null default 'promote_tick',
  started_at  timestamptz not null default now(),
  finished_at timestamptz,
  duration_s  numeric,
  status      text not null default 'running',
  batch_size  integer,
  result      jsonb,
  error       text
);
create index if not exists ix_pipeline_run_log_started on public.pipeline_run_log(started_at desc);

-- 3) Wrapper idempotente: standardize -> promote, por fornecedor, todos numa chamada
create or replace function public.fn_pipeline_promote_tick(p_batch integer default 300)
returns jsonb
language plpgsql
security definer
set search_path to 'public','extensions'
as $fn$
declare
  v_enabled  boolean;
  v_sup      record;
  v_std      jsonb;
  v_prom     jsonb;
  v_per_sup  jsonb := '[]'::jsonb;
  v_std_var  int := 0;
  v_prom_par int := 0;
  v_prom_var int := 0;
  v_erros    int := 0;
  v_t0       timestamptz := clock_timestamp();
  v_log_id   bigint;
  v_result   jsonb;
begin
  -- nunca sobrepor dois ticks
  if not pg_try_advisory_xact_lock(hashtext('fn_pipeline_promote_tick')::bigint) then
    return jsonb_build_object('skipped','lock_ocupado','ran_at',now());
  end if;

  -- pausa controlada
  select enabled into v_enabled from public.pipeline_control where name='promote_tick';
  if not coalesce(v_enabled, true) then
    insert into public.pipeline_run_log(job, finished_at, duration_s, status, batch_size, result)
    values ('promote_tick', now(), 0, 'skipped', p_batch,
            jsonb_build_object('reason','pipeline_control.disabled'));
    return jsonb_build_object('skipped','disabled','ran_at',now());
  end if;

  insert into public.pipeline_run_log(job, status, batch_size)
  values ('promote_tick','running', p_batch)
  returning id into v_log_id;

  for v_sup in
    select id, code from public.suppliers where active = true order by code
  loop
    begin
      v_std  := public.fn_standardize_supplier(v_sup.id, p_batch);  -- raw(pending) -> padronizacao(standardized)
      v_prom := public.fn_promote_supplier(v_sup.id, p_batch);      -- padronizacao(standardized) -> Gold

      v_std_var  := v_std_var  + coalesce((v_std ->>'variantes_padronizadas')::int, 0);
      v_prom_par := v_prom_par + coalesce((v_prom->>'pais_promovidos')::int, 0);
      v_prom_var := v_prom_var + coalesce((v_prom->>'variantes_promovidas')::int, 0);
      v_erros    := v_erros    + coalesce((v_std ->>'erros')::int, 0)
                              + coalesce((v_prom->>'erros')::int, 0);

      v_per_sup := v_per_sup || jsonb_build_object(
        'code', v_sup.code, 'standardize', v_std, 'promote', v_prom);
    exception when others then
      v_erros := v_erros + 1;
      v_per_sup := v_per_sup || jsonb_build_object('code', v_sup.code, 'erro', sqlerrm);
    end;
  end loop;

  v_result := jsonb_build_object(
    'variantes_padronizadas', v_std_var,
    'pais_promovidos',        v_prom_par,
    'variantes_promovidas',   v_prom_var,
    'erros',                  v_erros,
    'por_fornecedor',         v_per_sup,
    'ran_at',                 now());

  update public.pipeline_run_log
     set finished_at = now(),
         duration_s  = round(extract(epoch from clock_timestamp() - v_t0)::numeric, 1),
         status      = case when v_erros > 0 then 'ok_com_erros' else 'ok' end,
         result      = v_result
   where id = v_log_id;

  return v_result;
end;
$fn$;;
