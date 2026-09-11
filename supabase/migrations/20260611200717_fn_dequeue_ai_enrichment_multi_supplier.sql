
-- FIX 6: fn_dequeue_ai_enrichment — enriquecer raw_data_snapshot para TODOS os fornecedores
-- Usa Gold fallbacks para campos que SPOT tem mas XBZ/SM/ASIA não têm no raw_data
CREATE OR REPLACE FUNCTION public.fn_dequeue_ai_enrichment(
    p_batch_size    integer DEFAULT 5,
    p_locked_by     text    DEFAULT 'n8n',
    p_enrichment_type text  DEFAULT 'all'
)
RETURNS TABLE(
    queue_id              uuid,
    product_id            uuid,
    product_name          text,
    sku                   text,
    supplier_ref          text,
    description           text,
    short_desc            text,
    brand                 text,
    materials             jsonb,
    dimensions_display    text,
    capacity_ml           integer,
    weight_g              integer,
    allows_person         boolean,
    category_id           uuid,
    category_name         text,
    category_path         text,
    ai_version_current    integer,
    ai_title_exists       boolean,
    ai_description_exists boolean,
    ai_summary_exists     boolean,
    schema_exists         boolean,
    enrichment_type       text,
    copywriting_config    jsonb,
    raw_data_snapshot     jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
        p.supplier_reference::TEXT,
        p.description::TEXT,
        p.short_description::TEXT,
        p.brand::TEXT,
        p.materials,
        COALESCE(p.dimensions_display, p.combined_sizes)::TEXT,
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
        -- raw_data_snapshot: SPOT campos nativos + Gold fallbacks para todos os fornecedores
        jsonb_strip_nulls(jsonb_build_object(
            -- Campos SPOT nativos (preenchidos via raw_data para STRICKER)
            'Area1',                    COALESCE(spr.raw_data->>'Area1',             p.engraving_type),
            'Area2',                    spr.raw_data->>'Area2',
            'CustomizationTypes',       COALESCE(spr.raw_data->>'CustomizationTypes', p.engraving_type),
            'CustomizationDefaultType', spr.raw_data->>'CustomizationDefaultType',
            'DefaultCustomization',     COALESCE(spr.raw_data->>'DefaultCustomization', p.engraving_description),
            'ProductComponents',        spr.raw_data->>'ProductComponents',
            'ProductCertifications',    spr.raw_data->>'ProductCertifications',
            'Certificates',             spr.raw_data->>'Certificates',
            'Materials',                COALESCE(spr.raw_data->>'Materials', p.materials::text),
            'Capacity',                 spr.raw_data->>'Capacity',
            'WeightGr',                 spr.raw_data->>'WeightGr',
            'KeyWords',                 spr.raw_data->>'KeyWords',
            'Properties',               spr.raw_data->>'Properties',
            -- Taxonomia: SPOT nativo OU Gold (agora populado para XBZ/SM/ASIA)
            'Type',                     COALESCE(spr.raw_data->>'Type',          p.supplier_type),
            'SubType',                  COALESCE(spr.raw_data->>'SubType',       p.supplier_subtype),
            -- Origem e marca
            'CountryOfOrigin',          COALESCE(spr.raw_data->>'CountryOfOrigin', p.origin_country),
            'Brand',                    COALESCE(spr.raw_data->>'Brand',            p.brand),
            -- Dimensões: SPOT CombinedSizes OU Gold combined_sizes/dimensions_display
            'CombinedSizes',            COALESCE(spr.raw_data->>'CombinedSizes',
                                                  p.combined_sizes,
                                                  p.dimensions_display),
            -- Extras canônicos (enriquecimento multi-fornecedor)
            'EngravingType',            p.engraving_type,
            'SupplierCode',             s.code,
            'SupplierReference',        p.supplier_reference,
            'MinQuantity',              p.min_quantity,
            'PackingType',              p.packing_type,
            'OgImageUrl',               p.og_image_url
        ))
    FROM dequeued d
    JOIN products  p ON p.id = d.product_id
    JOIN suppliers s ON s.id = p.supplier_id
    LEFT JOIN supplier_products_raw spr
           ON spr.product_id = p.id
          AND spr.updated_at = (
              SELECT MAX(spr2.updated_at)
              FROM supplier_products_raw spr2
              WHERE spr2.product_id = p.id AND spr2.raw_data IS NOT NULL
          )
    LEFT JOIN categories c ON c.id = COALESCE(p.main_category_id, p.category_id);
END;
$function$;

COMMENT ON FUNCTION public.fn_dequeue_ai_enrichment(integer, text, text) IS
'v2 multi-supplier: raw_data_snapshot usa SPOT raw_data como primário + Gold fallbacks para XBZ/SM/ASIA.
Campos canônicos adicionados: EngravingType, SupplierCode, SupplierReference, MinQuantity, PackingType, OgImageUrl.
Taxonomia Type/SubType agora populada para todos os fornecedores via supplier_type/supplier_subtype do Gold.';
;
