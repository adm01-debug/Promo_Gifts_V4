-- ============================================================================
-- P0-1: Mata o carrossel de reprocessamento + histórico-bomba (auditoria 2026-06-10)
-- Evidência: 100% das versões de histórico XBZ diferem só em '_ruiz_sync_at';
-- flip diário de tipos (string↔number) em PrecoVenda/IdProduto/VendaMinima/
-- Multiplos/IpiTaxa causado por enrich gravar via ->> (texto).
-- ============================================================================

-- 1) Campos voláteis excluídos do content_hash, por fornecedor (config, não hard-code)
ALTER TABLE public.supplier_settings
  ADD COLUMN IF NOT EXISTS hash_excluded_fields text[] NOT NULL DEFAULT '{}';

COMMENT ON COLUMN public.supplier_settings.hash_excluded_fields IS
  'Chaves de raw_data ignoradas no cálculo de content_hash (estado volátil de estoque). Chaves iniciadas em "_" são sempre ignoradas. Mudança nesses campos NÃO deve redisparar padronização de produto.';

UPDATE public.supplier_settings ss
   SET hash_excluded_fields = ARRAY['Disponivel','QuantidadeDisponivel',
        'QuantidadeDisponivelEstoquePrincipal','ReposicaoDataPrevista','StatusConfiabilidade']
  FROM public.suppliers s
 WHERE s.id = ss.supplier_id AND s.code = 'XBZ';

-- 2) fn_spr_before_write v3: strip de TODA chave de metadado "_%" + hash canônico
CREATE OR REPLACE FUNCTION public.fn_spr_before_write()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_clean    jsonb;
  v_hashbase jsonb;
  v_excl     text[];
  v_k        text;
BEGIN
  -- aproveita metadados de ingestão antes do strip (compat com payloads legados)
  IF NEW.raw_data ? '_source' AND COALESCE(NEW.source_channel,'') IN ('','n8n','legacy') THEN
    NEW.source_channel := NEW.raw_data->>'_source';
  END IF;
  IF NEW.raw_data ? '_imported_at' AND NEW.imported_at IS NULL THEN
    BEGIN NEW.imported_at := (NEW.raw_data->>'_imported_at')::timestamptz;
    EXCEPTION WHEN others THEN NULL; END;
  END IF;

  -- remove TODAS as chaves de metadado (prefixo '_') do payload persistido
  v_clean := NEW.raw_data;
  FOR v_k IN SELECT k FROM jsonb_object_keys(NEW.raw_data) k WHERE k LIKE E'\\_%' LOOP
    v_clean := v_clean - v_k;
  END LOOP;
  NEW.raw_data := v_clean;

  -- hash canônico: ignora campos voláteis configurados por fornecedor
  SELECT ss.hash_excluded_fields INTO v_excl
    FROM public.supplier_settings ss
   WHERE ss.supplier_id = NEW.supplier_id;
  v_hashbase := CASE WHEN v_excl IS NOT NULL AND array_length(v_excl,1) > 0
                     THEN v_clean - v_excl ELSE v_clean END;
  NEW.content_hash := encode(digest(v_hashbase::text, 'sha256'), 'hex');

  IF TG_OP = 'INSERT' THEN
    NEW.imported_at := COALESCE(NEW.imported_at, now());
    IF NEW.process_errors IS NOT NULL AND NEW.last_error IS NULL THEN
      NEW.last_error := NEW.process_errors;
    END IF;
  ELSE
    NEW.updated_at := now();

    IF NEW.process_errors IS DISTINCT FROM OLD.process_errors
       AND NEW.process_errors IS NOT NULL THEN
      NEW.last_error := NEW.process_errors;
      NEW.attempts   := COALESCE(OLD.attempts, 0) + 1;
      IF NEW.status <> 'processed'::supplier_raw_status THEN
        NEW.status := CASE WHEN NEW.attempts >= 5
                           THEN 'quarantined'::supplier_raw_status
                           ELSE 'failed'::supplier_raw_status END;
      END IF;
    END IF;

    IF NEW.status = 'processed'::supplier_raw_status
       AND NEW.status IS DISTINCT FROM OLD.status THEN
      NEW.processed_at := COALESCE(NEW.processed_at, now());
    END IF;
  END IF;

  RETURN NEW;
