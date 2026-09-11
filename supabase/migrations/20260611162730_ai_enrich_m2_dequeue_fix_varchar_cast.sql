
-- Fix: cast explícito TEXT em todas as colunas VARCHAR para eliminar type mismatch
DROP FUNCTION IF EXISTS public.fn_dequeue_ai_enrichment(INTEGER, TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.fn_dequeue_ai_enrichment(
    p_batch_size        INTEGER DEFAULT 5,
    p_locked_by         TEXT    DEFAULT 'n8n',
    p_enrichment_type   TEXT    DEFAULT 'all'
)
RETURNS TABLE (
    queue_id              UUID,
    product_id            UUID,
    product_name          TEXT,
    sku                   TEXT,
    supplier_ref          TEXT,
    description           TEXT,
    short_desc            TEXT,
    brand                 TEXT,
    materials             JSONB,
    dimensions_display    TEXT,
    capacity_ml           INTEGER,
    weight_g              INTEGER,
    allows_person         BOOLEAN,
    category_id           UUID,
    category_name         TEXT,
    category_path         TEXT,
    ai_version_current    INTEGER,
    ai_title_exists       BOOLEAN,
    ai_description_exists BOOLEAN,
    ai_summary_exists     BOOLEAN,
    schema_exists         BOOLEAN,
    enrichment_type       TEXT,
    copywriting_config    JSONB,
    raw_data_snapshot     JSONB
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
            attempts        = q.attempts + 1,
            updated_at      = now()
        WHERE q.id IN (
            SELECT iq.id FROM ai_enrichment_queue iq
            WHERE iq.status = 'pending'
              AND iq.attempts < iq.max_attempts
              AND (p_enrichment_type = 'all' OR iq.enrichment_type = p_enrichment_type)
            ORDER BY iq.priority ASC, iq.created_at ASC
            LIMIT p_batch_size
            FOR UPDATE SKIP LOCKED
        )
        RETURNING q.id, q.product_id, q.enrichment_type AS q_enrichment_type
    )
    SELECT
        d.id,
        p.id,
        p.name::TEXT,
        p.sku::TEXT,
        p.supplier_reference::TEXT,      -- VARCHAR(50) → TEXT
        p.description::TEXT,
        p.short_description::TEXT,
        p.brand::TEXT,
        p.materials,
        p.dimensions_display::TEXT,
        p.capacity_ml,
        p.weight_g,
        COALESCE(p.allows_personalization, false),
        COALESCE(p.main_category_id, p.category_id),
        c.name::TEXT,
        c.full_path_readable::TEXT,
        COALESCE(p.ai_version, 0),
        (p.ai_title IS NOT NULL AND LENGTH(TRIM(COALESCE(p.ai_title,''))) > 0),
        (p.ai_description IS NOT NULL AND LENGTH(TRIM(COALESCE(p.ai_description,''))) > 0),
        (p.ai_summary IS NOT NULL AND LENGTH(TRIM(COALESCE(p.ai_summary,''))) > 0),
        (p.schema_json IS NOT NULL),
        d.q_enrichment_type::TEXT,
        public.get_copywriting_config(COALESCE(p.main_category_id, p.category_id)),
        (
            SELECT jsonb_build_object(
                'Area1',                    spr.raw_data->>'Area1',
                'Area2',                    spr.raw_data->>'Area2',
                'CustomizationTypes',       spr.raw_data->>'CustomizationTypes',
                'CustomizationDefaultType', spr.raw_data->>'CustomizationDefaultType',
                'DefaultCustomization',     spr.raw_data->>'DefaultCustomization',
                'ProductComponents',        spr.raw_data->>'ProductComponents',
                'ProductCertifications',    spr.raw_data->>'ProductCertifications',
                'Certificates',             spr.raw_data->>'Certificates',
                'Materials',                spr.raw_data->>'Materials',
                'Capacity',                 spr.raw_data->>'Capacity',
                'WeightGr',                 spr.raw_data->>'WeightGr',
                'KeyWords',                 spr.raw_data->>'KeyWords',
                'Properties',               spr.raw_data->>'Properties',
                'Type',                     spr.raw_data->>'Type',
                'SubType',                  spr.raw_data->>'SubType',
                'CountryOfOrigin',          spr.raw_data->>'CountryOfOrigin',
                'Brand',                    spr.raw_data->>'Brand',
                'CombinedSizes',            spr.raw_data->>'CombinedSizes'
            )
            FROM supplier_products_raw spr
            WHERE spr.product_id = p.id
            ORDER BY spr.updated_at DESC NULLS LAST
            LIMIT 1
        )
    FROM dequeued d
    JOIN products p ON p.id = d.product_id
    LEFT JOIN categories c ON c.id = COALESCE(p.main_category_id, p.category_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_dequeue_ai_enrichment(INTEGER, TEXT, TEXT)
    TO anon, service_role;

-- Recarregar schema cache do PostgREST
NOTIFY pgrst, 'reload schema';
;
