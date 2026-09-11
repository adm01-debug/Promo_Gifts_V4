
-- ============================================================
-- MIGRATION: deepseek_v4_update_function_routing
-- Objetivo : Migrar 12 funções compatíveis para DeepSeek V4.
-- Data     : 2026-06-15 · Branch: feat/deepseek-v4-migration
--
-- REGRAS DA MIGRAÇÃO:
--   1. Funções com vision_in ou image_out → INTOCADAS (V4 sem visão/imagem)
--   2. V4-Flash: funções de chat/volume/streaming (custo baixo)
--   3. V4-Pro  : bi-copilot (tools+json_mode complexo, BI queries)
--   4. Antigo primary → vira fallback[0] (resiliência garantida)
--   5. DeepSeek V3 removido de todos os fallback arrays
--      (depreca em 24/jul/2026 — 39 dias)
--   6. DeepSeek R1 removido de bi-copilot e expert-chat
--      (não satisfaz tools+json_mode/tools → era pulado em runtime)
--
-- CONSTANTES:
--   DS_V4_FLASH = e375d89c-8f14-44c9-892b-d213372dbc44
--   DS_V4_PRO   = de69480c-c8dd-4ecc-aa5c-5587fb02ce01
--   DS_V3       = bfdf0cad-b535-4b91-afc0-5c77fb461adf  (a remover)
--   SONNET_4_6  = 5b3fb0cd-b05f-4a71-a309-0c984c6e8255
--   GPT5_MINI   = 4ada165d-c63a-4354-ab09-735572f0db9b
--   GPT5        = c51d60a4-7abf-4970-a3ed-70e178810e04
--   GEM_25_PRO  = e06d9e43-e498-4916-bfa0-e274cca1762e
--   GEM_FLASH   = e572102d-22ad-4ce3-8bf6-5187ba7e97d9
--   HAIKU_45    = 09cec844-bdea-4da6-91fc-a8da8b00ab63
--   GEM_LITE    = dd90facc-a823-47f6-9e40-1e2d17f1961f
--   GPT5_NANO   = 3605b049-bc41-40ac-9ea0-d45110c69225
-- ============================================================

-- ---------------------------------------------------------------
-- GRUPO A: Funções que já usavam DeepSeek V3 como primary
-- → Primary: V4-Flash | Fallbacks: inalterados (sem V3 neles)
-- ---------------------------------------------------------------

-- A1. ai-recommendations
UPDATE public.ai_function_routing SET
    primary_model_id = 'e375d89c-8f14-44c9-892b-d213372dbc44',
    notes = 'Recomendações personalizadas — alto volume, custo é crítico. Primary: DeepSeek V4-Flash (migrado de V3 em 2026-06-15, V3 depreca 24/jul/2026). Fallbacks: Gemini Flash Lite → GPT-5 Nano.',
    updated_at = now()
WHERE function_name = 'ai-recommendations';

-- A2. semantic-search
UPDATE public.ai_function_routing SET
    primary_model_id = 'e375d89c-8f14-44c9-892b-d213372dbc44',
    notes = 'Busca semântica — alto volume. Primary: DeepSeek V4-Flash (migrado de V3 em 2026-06-15). Fallbacks: Gemini Flash Lite → GPT-5 Nano.',
    updated_at = now()
WHERE function_name = 'semantic-search';

-- A3. trends-insights
UPDATE public.ai_function_routing SET
    primary_model_id = 'e375d89c-8f14-44c9-892b-d213372dbc44',
    notes = 'Insights de tendências. Primary: DeepSeek V4-Flash (migrado de V3 em 2026-06-15, V3 depreca 24/jul/2026). Fallback: Sonnet 4.6 → Gemini Flash Lite.',
    updated_at = now()
WHERE function_name = 'trends-insights';

-- ---------------------------------------------------------------
-- GRUPO B: Funções que usavam Claude Sonnet 4.6 como primary
-- → Primary: V4-Flash (ou V4-Pro para bi-copilot)
-- → Fallback[0]: Sonnet 4.6 (era primary, agora safety net)
-- → Remove DeepSeek R1 (violava capabilities — era inútil)
-- ---------------------------------------------------------------

