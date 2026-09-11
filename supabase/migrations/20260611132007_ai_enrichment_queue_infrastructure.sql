
-- ============================================================
-- ETAPA 1: Infraestrutura completa de fila AI Enrichment
-- ============================================================

-- -------------------------------------------------------
-- 1A. TABELA: ai_enrichment_queue
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ai_enrichment_queue (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id      UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    enrichment_type TEXT NOT NULL,       -- 'ai_title' | 'ai_summary' | 'schema_json' | 'all'
    status          TEXT NOT NULL DEFAULT 'pending',
    priority        INTEGER DEFAULT 5,   -- 1=mais urgente, 10=menos urgente
    attempts        INTEGER DEFAULT 0,
    max_attempts    INTEGER DEFAULT 3,
    last_error      TEXT,
    last_attempt_at TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now(),
    completed_at    TIMESTAMPTZ,
    locked_at       TIMESTAMPTZ,         -- advisory lock moment
    locked_by       TEXT,               -- n8n execution ID
    organization_id UUID DEFAULT '5db5aee1-064b-4ef4-9193-345dcd8274ea'::uuid,

    CONSTRAINT chk_enrichment_type CHECK (enrichment_type IN ('ai_title','ai_summary','schema_json','all')),
    CONSTRAINT chk_status CHECK (status IN ('pending','processing','done','error','skipped')),
    CONSTRAINT uq_product_enrichment_type UNIQUE (product_id, enrichment_type)
);

CREATE INDEX IF NOT EXISTS idx_ai_queue_pending
    ON public.ai_enrichment_queue (priority ASC, created_at ASC)
    WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_ai_queue_product_id
    ON public.ai_enrichment_queue (product_id);

CREATE INDEX IF NOT EXISTS idx_ai_queue_status
    ON public.ai_enrichment_queue (status, updated_at);

COMMENT ON TABLE public.ai_enrichment_queue IS
    'Fila de enriquecimento AI (DeepSeek). Registros pendentes são consumidos pelo n8n e resultados salvos via fn_save_ai_enrichment_results.';

