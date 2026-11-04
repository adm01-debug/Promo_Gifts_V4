CREATE OR REPLACE FUNCTION public.fn_process_asia_stock_pending(p_limit integer DEFAULT 500)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_ASIA uuid := 'd2734e23-d633-4819-bb15-e51aa44e2118';
  r RECORD;
  v_stock int;
  v_nd1 date; v_nq1 int;
  v_nd2 date; v_nq2 int;
  v_nd3 date; v_nq3 int;
  v_up int;
  v_seen int:=0; v_applied int:=0; v_missing int:=0;
  v_t0 timestamptz:=clock_timestamp();
  v_prev_data jsonb;
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.is_admin_or_above((SELECT auth.uid())) THEN
    RAISE EXCEPTION 'Acesso negado: requer perfil admin ou superior';
  END IF;
  IF NOT pg_try_advisory_xact_lock(hashtext('fn_process_asia_stock_pending')::bigint) THEN
    RETURN jsonb_build_object('success',true,'skipped','lock_ocupado');
  END IF;
  PERFORM set_config('app.write_source','pipeline_stock',true);

  FOR r IN
    SELECT id, supplier_reference, stock_data, raw_data
    FROM public.supplier_products_raw
    WHERE supplier_id=v_ASIA AND stock_status='pending'
    ORDER BY stock_synced_at NULLS FIRST, id
    LIMIT p_limit
    FOR UPDATE SKIP LOCKED
  LOOP
    v_seen := v_seen + 1;
    v_stock := public.fn_safe_int(COALESCE(r.stock_data->>'qtd_estoque',r.raw_data->>'var_estoque'));
    v_prev_data := COALESCE(r.stock_data->'previsao_entrega',r.raw_data->'previsao_entrega','[]'::jsonb);

    -- Janela 1: com guard > CURRENT_DATE (Silver também não recebe passadas)
    v_nd1 := CASE
      WHEN COALESCE(v_prev_data->0->>'data','') ~ '^\d{4}-\d{2}-\d{2}'
       AND LEFT(v_prev_data->0->>'data',10)::date > CURRENT_DATE
      THEN LEFT(v_prev_data->0->>'data',10)::date
      ELSE NULL END;
    v_nq1 := CASE WHEN v_nd1 IS NOT NULL THEN public.fn_safe_int(v_prev_data->0->>'quantidade') ELSE NULL END;

    -- Janela 2
    v_nd2 := CASE
      WHEN COALESCE(v_prev_data->1->>'data','') ~ '^\d{4}-\d{2}-\d{2}'
       AND LEFT(v_prev_data->1->>'data',10)::date > CURRENT_DATE
      THEN LEFT(v_prev_data->1->>'data',10)::date
      ELSE NULL END;
    v_nq2 := CASE WHEN v_nd2 IS NOT NULL THEN public.fn_safe_int(v_prev_data->1->>'quantidade') ELSE NULL END;

    -- Janela 3
    v_nd3 := CASE
      WHEN COALESCE(v_prev_data->2->>'data','') ~ '^\d{4}-\d{2}-\d{2}'
       AND LEFT(v_prev_data->2->>'data',10)::date > CURRENT_DATE
      THEN LEFT(v_prev_data->2->>'data',10)::date
      ELSE NULL END;
    v_nq3 := CASE WHEN v_nd3 IS NOT NULL THEN public.fn_safe_int(v_prev_data->2->>'quantidade') ELSE NULL END;

    UPDATE public.produtos_padronizacao_variantes
       SET stock_quantity=v_stock,
           next_date_1=v_nd1, next_quantity_1=v_nq1,
           next_date_2=v_nd2, next_quantity_2=v_nq2,
           next_date_3=v_nd3, next_quantity_3=v_nq3,
           updated_at=now()
     WHERE supplier_id=v_ASIA AND variant_reference=r.supplier_reference;
    GET DIAGNOSTICS v_up = ROW_COUNT;

    IF v_up>0 THEN v_applied:=v_applied+1; ELSE v_missing:=v_missing+1; END IF;

    UPDATE public.supplier_products_raw
       SET stock_status='processed'::supplier_raw_status, stock_synced_at=now()
     WHERE id=r.id;
  END LOOP;

  RETURN jsonb_build_object(
    'success',true,'supplier','ASIA','vistos',v_seen,'aplicados',v_applied,
    'variante_inexistente',v_missing,
    'fix_b07','janelas_2_3_processadas',
    'guard_silver','datas_passadas_NULL_no_Silver_e_Gold',
    'segundos',round(extract(epoch FROM clock_timestamp()-v_t0)::numeric,1)
  );
END;
$function$