-- B1. bi-copilot → V4-Pro (tools + json_mode = agentic complexo)
UPDATE public.ai_function_routing SET
    primary_model_id = 'de69480c-c8dd-4ecc-aa5c-5587fb02ce01',
    fallback_model_ids = ARRAY[
        '5b3fb0cd-b05f-4a71-a309-0c984c6e8255',  -- Sonnet 4.6 (era primary)
        'c51d60a4-7abf-4970-a3ed-70e178810e04',  -- GPT-5
        'e06d9e43-e498-4916-bfa0-e274cca1762e'   -- Gemini 2.5 Pro
        -- DeepSeek R1 REMOVIDO: não satisfaz tools+json_mode (era pulado em runtime)
    ]::uuid[],
    notes = 'Copilot de BI — query + análise. Primary: DeepSeek V4-Pro (migrado de Sonnet 4.6 em 2026-06-15 — V4-Pro SOTA em agentic coding). Fallbacks: Sonnet 4.6 → GPT-5 → Gemini 2.5 Pro. R1 removido (sem tools+json_mode).',
    updated_at = now()
WHERE function_name = 'bi-copilot';

-- B2. expert-chat → V4-Flash (tools + streaming)
UPDATE public.ai_function_routing SET
    primary_model_id = 'e375d89c-8f14-44c9-892b-d213372dbc44',
    fallback_model_ids = ARRAY[
        '5b3fb0cd-b05f-4a71-a309-0c984c6e8255',  -- Sonnet 4.6 (era primary)
        'c51d60a4-7abf-4970-a3ed-70e178810e04',  -- GPT-5
        'e06d9e43-e498-4916-bfa0-e274cca1762e'   -- Gemini 2.5 Pro
        -- DeepSeek R1 REMOVIDO: não satisfaz tools (era pulado em runtime)
    ]::uuid[],
    notes = 'Chat com vendedor — raciocínio + tools + streaming. Primary: DeepSeek V4-Flash (migrado de Sonnet 4.6 em 2026-06-15). Fallbacks: Sonnet 4.6 → GPT-5 → Gemini 2.5 Pro. R1 removido (sem tools).',
    updated_at = now()
WHERE function_name = 'expert-chat';

-- B3. market-intelligence-insights → V4-Flash (chat + tools)
UPDATE public.ai_function_routing SET
    primary_model_id = 'e375d89c-8f14-44c9-892b-d213372dbc44',
    fallback_model_ids = ARRAY[
        '5b3fb0cd-b05f-4a71-a309-0c984c6e8255',  -- Sonnet 4.6 (era primary)
        'c51d60a4-7abf-4970-a3ed-70e178810e04',  -- GPT-5
        'e06d9e43-e498-4916-bfa0-e274cca1762e'   -- Gemini 2.5 Pro
    ]::uuid[],
    notes = 'BI insights de mercado. Primary: DeepSeek V4-Flash (migrado de Sonnet 4.6 em 2026-06-15). Fallbacks: Sonnet 4.6 → GPT-5 → Gemini 2.5 Pro.',
    updated_at = now()
WHERE function_name = 'market-intelligence-insights';

-- B4. voice-agent → V4-Flash (tools + streaming)
UPDATE public.ai_function_routing SET
    primary_model_id = 'e375d89c-8f14-44c9-892b-d213372dbc44',
    fallback_model_ids = ARRAY[
        '5b3fb0cd-b05f-4a71-a309-0c984c6e8255',  -- Sonnet 4.6 (era primary)
        'c51d60a4-7abf-4970-a3ed-70e178810e04',  -- GPT-5
        'e06d9e43-e498-4916-bfa0-e274cca1762e'   -- Gemini 2.5 Pro
    ]::uuid[],
    notes = 'Agente de voz — turn detection + tool calls. Primary: DeepSeek V4-Flash (migrado de Sonnet 4.6 em 2026-06-15). Fallbacks: Sonnet 4.6 → GPT-5 → Gemini 2.5 Pro.',
    updated_at = now()
WHERE function_name = 'voice-agent';

-- ---------------------------------------------------------------
-- GRUPO C: Funções que usavam GPT-5 Mini como primary
-- → Primary: V4-Flash | Fallback[0]: GPT-5 Mini (era primary)
-- → DeepSeek V3 REMOVIDO dos fallback arrays
-- ---------------------------------------------------------------

-- C1. comparison-ai-advisor
-- Old fallbacks: [Haiku 4.5, DeepSeek V3] → New: [GPT-5 Mini, Haiku 4.5]
UPDATE public.ai_function_routing SET
    primary_model_id = 'e375d89c-8f14-44c9-892b-d213372dbc44',
    fallback_model_ids = ARRAY[
        '4ada165d-c63a-4354-ab09-735572f0db9b',  -- GPT-5 Mini (era primary)
        '09cec844-bdea-4da6-91fc-a8da8b00ab63'   -- Haiku 4.5
        -- DeepSeek V3 REMOVIDO (depreca 24/jul/2026)
    ]::uuid[],
    notes = 'Conselheiro IA em comparações de produto. Primary: DeepSeek V4-Flash (migrado de GPT-5 Mini em 2026-06-15). Fallbacks: GPT-5 Mini → Haiku 4.5. V3 removido.',
    updated_at = now()
