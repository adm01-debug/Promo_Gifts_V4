CREATE OR REPLACE FUNCTION public.fn_asia_ingest_all_pages(p_por_pagina integer DEFAULT 100)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_api_key    text := public.fn_get_asia_api_key();
  v_secret_key text := public.fn_get_asia_secret_key();
  v_url        text := 'https://api.asiaimport.com.br/';
  v_inseridos  int  := 0;
  v_atualizados int := 0;
  v_erros      int  := 0;
  v_paginas    int  := 0;
  v_req_id     bigint;
  v_status     int;
  v_content    text;
  v_resp       jsonb;
  v_produtos   jsonb;
  v_result     jsonb;
  v_total_pag  int  := 5;  -- 5 páginas × 100 = 500 produtos (cobre os 455)
  i            int;
  v_t0         timestamptz := clock_timestamp();
BEGIN
  IF v_api_key IS NULL OR v_secret_key IS NULL THEN
    RETURN jsonb_build_object('success',false,'error','credenciais_nao_configuradas');
  END IF;

  FOR i IN 1..v_total_pag LOOP
    BEGIN
      SELECT net.http_post(
        url     := v_url,
        headers := jsonb_build_object('Content-Type', 'application/x-www-form-urlencoded'),
        body    := ('api_key=' || v_api_key ||
                    '&secret_key=' || v_secret_key ||
                    '&funcao=listarProdutos2' ||
                    '&pagina=' || i::text ||
                    '&por_pagina=' || p_por_pagina::text)::bytea
      ) INTO v_req_id;

      -- Aguardar resposta async
      PERFORM pg_sleep(3);

      SELECT status_code, content::text
      INTO v_status, v_content
      FROM net._http_response WHERE id = v_req_id;

      IF v_status = 200 AND v_content IS NOT NULL THEN
        v_resp     := v_content::jsonb;
        v_produtos := COALESCE(v_resp->'produtos', '[]'::jsonb);

        IF jsonb_array_length(v_produtos) = 0 THEN
          EXIT;  -- Sem mais páginas
        END IF;

        v_result      := public.fn_ingest_asia_api_batch(v_produtos);
        v_inseridos   := v_inseridos   + COALESCE((v_result->>'inseridos')::int, 0);
        v_atualizados := v_atualizados + COALESCE((v_result->>'atualizados')::int, 0);
        v_erros       := v_erros       + COALESCE((v_result->>'erros')::int, 0);
        v_paginas     := v_paginas + 1;
      ELSE
        v_erros := v_erros + 1;
      END IF;

    EXCEPTION WHEN OTHERS THEN
      v_erros := v_erros + 1;
    END;
  END LOOP;

  -- Disparar pipeline Bronze → Silver → Gold para novos/atualizados
  IF v_inseridos + v_atualizados > 0 THEN
    PERFORM public.fn_pipeline_promote_tick();
  END IF;

  RETURN jsonb_build_object(
    'success',      true,
    'paginas',      v_paginas,
    'inseridos',    v_inseridos,
    'atualizados',  v_atualizados,
    'erros',        v_erros,
    'segundos',     round(extract(epoch FROM clock_timestamp()-v_t0)::numeric,1)
  );
END;
$function$
