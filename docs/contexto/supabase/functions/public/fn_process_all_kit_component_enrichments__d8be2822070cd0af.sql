CREATE OR REPLACE FUNCTION public.fn_process_all_kit_component_enrichments(p_auto_approve boolean DEFAULT false)
 RETURNS TABLE(raw_id uuid, pad_id uuid, comp_id uuid, status text, error_msg text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_raw   kit_component_enrichment_raw%ROWTYPE;
  v_padid UUID; v_cmpid UUID; v_err TEXT;
BEGIN
  FOR v_raw IN
    SELECT * FROM kit_component_enrichment_raw WHERE processed = FALSE ORDER BY imported_at
  LOOP
    v_err := NULL; v_padid := NULL; v_cmpid := NULL;
    BEGIN
      v_padid := fn_standardize_kit_component(v_raw.id);
      IF p_auto_approve AND v_padid IS NOT NULL THEN
        UPDATE kit_component_padronizacao
        SET padronizacao_status = 'approved', reviewed_at = NOW() WHERE id = v_padid;
        v_cmpid := fn_promote_kit_component_padronizacao(v_padid);
      END IF;
      raw_id := v_raw.id; pad_id := v_padid; comp_id := v_cmpid;
      status := CASE WHEN v_cmpid IS NOT NULL THEN 'promoted'
                     WHEN v_padid IS NOT NULL THEN 'pending_review' ELSE 'skipped' END;
      error_msg := NULL; RETURN NEXT;
    EXCEPTION WHEN OTHERS THEN
      raw_id := v_raw.id; pad_id := v_padid; comp_id := NULL;
      status := 'error'; error_msg := SQLERRM; RETURN NEXT;
    END;
  END LOOP;
END;
$function$
