-- audit r3 — short-circuit em fn_spr_before_write
--
-- Problema: o ingestor (N8N) faz UPSERT de ~19,6 k produtos a cada ciclo.
-- Quando o produto não mudou, o trigger executava todo o processamento e
-- escrevia uma nova row version mesmo sem alterar nenhum campo útil.
-- Isso gerou 476 M non-HOT UPDATEs e 283 KB WAL por invocação.
--
-- Solução: após calcular o content_hash, verificar se UPDATE sem mudança real.
-- Se hash + colunas de controle idênticos, RETURN NULL aborta o UPDATE no
-- Postgres antes de tocar no WAL.
--
-- Exceção RE-LAND GUARD: quando product_id IS NOT NULL e status = 'pending',
-- o guard interno muda status → 'processed'. O short-circuit exclui esse caso
-- para não bloquear a guard.
--
-- Validado em: 2026-09-05 (simulação manual de todos os cenários do trigger).

CREATE OR REPLACE FUNCTION public.fn_spr_before_write()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  v_clean    jsonb;
  v_hashbase jsonb;
  v_excl     text[];
  v_k        text;
  v_cached   text;
  v_cfg_key  text;
BEGIN
  -- ── Normalizar source_channel e imported_at ────────────────────────────
  IF NEW.raw_data ? '_source' AND COALESCE(NEW.source_channel,'') IN ('','n8n','legacy') THEN
    NEW.source_channel := NEW.raw_data->>'_source';
  END IF;
  IF NEW.raw_data ? '_imported_at' AND NEW.imported_at IS NULL THEN
    BEGIN NEW.imported_at := (NEW.raw_data->>'_imported_at')::timestamptz;
    EXCEPTION WHEN others THEN NULL; END;
  END IF;

  -- ── Limpar chaves internas (_*) do raw_data ───────────────────────────
  v_clean := NEW.raw_data;
  FOR v_k IN SELECT k FROM jsonb_object_keys(NEW.raw_data) k WHERE left(k,1) = '_' LOOP
    v_clean := v_clean - v_k;
  END LOOP;
  NEW.raw_data := v_clean;

  -- ── Session-level cache para supplier_settings ────────────────────────
  -- fix_version: spr_before_write_session_cache_20260627
  -- Converte supplier_id UUID para chave GUC válida (sem hífens).
  -- Cache persiste por conexão/sessão (is_local=false), sobrevive a commits.
  -- Cada fornecedor gera 1 lookup por sessão em vez de 1 por row.
  -- ANTI-REGRESSÃO: manter o EXCEPTION WHEN undefined_object abaixo.
  IF NEW.supplier_id IS NOT NULL THEN
    v_cfg_key := 'app.spr_excl_' || replace(NEW.supplier_id::text, '-', '_');
    BEGIN
      v_cached := current_setting(v_cfg_key);
    EXCEPTION WHEN undefined_object THEN
      v_cached := NULL;
    END;

    IF v_cached IS NULL THEN
      -- Cache MISS: único SELECT por supplier por sessão
      SELECT COALESCE(array_to_string(ss.hash_excluded_fields, ','), '')
      INTO v_cached
      FROM public.supplier_settings ss
      WHERE ss.supplier_id = NEW.supplier_id;
      -- is_local=false → persiste para a sessão inteira (não é revertido em ROLLBACK)
      PERFORM set_config(v_cfg_key, COALESCE(v_cached, ''), false);
    END IF;

    IF v_cached IS NOT NULL AND v_cached <> '' THEN
      v_excl := string_to_array(v_cached, ',');
    ELSE
      v_excl := NULL;
    END IF;
  END IF;

  -- ── Calcular content_hash ─────────────────────────────────────────────
  v_hashbase := CASE WHEN v_excl IS NOT NULL AND array_length(v_excl,1) > 0
                     THEN v_clean - v_excl ELSE v_clean END;
  NEW.content_hash := encode(extensions.digest(v_hashbase::text, 'sha256'), 'hex');

  -- ── Short-circuit UPDATE sem mudança real ─────────────────────────────
  -- Evita non-HOT UPDATEs/WAL quando o ingestor reprocessa dados idênticos.
  -- Exceção RE-LAND GUARD: product_id IS NOT NULL + status = 'pending' →
  -- o guard abaixo muda para 'processed'; não cortamos esse caso.
  IF TG_OP = 'UPDATE'
     AND NEW.content_hash         IS NOT DISTINCT FROM OLD.content_hash
     AND NEW.source_channel       IS NOT DISTINCT FROM OLD.source_channel
     AND NEW.process_errors       IS NOT DISTINCT FROM OLD.process_errors
     AND NEW.status               IS NOT DISTINCT FROM OLD.status
     AND NEW.product_id           IS NOT DISTINCT FROM OLD.product_id
     AND NEW.supplier_id          IS NOT DISTINCT FROM OLD.supplier_id
     AND NOT (NEW.product_id IS NOT NULL AND NEW.status = 'pending'::supplier_raw_status)
  THEN
    RETURN NULL;
  END IF;

  -- ── Lógica de INSERT ──────────────────────────────────────────────────
  IF TG_OP = 'INSERT' THEN
    NEW.imported_at := COALESCE(NEW.imported_at, now());
    IF NEW.process_errors IS NOT NULL AND NEW.last_error IS NULL THEN
      NEW.last_error := NEW.process_errors;
    END IF;
  ELSE
    -- ── Lógica de UPDATE ──────────────────────────────────────────────
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

    -- INVARIANTE 1ª VINCULAÇÃO (fix_version=2026-06-26_status_on_link) — ANTI-REGRESSÃO: NÃO REMOVER.
    IF NEW.product_id IS NOT NULL AND OLD.product_id IS NULL
       AND NEW.status IN ('pending'::supplier_raw_status,'processing'::supplier_raw_status)
       AND NEW.process_errors IS NULL THEN
      NEW.status := 'processed'::supplier_raw_status;
    END IF;

    -- RE-LAND GUARD (fix_version=2026-06-26_status_reland_guard) — ANTI-REGRESSÃO: NÃO REMOVER.
    IF NEW.product_id IS NOT NULL
       AND NEW.status = 'pending'::supplier_raw_status
       AND NEW.content_hash IS NOT DISTINCT FROM OLD.content_hash
       AND NEW.process_errors IS NULL THEN
      NEW.status := 'processed'::supplier_raw_status;
    END IF;

    IF NEW.status = 'processed'::supplier_raw_status
       AND NEW.status IS DISTINCT FROM OLD.status THEN
      NEW.processed_at := COALESCE(NEW.processed_at, now());
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;
