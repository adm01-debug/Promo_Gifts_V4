-- Melhoria 1/4 (hardening) — guards constraint-safe.
-- fix_version=2026-06-26_status_guards_respect_errors
-- Descoberto em teste: chk_spr_no_processed_with_errors proíbe processed+process_errors.
-- Os guards (1ª vinculação / re-land) NÃO devem forçar 'processed' enquanto houver
-- process_errors (senão violam o constraint e abortam o promote). Solução: só
-- auto-promover quando process_errors IS NULL. Respeita o estado de erro e preserva
-- a info do erro; o fix do re-drift SM permanece (aquelas linhas não têm erro).
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
BEGIN
  IF NEW.raw_data ? '_source' AND COALESCE(NEW.source_channel,'') IN ('','n8n','legacy') THEN
    NEW.source_channel := NEW.raw_data->>'_source';
  END IF;
  IF NEW.raw_data ? '_imported_at' AND NEW.imported_at IS NULL THEN
    BEGIN NEW.imported_at := (NEW.raw_data->>'_imported_at')::timestamptz;
    EXCEPTION WHEN others THEN NULL; END;
  END IF;

  v_clean := NEW.raw_data;
  FOR v_k IN SELECT k FROM jsonb_object_keys(NEW.raw_data) k WHERE left(k,1) = '_' LOOP
    v_clean := v_clean - v_k;
  END LOOP;
  NEW.raw_data := v_clean;

  SELECT ss.hash_excluded_fields INTO v_excl
    FROM public.supplier_settings ss
   WHERE ss.supplier_id = NEW.supplier_id;
  v_hashbase := CASE WHEN v_excl IS NOT NULL AND array_length(v_excl,1) > 0
                     THEN v_clean - v_excl ELSE v_clean END;
  NEW.content_hash := encode(extensions.digest(v_hashbase::text, 'sha256'), 'hex');

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

    -- INVARIANTE 1ª VINCULAÇÃO (fix_version=2026-06-26_status_on_link) — ANTI-REGRESSÃO: NÃO REMOVER.
    -- Só promove se não houver erro ativo (respeita chk_spr_no_processed_with_errors).
    IF NEW.product_id IS NOT NULL AND OLD.product_id IS NULL
       AND NEW.status IN ('pending'::supplier_raw_status,'processing'::supplier_raw_status)
       AND NEW.process_errors IS NULL THEN
      NEW.status := 'processed'::supplier_raw_status;
    END IF;

    -- RE-LAND GUARD (fix_version=2026-06-26_status_reland_guard) — ANTI-REGRESSÃO: NÃO REMOVER.
    -- Re-enqueue espúrio (linha já vinculada, conteúdo inalterado) e SEM erro ativo => processed.
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
END $function$;;
