
-- ============================================================
-- MELHORIA 4: Estender product_ai_history
-- Adiciona: ai_summary, schema_json, ai_provider, enrichment_type
-- Preserva: registro existente (SKU 51140 gerado por Claude)
-- ============================================================

-- Novos campos
ALTER TABLE public.product_ai_history
    ADD COLUMN IF NOT EXISTS ai_summary        TEXT,
    ADD COLUMN IF NOT EXISTS schema_json       JSONB,
    ADD COLUMN IF NOT EXISTS ai_provider       TEXT DEFAULT 'anthropic',
    ADD COLUMN IF NOT EXISTS enrichment_type   TEXT DEFAULT 'all',
    ADD COLUMN IF NOT EXISTS organization_id   UUID DEFAULT '5db5aee1-064b-4ef4-9193-345dcd8274ea'::uuid;

-- Índice para consultas por produto + versão
CREATE INDEX IF NOT EXISTS idx_product_ai_history_product_version
    ON public.product_ai_history (product_id, version DESC);

-- Índice para métricas de custo por modelo
CREATE INDEX IF NOT EXISTS idx_product_ai_history_model
    ON public.product_ai_history (model, generated_at DESC)
    WHERE model IS NOT NULL;

-- Atualizar o único registro real existente (Claude)
UPDATE public.product_ai_history
SET
    ai_provider     = 'anthropic',
    enrichment_type = 'all'
WHERE model ILIKE '%claude%' OR model ILIKE '%anthropic%';

-- VIEW de monitoramento de custo e cobertura
CREATE OR REPLACE VIEW public.vw_ai_history_stats AS
SELECT
    model,
    ai_provider,
    COUNT(*)                              AS total_geracoes,
    COUNT(DISTINCT product_id)            AS produtos_unicos,
    SUM(total_tokens)                     AS total_tokens,
    ROUND(AVG(total_tokens), 0)           AS media_tokens,
    SUM(generation_time_ms)               AS total_ms,
    ROUND(AVG(generation_time_ms), 0)     AS media_ms,
    -- Custo estimado (deepseek-chat: $0.27/M input + $1.10/M output)
    ROUND(
        SUM(COALESCE(prompt_tokens, 0)) / 1000000.0 * 0.27
        + SUM(COALESCE(completion_tokens, 0)) / 1000000.0 * 1.10,
        4
    ) AS custo_usd_estimado,
    MIN(generated_at) AS primeira_geracao,
    MAX(generated_at) AS ultima_geracao
FROM public.product_ai_history
GROUP BY model, ai_provider
ORDER BY total_geracoes DESC;

COMMENT ON TABLE public.product_ai_history IS
    'Histórico de todas as gerações AI por produto. Inclui: ai_title, ai_description, ai_summary, schema_json, tokens, tempo, provedor.';
COMMENT ON VIEW public.vw_ai_history_stats IS
    'Estatísticas de custo e cobertura por modelo AI — inclui estimativa de custo em USD.';
;
