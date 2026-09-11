-- ═══════════════════════════════════════════════════════════════════════
-- SEO M3: seo_audit_log com persistência + fn_update_all_seo_scores melhorado
-- fix_version: seo_audit_log_v1_20260627
-- Mudança: loop em fn_update_all_seo_scores agora insere em seo_audit_log
--           com previous_score, issues e meta_snapshot por produto
-- ═══════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.fn_update_all_seo_scores(
  p_only_stale  BOOLEAN DEFAULT FALSE,
  p_supplier_id UUID    DEFAULT NULL
)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
-- fix_version: seo_audit_log_v1_20260627
-- anti-regression: INSERT em seo_audit_log dentro do loop deve permanecer
-- audit_trigger deve ser 'scheduled' (constraint: manual|insert|update|scheduled)
DECLARE
  v_updated   INTEGER := 0;
  v_errors    INTEGER := 0;
  v_start     TIMESTAMPTZ := clock_timestamp();
  r           RECORD;
  v_score     INTEGER;
  v_issues    JSONB;
BEGIN
  FOR r IN
    SELECT id, COALESCE(seo_score, 0) AS prev_score, slug, meta_title
    FROM products
    WHERE is_deleted = false
      AND is_active  = true
      AND (p_supplier_id IS NULL OR supplier_id = p_supplier_id)
      AND (
        NOT p_only_stale
        OR seo_last_audit_at IS NULL
        OR seo_last_audit_at < now() - INTERVAL '24 hours'
      )
    ORDER BY seo_last_audit_at ASC NULLS FIRST
  LOOP
    BEGIN
      SELECT s.score, s.issues INTO v_score, v_issues
        FROM calculate_seo_score(r.id) s;

      UPDATE products
         SET seo_score         = v_score,
             seo_issues        = v_issues,
             seo_last_audit_at = now()
       WHERE id = r.id;

      -- Persistir histórico de auditoria
      INSERT INTO seo_audit_log (
        id, entity_type, entity_id,
        seo_score, previous_score,
        issues, warnings, passed_checks, suggestions,
        meta_snapshot, audited_at, audit_trigger
      ) VALUES (
        gen_random_uuid(),
        'product',
        r.id,
        v_score,
        r.prev_score,
        COALESCE(v_issues, '[]'::jsonb),
        '[]'::jsonb,
        '[]'::jsonb,
        '[]'::jsonb,
        jsonb_build_object(
          'slug',       r.slug,
          'meta_title', r.meta_title,
          'scored_at',  now()
        ),
        now(),
        'scheduled'
      );

      v_updated := v_updated + 1;

    EXCEPTION WHEN OTHERS THEN
      v_errors := v_errors + 1;
    END;
  END LOOP;

  RETURN jsonb_build_object(
    'success',         (v_errors = 0),
    'products_scored', v_updated,
    'errors',          v_errors,
    'duration_ms',     EXTRACT(MILLISECONDS FROM (clock_timestamp() - v_start))::INTEGER
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM, 'state', SQLSTATE);
END;
$function$;;
