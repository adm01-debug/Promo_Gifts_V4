
-- Drop versão antiga com assinatura exata
DROP FUNCTION IF EXISTS public.fn_save_ai_enrichment_results(
    UUID, UUID, TEXT, TEXT, JSONB, TEXT, BOOLEAN, TEXT
);

CREATE OR REPLACE FUNCTION public.fn_save_ai_enrichment_results(
    p_queue_id          UUID,
    p_product_id        UUID,
    p_ai_title          TEXT    DEFAULT NULL,
    p_ai_description    TEXT    DEFAULT NULL,
    p_ai_summary        TEXT    DEFAULT NULL,
    p_schema_json       JSONB   DEFAULT NULL,
    p_ai_model          TEXT    DEFAULT 'deepseek-chat',
    p_success           BOOLEAN DEFAULT true,
    p_error             TEXT    DEFAULT NULL,
    p_prompt_tokens     INTEGER DEFAULT 0,
    p_completion_tokens INTEGER DEFAULT 0,
    p_generation_ms     INTEGER DEFAULT 0,
    p_context_snapshot  JSONB   DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_updated       INTEGER := 0;
    v_new_version   INTEGER;
    v_locked        TEXT[];
    v_cur_version   INTEGER;
BEGIN
    IF p_success THEN
        -- Obter locked_fields e ai_version atuais
        SELECT
            COALESCE(locked_fields, '{}'),
            COALESCE(ai_version, 0)
        INTO v_locked, v_cur_version
        FROM products WHERE id = p_product_id;

        v_new_version := v_cur_version + 1;

        -- ─────────────────────────────────────────────────────
        -- Atualizar produto Gold
        -- ─────────────────────────────────────────────────────
        UPDATE products
        SET
            ai_title = CASE
                WHEN 'ai_title' = ANY(v_locked) AND v_cur_version > 0
                THEN ai_title
                ELSE COALESCE(NULLIF(TRIM(p_ai_title), ''), ai_title)
            END,
            ai_description = CASE
                WHEN 'ai_description' = ANY(v_locked) AND v_cur_version > 0
                THEN ai_description
                ELSE COALESCE(NULLIF(TRIM(p_ai_description), ''), ai_description)
            END,
            -- ai_summary e schema_json: sempre atualiza (não editados manualmente)
            ai_summary   = COALESCE(NULLIF(TRIM(p_ai_summary), ''), ai_summary),
            schema_json  = COALESCE(p_schema_json, schema_json),
            ai_version   = v_new_version,
            ai_generated_at = now(),
            ai_model     = p_ai_model,
            updated_at   = now()
        WHERE id = p_product_id;

        GET DIAGNOSTICS v_updated = ROW_COUNT;

        -- ─────────────────────────────────────────────────────
        -- Registrar no histórico
        -- ─────────────────────────────────────────────────────
        INSERT INTO product_ai_history (
            product_id, version, ai_title, ai_description,
            model, prompt_tokens, completion_tokens, total_tokens,
            generation_time_ms, context_snapshot, generated_at
        )
        VALUES (
            p_product_id,
            v_new_version,
            p_ai_title,
            p_ai_description,
            p_ai_model,
            COALESCE(p_prompt_tokens, 0),
            COALESCE(p_completion_tokens, 0),
            COALESCE(p_prompt_tokens, 0) + COALESCE(p_completion_tokens, 0),
            COALESCE(p_generation_ms, 0),
            COALESCE(p_context_snapshot, jsonb_build_object(
                'model', p_ai_model, 'generated_at', now()
            )),
            now()
        )
        ON CONFLICT DO NOTHING;

        -- ─────────────────────────────────────────────────────
        -- Marcar fila como done
        -- ─────────────────────────────────────────────────────
        UPDATE ai_enrichment_queue
        SET
            status       = 'done',
            completed_at = now(),
            updated_at   = now()
        WHERE id = p_queue_id;

    ELSE
        -- Registrar erro ou re-queue para retry
        UPDATE ai_enrichment_queue
        SET
            status     = CASE
                           WHEN attempts >= max_attempts THEN 'error'
                           ELSE 'pending'
                         END,
            last_error = p_error,
            updated_at = now()
        WHERE id = p_queue_id;

        v_updated := 0;
    END IF;

    RETURN jsonb_build_object(
        'success',     p_success,
        'updated',     v_updated,
        'new_version', v_new_version,
        'queue_id',    p_queue_id,
        'product_id',  p_product_id
    );

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM, 'state', SQLSTATE);
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_save_ai_enrichment_results(UUID,UUID,TEXT,TEXT,TEXT,JSONB,TEXT,BOOLEAN,TEXT,INTEGER,INTEGER,INTEGER,JSONB)
    TO anon, service_role;

COMMENT ON FUNCTION public.fn_save_ai_enrichment_results IS
    'v2 — Salva ai_title, ai_description (copywriting B2B), ai_summary (GEO), schema_json.
     Registra em product_ai_history com tokens/tempo.
     locked_fields protege ai_title/ai_description de edições manuais (ai_version>0).
     ai_summary e schema_json: sempre atualizados.';
;
