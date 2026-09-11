-- Consolida a semantica do antigo process_pending_batches: so processa fornecedor com auto_sync_enabled.
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
  if not pg_try_advisory_xact_lock(hashtext('fn_pipeline_promote_tick')::bigint) then
    return jsonb_build_object('skipped','lock_ocupado','ran_at',now());
  end if;

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
    select s.id, s.code
    from public.suppliers s
    join public.supplier_settings ss on ss.supplier_id = s.id
    where s.active = true
      and coalesce(ss.auto_sync_enabled, false) = true
    order by s.code
  loop
    begin
      v_std  := public.fn_standardize_supplier(v_sup.id, p_batch);
      v_prom := public.fn_promote_supplier(v_sup.id, p_batch);

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
