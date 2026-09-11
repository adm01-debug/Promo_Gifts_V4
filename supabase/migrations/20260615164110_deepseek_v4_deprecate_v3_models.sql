
-- ============================================================
-- MIGRATION: deepseek_v4_deprecate_v3_models
-- Objetivo : Marcar deepseek-chat e deepseek-reasoner como
--            deprecated no catálogo (NÃO deletar — aguardar
--            24/jul/2026 para confirmar zero uso).
-- Data     : 2026-06-15 · Branch: feat/deepseek-v4-migration
-- ============================================================

-- DeepSeek V3 (Chat) — antigo deepseek-chat
UPDATE public.ai_models SET
    display_name = 'DeepSeek V3 (Chat) [DEPRECATED 24/jul/2026]',
    is_active = false,
    metadata = metadata || '{
        "deprecated": true,
        "deprecated_at": "2026-06-15",
        "deprecation_deadline": "2026-07-24",
        "replaced_by": "deepseek-v4-flash",
        "notes": "deepseek-chat retira em 24/jul/2026 15:59 UTC. Migrado para deepseek-v4-flash. Mantido no catálogo para auditoria de routing_decisions histórico."
    }'::jsonb
WHERE model_id = 'deepseek-chat';

-- DeepSeek R1 (Reasoning) — antigo deepseek-reasoner
UPDATE public.ai_models SET
    display_name = 'DeepSeek R1 (Reasoning) [DEPRECATED 24/jul/2026]',
    is_active = false,
    metadata = metadata || '{
        "deprecated": true,
        "deprecated_at": "2026-06-15",
        "deprecation_deadline": "2026-07-24",
        "replaced_by": "deepseek-v4-flash (thinking mode)",
        "notes": "deepseek-reasoner retira em 24/jul/2026. Thinking mode do deepseek-v4-flash é o substituto."
    }'::jsonb
WHERE model_id = 'deepseek-reasoner';
;