END $$;

-- 3) fn_xbz_enrich_stock_batch v2: preserva tipos JSON, espelha em stock_data,
--    sem '_ruiz_sync_at' (usa stock_synced_at), e pula linhas sem mudança real
CREATE OR REPLACE FUNCTION public.fn_xbz_enrich_stock_batch(p_supplier_id uuid, p_items jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_updated int := 0;
BEGIN
  UPDATE supplier_products_raw spr
  SET
    raw_data = spr.raw_data || jsonb_strip_nulls(jsonb_build_object(
      'QuantidadeDisponivel',                 item->'QuantidadeDisponivel',
      'QuantidadeDisponivelEstoquePrincipal', item->'QuantidadeDisponivelEstoquePrincipal',
      'ReposicaoDataPrevista',                item->'ReposicaoDataPrevista',
      'Multiplos',                            item->'Multiplos',
      'VendaMinima',                          item->'VendaMinima',
      'Disponivel',                           item->'Disponivel',
      'IpiTaxa',                              item->'IpiTaxa',
      'PrecoVenda',                           item->'PrecoVenda',
      'IdProduto',                            item->'IdProduto',
      'CodigoXbz',                            item->'CodigoXbz',
      'StatusConfiabilidade',                 item->'StatusConfiabilidade'
    )),
    stock_data = COALESCE(spr.stock_data, '{}'::jsonb) || jsonb_strip_nulls(jsonb_build_object(
      'QuantidadeDisponivel',                 item->'QuantidadeDisponivel',
      'QuantidadeDisponivelEstoquePrincipal', item->'QuantidadeDisponivelEstoquePrincipal',
      'ReposicaoDataPrevista',                item->'ReposicaoDataPrevista',
      'Disponivel',                           item->'Disponivel'
    )),
    stock_synced_at = now(),
    updated_at = now()
  FROM jsonb_array_elements(p_items) AS item
  WHERE spr.supplier_id = p_supplier_id
    AND spr.supplier_sku = item->>'CodigoComposto'
    AND spr.raw_data IS NOT NULL
    -- no-op guard: só escreve quando algum campo espelhado realmente mudou
    AND (
      spr.raw_data->'QuantidadeDisponivel'                 IS DISTINCT FROM item->'QuantidadeDisponivel' OR
      spr.raw_data->'QuantidadeDisponivelEstoquePrincipal' IS DISTINCT FROM item->'QuantidadeDisponivelEstoquePrincipal' OR
      spr.raw_data->'ReposicaoDataPrevista'                IS DISTINCT FROM item->'ReposicaoDataPrevista' OR
      spr.raw_data->'Multiplos'                            IS DISTINCT FROM item->'Multiplos' OR
      spr.raw_data->'VendaMinima'                          IS DISTINCT FROM item->'VendaMinima' OR
      spr.raw_data->'Disponivel'                           IS DISTINCT FROM item->'Disponivel' OR
      spr.raw_data->'IpiTaxa'                              IS DISTINCT FROM item->'IpiTaxa' OR
      spr.raw_data->'PrecoVenda'                           IS DISTINCT FROM item->'PrecoVenda' OR
      spr.raw_data->'IdProduto'                            IS DISTINCT FROM item->'IdProduto' OR
      spr.raw_data->'CodigoXbz'                            IS DISTINCT FROM item->'CodigoXbz' OR
      spr.raw_data->'StatusConfiabilidade'                 IS DISTINCT FROM item->'StatusConfiabilidade'
    );

  GET DIAGNOSTICS v_updated = ROW_COUNT;

  RETURN jsonb_build_object(
    'updated',     v_updated,
    'total_input', jsonb_array_length(p_items),
    'skipped_noop', jsonb_array_length(p_items) - v_updated,
    'campos',      'tipos JSON preservados; estoque espelhado em stock_data; sem _ruiz_sync_at',
    'ts',          now()
  );
END $$;
