
-- ============================================================
-- MELHORIA 1: fn_enqueue_ai_enrichment v2
-- Fix S10: ON CONFLICT agora reseta 'error' para 'pending'
-- Fix: parâmetro p_force_version_zero para forçar ai_version=0
-- Fix: enfileirar também produtos com ai_version=0 (nunca reais)
-- ============================================================

CREATE OR REPLACE FUNCTION public.fn_enqueue_ai_enrichment(
    p_enrichment_type       TEXT    DEFAULT 'all',
    p_supplier_id           UUID    DEFAULT NULL,
    p_limit                 INTEGER DEFAULT 5000,
    p_priority              INTEGER DEFAULT 5,
    p_force_version_zero    BOOLEAN DEFAULT true   -- inclui ai_version=0 mesmo com campos preenchidos
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_inserted  INTEGER := 0;
    v_reset     INTEGER := 0;
    v_skipped   INTEGER := 0;
    v_start     TIMESTAMPTZ := clock_timestamp();
BEGIN
    -- ─────────────────────────────────────────────────────────
    -- 1. Inserir novos produtos pendentes
    -- ─────────────────────────────────────────────────────────
    WITH eligible AS (
        SELECT p.id AS product_id
        FROM products p
        WHERE p.is_active  = true
          AND p.is_deleted = false
          AND p.name IS NOT NULL
          AND (p_supplier_id IS NULL OR p.supplier_id = p_supplier_id)
          AND (
            -- Condição principal por tipo
            CASE p_enrichment_type
              WHEN 'ai_title' THEN
                (p.ai_title IS NULL OR LENGTH(TRIM(p.ai_title)) = 0
                 OR (p_force_version_zero AND p.ai_version = 0))
              WHEN 'ai_description' THEN
                (p.ai_description IS NULL OR LENGTH(TRIM(p.ai_description)) = 0
                 OR (p_force_version_zero AND p.ai_version = 0))
              WHEN 'ai_summary' THEN
                (p.ai_summary IS NULL OR LENGTH(TRIM(p.ai_summary)) = 0)
              WHEN 'schema_json' THEN
                p.schema_json IS NULL
              WHEN 'all' THEN (
                (p.ai_title IS NULL OR LENGTH(TRIM(p.ai_title)) = 0
                 OR (p_force_version_zero AND p.ai_version = 0))
                OR (p.ai_description IS NULL OR LENGTH(TRIM(p.ai_description)) = 0)
                OR (p.ai_summary IS NULL OR LENGTH(TRIM(p.ai_summary)) = 0)
                OR p.schema_json IS NULL
              )
              ELSE true
            END
          )
        LIMIT p_limit
    )
    INSERT INTO ai_enrichment_queue
        (product_id, enrichment_type, status, priority, attempts, max_attempts)
    SELECT
        e.product_id,
        p_enrichment_type,
        'pending',
        p_priority,
        0,
        3
    FROM eligible e
    ON CONFLICT (product_id, enrichment_type) DO UPDATE
        -- Resetar produtos com erro para tentar novamente
        SET status      = CASE
                            WHEN EXCLUDED.status = 'pending'
                             AND ai_enrichment_queue.status = 'error'
                            THEN 'pending'
                            ELSE ai_enrichment_queue.status
                          END,
            priority    = CASE
                            WHEN ai_enrichment_queue.status = 'error'
                            THEN EXCLUDED.priority
                            ELSE ai_enrichment_queue.priority
                          END,
            attempts    = CASE
                            WHEN ai_enrichment_queue.status = 'error'
                            THEN 0
                            ELSE ai_enrichment_queue.attempts
                          END,
            updated_at  = CASE
                            WHEN ai_enrichment_queue.status = 'error'
                            THEN now()
                            ELSE ai_enrichment_queue.updated_at
                          END;

    GET DIAGNOSTICS v_inserted = ROW_COUNT;

    -- ─────────────────────────────────────────────────────────
    -- 2. Contar status da fila
    -- ─────────────────────────────────────────────────────────
    SELECT
        COUNT(*) FILTER (WHERE status = 'pending')    INTO v_skipped
    FROM ai_enrichment_queue
    WHERE enrichment_type = p_enrichment_type;

    RETURN jsonb_build_object(
        'success',          true,
        'upserted',         v_inserted,
        'pending_in_queue', v_skipped,
        'enrichment_type',  p_enrichment_type,
        'force_v0',         p_force_version_zero,
        'duration_ms',      EXTRACT(MILLISECONDS FROM (clock_timestamp() - v_start))::INTEGER
    );

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM, 'state', SQLSTATE);
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_enqueue_ai_enrichment(TEXT, UUID, INTEGER, INTEGER, BOOLEAN)
    TO anon, service_role;

COMMENT ON FUNCTION public.fn_enqueue_ai_enrichment(TEXT, UUID, INTEGER, INTEGER, BOOLEAN) IS
    'v2 — Enfileira produtos para enriquecimento AI.
     p_force_version_zero=true (default) inclui produtos com ai_version=0 mesmo com campos preenchidos.
     ON CONFLICT reseta status=error para status=pending automaticamente.';
;
