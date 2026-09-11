
-- ============================================================
-- MIGRATION: deepseek_v4_register_models
-- Objetivo : Registrar DeepSeek-V4-Flash e DeepSeek-V4-Pro
--            em public.ai_models (provider DeepSeek já existe).
-- Data     : 2026-06-15
-- Branch   : feat/deepseek-v4-migration
-- Urgência : deepseek-chat depreca em 24/jul/2026 (39 dias).
--
-- FONTE OFICIAL: https://api-docs.deepseek.com/news/news260424
--   • Base URL: https://api.deepseek.com/v1 (mesmo do V3)
--   • Formato : openai_compatible (sem mudança)
--   • Context : 1M tokens
--   • Max out : 384K tokens
--   • Tools   : ✓ (ambos)
--   • JSON    : ✓ (ambos)
--   • Vision  : ✗ (sem visão em V4)
--   • Image   : ✗ (sem geração de imagem)
--   • Thinking: ✓ (dual mode — thinking/non-thinking)
--
-- PREÇOS (cache miss, por 1M tokens):
--   V4-Flash: input $0.14 / output $0.28
--   V4-Pro  : input $0.435 / output $0.87
-- ============================================================

-- 1. DeepSeek V4-Flash (rápido, barato — substituto direto do V3)
INSERT INTO public.ai_models (
    id,
    provider_id,
    model_id,
    display_name,
    capabilities,
    cost_input_per_1m,
    cost_output_per_1m,
    cost_per_image,
    max_input_tokens,
    max_output_tokens,
    is_active,
    metadata
) VALUES (
    gen_random_uuid(),
    '404b2f04-6e86-4240-997a-ce4390d3cebc',  -- provider deepseek
    'deepseek-v4-flash',
    'DeepSeek V4-Flash',
    '{
        "chat": true,
        "tools": true,
        "image_out": false,
        "json_mode": true,
        "streaming": true,
        "vision_in": false,
        "reasoning": true
    }'::jsonb,
    0.14,    -- $0.14 por 1M tokens input (cache miss)
    0.28,    -- $0.28 por 1M tokens output
    0.00,
    1000000, -- 1M context
    384000,  -- 384K max output
    true,
    '{
        "context_window": 1000000,
        "max_output_tokens": 384000,
        "thinking_mode": true,
        "deprecates": ["deepseek-chat"],
        "cache_hit_price_input": 0.0028,
        "released": "2026-04-24",
        "notes": "Substituto direto do deepseek-chat (deprecado 24/jul/2026). Non-thinking mode padrão."
    }'::jsonb
);

-- 2. DeepSeek V4-Pro (poderoso — agentic, BI, raciocínio complexo)
INSERT INTO public.ai_models (
    id,
    provider_id,
    model_id,
    display_name,
    capabilities,
    cost_input_per_1m,
    cost_output_per_1m,
    cost_per_image,
    max_input_tokens,
    max_output_tokens,
    is_active,
    metadata
) VALUES (
    gen_random_uuid(),
    '404b2f04-6e86-4240-997a-ce4390d3cebc',  -- provider deepseek
    'deepseek-v4-pro',
    'DeepSeek V4-Pro',
    '{
        "chat": true,
        "tools": true,
        "image_out": false,
        "json_mode": true,
        "streaming": true,
        "vision_in": false,
        "reasoning": true
    }'::jsonb,
    0.435,   -- $0.435 por 1M tokens input (cache miss)
    0.87,    -- $0.87 por 1M tokens output
    0.00,
    1000000, -- 1M context
    384000,  -- 384K max output
    true,
    '{
        "context_window": 1000000,
        "max_output_tokens": 384000,
        "thinking_mode": true,
        "cache_hit_price_input": 0.003625,
        "released": "2026-04-24",
        "notes": "V4-Pro: SOTA open-source em agentic coding. Usar para bi-copilot, BI insights, tasks complexas."
    }'::jsonb
);
;
