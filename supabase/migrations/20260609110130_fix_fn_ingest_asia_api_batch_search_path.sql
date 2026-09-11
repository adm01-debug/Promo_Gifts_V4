CREATE OR REPLACE FUNCTION public.fn_ingest_asia_api_batch(p_produtos jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_supplier_id  uuid    := 'd2734e23-d633-4819-bb15-e51aa44e2118';
  v_batch_id     uuid    := gen_random_uuid();
  v_inseridos    int     := 0;
  v_atualizados  int     := 0;
  v_sem_mudanca  int     := 0;
  v_erros        int     := 0;
  v_produto      jsonb;
  v_referencia   text;
  v_hash         text;
  v_hash_atual   text;
BEGIN
  -- Cria batch de importação
  INSERT INTO supplier_import_batches (id, supplier_id, status, started_at, notes)
  VALUES (v_batch_id, v_supplier_id, 'running', now(), 'API oficial api.asiaimport.com.br — listarProdutos2');

  -- Itera sobre cada produto-pai
  FOR v_produto IN SELECT * FROM jsonb_array_elements(p_produtos)
  LOOP
    BEGIN
      v_referencia := v_produto->>'referencia';

      -- Valida referência
      IF v_referencia IS NULL OR v_referencia = '' THEN
        v_erros := v_erros + 1;
        CONTINUE;
      END IF;

      -- Calcula hash usando SHA-256 (igual à coluna GENERATED)
      v_hash := encode(extensions.digest(v_produto::text, 'sha256'), 'hex');

      -- Verifica se existe e qual o hash atual (gerado pela coluna GENERATED)
      SELECT content_hash INTO v_hash_atual
      FROM supplier_products_raw
      WHERE supplier_id = v_supplier_id
        AND supplier_sku = v_referencia;

      IF NOT FOUND THEN
        -- Novo produto — content_hash é GENERATED (não incluir na INSERT)
        INSERT INTO supplier_products_raw (
          supplier_id,
          supplier_sku,
          supplier_reference,
          raw_data,
          status,
          source_channel,
          import_batch_id,
          imported_at,
          updated_at
        ) VALUES (
          v_supplier_id,
          v_referencia,
          v_referencia,
          v_produto,
          'pending',
          'api_oficial',
          v_batch_id,
          now(),
          now()
        );
        v_inseridos := v_inseridos + 1;

      ELSIF v_hash_atual IS DISTINCT FROM v_hash THEN
        -- Produto mudou — content_hash é GENERATED (não incluir no UPDATE)
        UPDATE supplier_products_raw SET
          raw_data        = v_produto,
          status          = 'pending',
          source_channel  = 'api_oficial',
          import_batch_id = v_batch_id,
          updated_at      = now()
        WHERE supplier_id = v_supplier_id
          AND supplier_sku = v_referencia;
        v_atualizados := v_atualizados + 1;

      ELSE
        -- Produto idêntico — sem alteração
        v_sem_mudanca := v_sem_mudanca + 1;
      END IF;

    EXCEPTION WHEN OTHERS THEN
      v_erros := v_erros + 1;
      -- Continua processando os demais
    END;
  END LOOP;

  -- Finaliza batch
  UPDATE supplier_import_batches SET
    status            = CASE WHEN v_erros = 0 THEN 'ok' ELSE 'ok_com_erros' END,
    finished_at       = now(),
    products_imported = v_inseridos,
    products_updated  = v_atualizados,
    notes             = notes || format(' | inseridos=%s atualizados=%s sem_mudanca=%s erros=%s',
                          v_inseridos, v_atualizados, v_sem_mudanca, v_erros)
  WHERE id = v_batch_id;

  RETURN jsonb_build_object(
    'batch_id',     v_batch_id,
    'inseridos',    v_inseridos,
    'atualizados',  v_atualizados,
    'sem_mudanca',  v_sem_mudanca,
    'erros',        v_erros,
    'total',        v_inseridos + v_atualizados + v_sem_mudanca + v_erros
  );
END;
$function$;;