WHERE function_name = 'comparison-ai-advisor';

-- C2. generate-ad-prompt (temperature=0.9 mantida no request_overrides)
-- Old fallbacks: [DeepSeek V3, Haiku 4.5] → New: [GPT-5 Mini, Haiku 4.5]
UPDATE public.ai_function_routing SET
    primary_model_id = 'e375d89c-8f14-44c9-892b-d213372dbc44',
    fallback_model_ids = ARRAY[
        '4ada165d-c63a-4354-ab09-735572f0db9b',  -- GPT-5 Mini (era primary)
        '09cec844-bdea-4da6-91fc-a8da8b00ab63'   -- Haiku 4.5
        -- DeepSeek V3 REMOVIDO
    ]::uuid[],
    notes = 'Prompt criativo para imagem publicitária (temp=0.9). Primary: DeepSeek V4-Flash (migrado de GPT-5 Mini em 2026-06-15). Fallbacks: GPT-5 Mini → Haiku 4.5. V3 removido.',
    updated_at = now()
WHERE function_name = 'generate-ad-prompt';

-- C3. generate-product-seo (temperature=0.7 mantida)
-- Old fallbacks: [DeepSeek V3, Gemini 2.5 Flash] → New: [GPT-5 Mini, Gemini 2.5 Flash]
UPDATE public.ai_function_routing SET
    primary_model_id = 'e375d89c-8f14-44c9-892b-d213372dbc44',
    fallback_model_ids = ARRAY[
        '4ada165d-c63a-4354-ab09-735572f0db9b',  -- GPT-5 Mini (era primary)
        'e572102d-22ad-4ce3-8bf6-5187ba7e97d9'   -- Gemini 2.5 Flash
        -- DeepSeek V3 REMOVIDO
    ]::uuid[],
    notes = 'SEO automático para produtos (temp=0.7). Primary: DeepSeek V4-Flash (migrado de GPT-5 Mini em 2026-06-15). Fallbacks: GPT-5 Mini → Gemini 2.5 Flash. V3 removido.',
    updated_at = now()
WHERE function_name = 'generate-product-seo';

-- C4. kit-ai-builder (chat + json_mode)
-- Old fallbacks: [Sonnet 4.6, DeepSeek V3] → New: [GPT-5 Mini, Sonnet 4.6]
UPDATE public.ai_function_routing SET
    primary_model_id = 'e375d89c-8f14-44c9-892b-d213372dbc44',
    fallback_model_ids = ARRAY[
        '4ada165d-c63a-4354-ab09-735572f0db9b',  -- GPT-5 Mini (era primary)
        '5b3fb0cd-b05f-4a71-a309-0c984c6e8255'   -- Sonnet 4.6
        -- DeepSeek V3 REMOVIDO
    ]::uuid[],
    notes = 'Builder de kits via IA (chat+json_mode). Primary: DeepSeek V4-Flash (migrado de GPT-5 Mini em 2026-06-15). Fallbacks: GPT-5 Mini → Sonnet 4.6. V3 removido.',
    updated_at = now()
WHERE function_name = 'kit-ai-builder';

-- C5. magic-up-score (chat + json_mode, temperature=0.3)
-- Old fallbacks: [DeepSeek V3, Haiku 4.5] → New: [GPT-5 Mini, Haiku 4.5]
UPDATE public.ai_function_routing SET
    primary_model_id = 'e375d89c-8f14-44c9-892b-d213372dbc44',
    fallback_model_ids = ARRAY[
        '4ada165d-c63a-4354-ab09-735572f0db9b',  -- GPT-5 Mini (era primary)
        '09cec844-bdea-4da6-91fc-a8da8b00ab63'   -- Haiku 4.5
        -- DeepSeek V3 REMOVIDO
    ]::uuid[],
    notes = 'Score criativo — JSON estruturado (temp=0.3). Primary: DeepSeek V4-Flash (migrado de GPT-5 Mini em 2026-06-15). Fallbacks: GPT-5 Mini → Haiku 4.5. V3 removido.',
    updated_at = now()
WHERE function_name = 'magic-up-score';
;