-- -------------------------------------------------------
-- 1B. FUNÇÃO: fn_enqueue_ai_enrichment
-- Enfileira produtos que precisam de enriquecimento AI
-- -------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_enqueue_ai_enrichment(
    p_enrichment_type TEXT DEFAULT 'all',   -- 'ai_title' | 'ai_summary' | 'schema_json' | 'all'
    p_supplier_id     UUID DEFAULT NULL,     -- NULL = todos
    p_limit           INTEGER DEFAULT 5000,  -- máx produtos a enfileirar por chamada
    p_priority        INTEGER DEFAULT 5
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_inserted  INTEGER := 0;
    v_skipped   INTEGER := 0;
    v_start     TIMESTAMPTZ := clock_timestamp();
BEGIN
    INSERT INTO ai_enrichment_queue (product_id, enrichment_type, status, priority)
    SELECT
        p.id,
        p_enrichment_type,
        'pending',
        p_priority
    FROM products p
    WHERE p.is_active  = true
      AND p.is_deleted = false
      AND (p_supplier_id IS NULL OR p.supplier_id = p_supplier_id)
      AND p.name IS NOT NULL
      -- Condição por tipo de enriquecimento
      AND CASE p_enrichment_type
            WHEN 'ai_title'   THEN (p.ai_title   IS NULL OR LENGTH(TRIM(p.ai_title))   = 0)
            WHEN 'ai_summary' THEN (p.ai_summary  IS NULL OR LENGTH(TRIM(p.ai_summary)) = 0)
            WHEN 'schema_json' THEN p.schema_json IS NULL
            WHEN 'all'        THEN (
                (p.ai_title   IS NULL OR LENGTH(TRIM(p.ai_title))   = 0) OR
                (p.ai_summary  IS NULL OR LENGTH(TRIM(p.ai_summary)) = 0) OR
                p.schema_json IS NULL
            )
            ELSE true
          END
      -- Não re-enfileirar quem já está na fila
      AND NOT EXISTS (
          SELECT 1 FROM ai_enrichment_queue q
          WHERE q.product_id = p.id
            AND q.enrichment_type = p_enrichment_type
            AND q.status IN ('pending', 'processing')
      )
    LIMIT p_limit
    ON CONFLICT (product_id, enrichment_type) DO NOTHING;

    GET DIAGNOSTICS v_inserted = ROW_COUNT;

    -- Contar quantos já estavam
    SELECT COUNT(*) INTO v_skipped
    FROM ai_enrichment_queue
    WHERE enrichment_type = p_enrichment_type
      AND status IN ('pending', 'processing');

    RETURN jsonb_build_object(
        'success',          true,
        'newly_enqueued',   v_inserted,
        'total_in_queue',   v_skipped,
        'enrichment_type',  p_enrichment_type,
        'duration_ms',      EXTRACT(MILLISECONDS FROM (clock_timestamp() - v_start))::INTEGER
    );

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- -------------------------------------------------------
-- 1C. FUNÇÃO: fn_dequeue_ai_enrichment
-- Consumida pelo n8n: busca próximo lote e marca como 'processing'
-- -------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_dequeue_ai_enrichment(
    p_batch_size    INTEGER DEFAULT 5,
    p_locked_by     TEXT    DEFAULT 'n8n',
    p_enrichment_type TEXT  DEFAULT 'all'  -- 'all' = qualquer tipo
)
RETURNS TABLE (
    queue_id        UUID,
    product_id      UUID,
    product_name    TEXT,
    sku             TEXT,
    supplier_ref    TEXT,
    description     TEXT,
    short_desc      TEXT,
    category_name   TEXT,
    brand           TEXT,
    materials       JSONB,
    dimensions      TEXT,
    allows_person   BOOLEAN,
    enrichment_type TEXT,
    ai_title_exists BOOLEAN,
    ai_summary_exists BOOLEAN,
    schema_exists   BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    WITH dequeued AS (
        UPDATE ai_enrichment_queue q
        SET
            status          = 'processing',
            locked_at       = now(),
            locked_by       = p_locked_by,
            last_attempt_at = now(),
            attempts        = attempts + 1,
            updated_at      = now()
        WHERE q.id IN (
            SELECT id FROM ai_enrichment_queue
            WHERE status = 'pending'
              AND attempts < max_attempts
              AND (p_enrichment_type = 'all' OR enrichment_type = p_enrichment_type)
            ORDER BY priority ASC, created_at ASC
            LIMIT p_batch_size
            FOR UPDATE SKIP LOCKED
        )
        RETURNING q.id, q.product_id, q.enrichment_type
    )
    SELECT
        d.id,
        p.id,
        p.name,
        p.sku,
        p.supplier_reference,
        p.description,
        p.short_description,
        c.name,
        p.brand,
        p.materials,
        p.dimensions_display,
        COALESCE(p.allows_personalization, false),
        d.enrichment_type,
        (p.ai_title IS NOT NULL AND LENGTH(TRIM(COALESCE(p.ai_title,''))) > 0),
        (p.ai_summary IS NOT NULL AND LENGTH(TRIM(COALESCE(p.ai_summary,''))) > 0),
        (p.schema_json IS NOT NULL)
    FROM dequeued d
    JOIN products p ON p.id = d.product_id
    LEFT JOIN categories c ON c.id = COALESCE(p.main_category_id, p.category_id);
END;
$$;

-- -------------------------------------------------------
-- 1D. FUNÇÃO: fn_save_ai_enrichment_results
-- Chamada pelo n8n após receber resposta do DeepSeek
-- -------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_save_ai_enrichment_results(
    p_queue_id      UUID,
    p_product_id    UUID,
    p_ai_title      TEXT    DEFAULT NULL,
    p_ai_summary    TEXT    DEFAULT NULL,
    p_schema_json   JSONB   DEFAULT NULL,
    p_ai_model      TEXT    DEFAULT 'deepseek-chat',
    p_success       BOOLEAN DEFAULT true,
    p_error         TEXT    DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_updated INTEGER := 0;
BEGIN
    IF p_success THEN
        -- Salvar resultados no produto (só campos que vieram preenchidos)
        UPDATE products
        SET
            ai_title         = COALESCE(NULLIF(TRIM(p_ai_title), ''), ai_title),
            ai_summary       = COALESCE(NULLIF(TRIM(p_ai_summary), ''), ai_summary),
            schema_json      = COALESCE(p_schema_json, schema_json),
            ai_version       = COALESCE(ai_version, 0) + 1,
            ai_generated_at  = now(),
            ai_model         = p_ai_model,
            updated_at       = now()
        WHERE id = p_product_id;

        GET DIAGNOSTICS v_updated = ROW_COUNT;

        -- Marcar fila como done
        UPDATE ai_enrichment_queue
        SET
            status       = 'done',
            completed_at = now(),
            updated_at   = now()
        WHERE id = p_queue_id;

    ELSE
        -- Registrar erro
        UPDATE ai_enrichment_queue
        SET
            status          = CASE WHEN attempts >= max_attempts THEN 'error' ELSE 'pending' END,
            last_error      = p_error,
            updated_at      = now()
        WHERE id = p_queue_id;
    END IF;

    RETURN jsonb_build_object(
        'success',   p_success,
        'updated',   v_updated,
        'queue_id',  p_queue_id,
        'product_id', p_product_id
    );

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- -------------------------------------------------------
-- 1E. VIEW: vw_ai_enrichment_status (monitoramento)
-- -------------------------------------------------------
CREATE OR REPLACE VIEW public.vw_ai_enrichment_status AS
WITH queue_stats AS (
    SELECT
        enrichment_type,
        COUNT(*) FILTER (WHERE status = 'pending')    AS pending,
        COUNT(*) FILTER (WHERE status = 'processing') AS processing,
        COUNT(*) FILTER (WHERE status = 'done')       AS done,
        COUNT(*) FILTER (WHERE status = 'error')      AS errors,
        COUNT(*) FILTER (WHERE status = 'skipped')    AS skipped,
        COUNT(*)                                       AS total,
        MAX(completed_at)                              AS last_completed_at
    FROM ai_enrichment_queue
    GROUP BY enrichment_type
),
product_coverage AS (
    SELECT
        COUNT(*) FILTER (WHERE ai_title   IS NOT NULL AND LENGTH(TRIM(ai_title)) > 0)    AS has_ai_title,
        COUNT(*) FILTER (WHERE ai_summary IS NOT NULL AND LENGTH(TRIM(ai_summary)) > 0)  AS has_ai_summary,
        COUNT(*) FILTER (WHERE schema_json IS NOT NULL)                                  AS has_schema_json,
        COUNT(*) AS total
    FROM products
    WHERE is_active = true AND is_deleted = false
)
SELECT
    q.enrichment_type,
    q.pending,
    q.processing,
    q.done,
    q.errors,
    q.total AS total_queued,
    q.last_completed_at,
    CASE q.enrichment_type
        WHEN 'ai_title'    THEN pc.has_ai_title
        WHEN 'ai_summary'  THEN pc.has_ai_summary
        WHEN 'schema_json' THEN pc.has_schema_json
        ELSE NULL
    END AS products_with_field,
    pc.total AS total_products,
    ROUND(
        CASE q.enrichment_type
            WHEN 'ai_title'    THEN pc.has_ai_title * 100.0 / NULLIF(pc.total, 0)
            WHEN 'ai_summary'  THEN pc.has_ai_summary * 100.0 / NULLIF(pc.total, 0)
            WHEN 'schema_json' THEN pc.has_schema_json * 100.0 / NULLIF(pc.total, 0)
        END, 1
    ) AS pct_coverage
FROM queue_stats q
CROSS JOIN product_coverage pc
ORDER BY q.enrichment_type;

COMMENT ON VIEW public.vw_ai_enrichment_status IS
    'Monitoramento da fila AI Enrichment — cobertura por campo e status da fila';

-- -------------------------------------------------------
-- 1F. pg_cron: Auto-enqueue diário às 04:00
-- (garante que novos produtos sempre entram na fila)
-- -------------------------------------------------------
SELECT cron.schedule(
    'ai-enqueue-daily',
    '0 4 * * *',
    $cron$
    SELECT fn_enqueue_ai_enrichment('all', NULL, 5000, 5);
    $cron$
);
;
