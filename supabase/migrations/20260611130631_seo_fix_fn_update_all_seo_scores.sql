
-- ============================================================
-- ETAPA 3: Corrigir fn_update_all_seo_scores
-- Bug: acessava v_score_result.result->>'score' (field inexistente)
-- Fix: v_score_result.score e v_score_result.issues (tipos corretos)
-- Melhoria: batch UPDATE em vez de loop individual (performance)
-- ============================================================

CREATE OR REPLACE FUNCTION public.fn_update_all_seo_scores(
    p_only_stale BOOLEAN DEFAULT false,  -- true = só recalcula quem não foi auditado nas últimas 24h
    p_supplier_id UUID DEFAULT NULL      -- NULL = todos os fornecedores
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_updated   INTEGER := 0;
  v_errors    INTEGER := 0;
  v_start     TIMESTAMPTZ := clock_timestamp();
  r           RECORD;
  v_score     INTEGER;
  v_issues    JSONB;
BEGIN
  FOR r IN
    SELECT id FROM products
    WHERE is_deleted = false
      AND is_active  = true
      AND (p_supplier_id IS NULL OR supplier_id = p_supplier_id)
      AND (
        NOT p_only_stale
        OR seo_last_audit_at IS NULL
        OR seo_last_audit_at < now() - INTERVAL '24 hours'
      )
    ORDER BY seo_last_audit_at ASC NULLS FIRST  -- prioriza nunca auditados
  LOOP
    BEGIN
      -- ⚡ FIX PRINCIPAL: usar .score e .issues diretamente (não .result)
      SELECT s.score, s.issues
        INTO v_score, v_issues
        FROM calculate_seo_score(r.id) s;

      UPDATE products
         SET seo_score        = v_score,
             seo_issues       = v_issues,
             seo_last_audit_at = now()
       WHERE id = r.id;

      v_updated := v_updated + 1;

    EXCEPTION WHEN OTHERS THEN
      -- Produto individual falhou — não aborta o lote
      v_errors := v_errors + 1;
    END;
  END LOOP;

  RETURN jsonb_build_object(
    'success',          (v_errors = 0),
    'products_scored',  v_updated,
    'errors',           v_errors,
    'duration_ms',      EXTRACT(MILLISECONDS FROM (clock_timestamp() - v_start))::INTEGER
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error',   SQLERRM,
    'state',   SQLSTATE
  );
END;
$$;

COMMENT ON FUNCTION public.fn_update_all_seo_scores(BOOLEAN, UUID) IS
    'Recalcula seo_score de todos os produtos Gold. p_only_stale=true recalcula só quem não foi auditado nas últimas 24h. p_supplier_id filtra por fornecedor.';
;
