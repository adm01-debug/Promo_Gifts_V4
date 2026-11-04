-- ============================================================
-- AI Router — SEED inicial (PR 1/6 parte 2)
-- 5 providers + 30 modelos + 13 routings de produção
-- ============================================================

-- ---------------------------------------------------------------
-- PROVIDERS (5)
-- ---------------------------------------------------------------
INSERT INTO public.ai_providers (slug, display_name, api_base_url, api_format, auth_header, auth_format, secret_name, priority, timeout_ms, max_retries, metadata, is_active) VALUES
  -- Lovable: gateway atual (primário hoje, será depriorizado conforme outros forem testados)
  ('lovable', 'Lovable AI Gateway', 'https://ai.gateway.lovable.dev/v1', 'openai_compatible',
    'Authorization', 'Bearer {key}', 'LOVABLE_API_KEY', 50, 30000, 2,
    '{"notes": "Aggregator for Gemini + GPT. Compatible OpenAI format.", "supports_image_out": true}'::jsonb, true),

  -- OpenAI direct
  ('openai', 'OpenAI', 'https://api.openai.com/v1', 'openai_compatible',
    'Authorization', 'Bearer {key}', 'OPENAI_API_KEY', 100, 30000, 2,
    '{"organization_header": "OpenAI-Organization", "supports_responses_api": true}'::jsonb, true),

  -- Anthropic direct (formato próprio)
  ('anthropic', 'Anthropic', 'https://api.anthropic.com/v1', 'anthropic_native',
    'x-api-key', '{key}', 'ANTHROPIC_API_KEY', 100, 60000, 2,
    '{"required_headers": {"anthropic-version": "2023-06-01"}, "supports_extended_thinking": true}'::jsonb, true),

  -- Google Generative AI (Gemini direct)
  ('google', 'Google Gemini', 'https://generativelanguage.googleapis.com/v1beta', 'google_native',
    'x-goog-api-key', '{key}', 'GOOGLE_API_KEY', 100, 60000, 2,
    '{"supports_native_image_gen": true, "endpoint_pattern": "/models/{model}:generateContent"}'::jsonb, true),

  -- DeepSeek (formato OpenAI-compatible — barato + bom raciocínio)
  ('deepseek', 'DeepSeek', 'https://api.deepseek.com/v1', 'openai_compatible',
    'Authorization', 'Bearer {key}', 'DEEPSEEK_API_KEY', 200, 60000, 2,
    '{"notes": "OpenAI-compatible. V3 cheap general-purpose. R1 reasoning-tier."}'::jsonb, true);

-- ---------------------------------------------------------------
-- MODELS — preços em USD/1M tokens (editáveis pela UI depois)
-- ---------------------------------------------------------------

-- LOVABLE (gateway repassa preços do upstream)
INSERT INTO public.ai_models (provider_id, model_id, display_name, capabilities, cost_input_per_1m, cost_output_per_1m, cost_per_image, max_input_tokens, max_output_tokens, is_active) VALUES
  ((SELECT id FROM public.ai_providers WHERE slug='lovable'),
    'google/gemini-2.5-flash-image-preview', 'Gemini 2.5 Flash Image (via Lovable)',
    '{"chat": true, "vision_in": true, "image_out": true, "streaming": true, "tools": false, "json_mode": false}'::jsonb,
    0.10, 0.40, 0.0, 1048576, 8192, true),
  ((SELECT id FROM public.ai_providers WHERE slug='lovable'),
    'google/gemini-2.5-pro', 'Gemini 2.5 Pro (via Lovable)',
    '{"chat": true, "vision_in": true, "image_out": false, "streaming": true, "tools": true, "json_mode": true, "reasoning": true}'::jsonb,
    1.25, 10.0, 0.0, 1048576, 65536, true),
  ((SELECT id FROM public.ai_providers WHERE slug='lovable'),
    'google/gemini-2.5-flash', 'Gemini 2.5 Flash (via Lovable)',
    '{"chat": true, "vision_in": true, "image_out": false, "streaming": true, "tools": true, "json_mode": true}'::jsonb,
    0.15, 0.60, 0.0, 1048576, 8192, true),
  ((SELECT id FROM public.ai_providers WHERE slug='lovable'),
    'google/gemini-2.5-flash-lite', 'Gemini 2.5 Flash Lite (via Lovable)',
    '{"chat": true, "vision_in": true, "image_out": false, "streaming": true, "tools": true, "json_mode": true}'::jsonb,
    0.04, 0.15, 0.0, 1048576, 8192, true),
  ((SELECT id FROM public.ai_providers WHERE slug='lovable'),
    'openai/gpt-5', 'GPT-5 (via Lovable)',
    '{"chat": true, "vision_in": true, "image_out": false, "streaming": true, "tools": true, "json_mode": true, "reasoning": true}'::jsonb,
    2.50, 10.0, 0.0, 400000, 16384, true),
  ((SELECT id FROM public.ai_providers WHERE slug='lovable'),
    'openai/gpt-5-mini', 'GPT-5 Mini (via Lovable)',
    '{"chat": true, "vision_in": true, "image_out": false, "streaming": true, "tools": true, "json_mode": true}'::jsonb,
    0.40, 1.60, 0.0, 400000, 16384, true),
  ((SELECT id FROM public.ai_providers WHERE slug='lovable'),
    'openai/gpt-5-nano', 'GPT-5 Nano (via Lovable)',
    '{"chat": true, "vision_in": true, "image_out": false, "streaming": true, "tools": true, "json_mode": true}'::jsonb,
    0.10, 0.40, 0.0, 400000, 16384, true);

-- OPENAI direct
INSERT INTO public.ai_models (provider_id, model_id, display_name, capabilities, cost_input_per_1m, cost_output_per_1m, cost_per_image, max_input_tokens, max_output_tokens, is_active) VALUES
  ((SELECT id FROM public.ai_providers WHERE slug='openai'),
    'gpt-5', 'GPT-5',
    '{"chat": true, "vision_in": true, "image_out": false, "streaming": true, "tools": true, "json_mode": true, "reasoning": true}'::jsonb,
    2.50, 10.0, 0.0, 400000, 16384, true),
  ((SELECT id FROM public.ai_providers WHERE slug='openai'),
    'gpt-5-mini', 'GPT-5 Mini',
    '{"chat": true, "vision_in": true, "image_out": false, "streaming": true, "tools": true, "json_mode": true}'::jsonb,
    0.40, 1.60, 0.0, 400000, 16384, true),
  ((SELECT id FROM public.ai_providers WHERE slug='openai'),
    'gpt-5-nano', 'GPT-5 Nano',
    '{"chat": true, "vision_in": true, "image_out": false, "streaming": true, "tools": true, "json_mode": true}'::jsonb,
    0.10, 0.40, 0.0, 400000, 16384, true),
  ((SELECT id FROM public.ai_providers WHERE slug='openai'),
    'gpt-image-1', 'GPT Image 1',
    '{"chat": false, "vision_in": false, "image_out": true, "streaming": false, "tools": false, "json_mode": false}'::jsonb,
    5.00, 40.0, 0.040, NULL, NULL, true),
  ((SELECT id FROM public.ai_providers WHERE slug='openai'),
    'gpt-4o', 'GPT-4o (legacy)',
    '{"chat": true, "vision_in": true, "image_out": false, "streaming": true, "tools": true, "json_mode": true}'::jsonb,
    2.50, 10.0, 0.0, 128000, 16384, false);

-- ANTHROPIC direct
INSERT INTO public.ai_models (provider_id, model_id, display_name, capabilities, cost_input_per_1m, cost_output_per_1m, cost_per_image, max_input_tokens, max_output_tokens, is_active) VALUES
  ((SELECT id FROM public.ai_providers WHERE slug='anthropic'),
    'claude-opus-4-7', 'Claude Opus 4.7',
    '{"chat": true, "vision_in": true, "image_out": false, "streaming": true, "tools": true, "json_mode": true, "reasoning": true}'::jsonb,
    15.0, 75.0, 0.0, 200000, 32000, true),
  ((SELECT id FROM public.ai_providers WHERE slug='anthropic'),
    'claude-opus-4-6', 'Claude Opus 4.6',
    '{"chat": true, "vision_in": true, "image_out": false, "streaming": true, "tools": true, "json_mode": true, "reasoning": true}'::jsonb,
    15.0, 75.0, 0.0, 200000, 32000, true),
  ((SELECT id FROM public.ai_providers WHERE slug='anthropic'),
    'claude-sonnet-4-6', 'Claude Sonnet 4.6',
    '{"chat": true, "vision_in": true, "image_out": false, "streaming": true, "tools": true, "json_mode": true, "reasoning": true}'::jsonb,
    3.0, 15.0, 0.0, 200000, 64000, true),
  ((SELECT id FROM public.ai_providers WHERE slug='anthropic'),
    'claude-haiku-4-5-20251001', 'Claude Haiku 4.5',
    '{"chat": true, "vision_in": true, "image_out": false, "streaming": true, "tools": true, "json_mode": true}'::jsonb,
    1.0, 5.0, 0.0, 200000, 8192, true);

-- GOOGLE direct
INSERT INTO public.ai_models (provider_id, model_id, display_name, capabilities, cost_input_per_1m, cost_output_per_1m, cost_per_image, max_input_tokens, max_output_tokens, is_active) VALUES
  ((SELECT id FROM public.ai_providers WHERE slug='google'),
    'gemini-2.5-pro', 'Gemini 2.5 Pro',
    '{"chat": true, "vision_in": true, "image_out": false, "streaming": true, "tools": true, "json_mode": true, "reasoning": true}'::jsonb,
    1.25, 10.0, 0.0, 2097152, 65536, true),
  ((SELECT id FROM public.ai_providers WHERE slug='google'),
    'gemini-2.5-flash', 'Gemini 2.5 Flash',
    '{"chat": true, "vision_in": true, "image_out": false, "streaming": true, "tools": true, "json_mode": true}'::jsonb,
    0.15, 0.60, 0.0, 1048576, 8192, true),
  ((SELECT id FROM public.ai_providers WHERE slug='google'),
    'gemini-2.5-flash-lite', 'Gemini 2.5 Flash Lite',
    '{"chat": true, "vision_in": true, "image_out": false, "streaming": true, "tools": true, "json_mode": true}'::jsonb,
    0.04, 0.15, 0.0, 1048576, 8192, true),
  ((SELECT id FROM public.ai_providers WHERE slug='google'),
    'gemini-2.5-flash-image-preview', 'Gemini 2.5 Flash Image (Nano Banana)',
    '{"chat": true, "vision_in": true, "image_out": true, "streaming": true, "tools": false, "json_mode": false}'::jsonb,
    0.10, 0.40, 0.039, 1048576, 8192, true),
  ((SELECT id FROM public.ai_providers WHERE slug='google'),
    'gemini-3-pro-image-preview', 'Gemini 3 Pro Image (preview)',
    '{"chat": true, "vision_in": true, "image_out": true, "streaming": true, "tools": false, "json_mode": false}'::jsonb,
    1.25, 10.0, 0.080, 1048576, 8192, false);

-- DEEPSEEK
INSERT INTO public.ai_models (provider_id, model_id, display_name, capabilities, cost_input_per_1m, cost_output_per_1m, cost_per_image, max_input_tokens, max_output_tokens, is_active) VALUES
  ((SELECT id FROM public.ai_providers WHERE slug='deepseek'),
    'deepseek-chat', 'DeepSeek V3 (Chat)',
    '{"chat": true, "vision_in": false, "image_out": false, "streaming": true, "tools": true, "json_mode": true}'::jsonb,
    0.27, 1.10, 0.0, 64000, 8192, true),
  ((SELECT id FROM public.ai_providers WHERE slug='deepseek'),
    'deepseek-reasoner', 'DeepSeek R1 (Reasoning)',
    '{"chat": true, "vision_in": false, "image_out": false, "streaming": true, "tools": false, "json_mode": false, "reasoning": true}'::jsonb,
    0.55, 2.19, 0.0, 64000, 8192, true);

-- ---------------------------------------------------------------
-- FUNCTION ROUTING — 13 funções com primary + fallbacks
-- Usa CTEs com lookup pra resolver os IDs de modelo a partir de slug+model_id
-- ---------------------------------------------------------------

WITH model_lookup AS (
  SELECT
    p.slug AS provider_slug,
    m.model_id,
    m.id AS model_uuid
  FROM public.ai_models m
  JOIN public.ai_providers p ON p.id = m.provider_id
)
INSERT INTO public.ai_function_routing (function_name, primary_model_id, fallback_model_ids, required_capabilities, request_overrides, is_active, notes) VALUES
  -- Image generation: precisa image_out
  ('generate-mockup',
    (SELECT model_uuid FROM model_lookup WHERE provider_slug='google' AND model_id='gemini-2.5-flash-image-preview'),
    ARRAY[
      (SELECT model_uuid FROM model_lookup WHERE provider_slug='lovable' AND model_id='google/gemini-2.5-flash-image-preview'),
      (SELECT model_uuid FROM model_lookup WHERE provider_slug='openai' AND model_id='gpt-image-1')
    ],
    '{"image_out": true}'::jsonb,
    '{}'::jsonb, true, 'Mockup com logo aplicado em produto. Precisa modelo de edição de imagem.'),

  ('generate-mockup-nanobanana',
    (SELECT model_uuid FROM model_lookup WHERE provider_slug='google' AND model_id='gemini-2.5-flash-image-preview'),
    ARRAY[
      (SELECT model_uuid FROM model_lookup WHERE provider_slug='lovable' AND model_id='google/gemini-2.5-flash-image-preview')
    ],
    '{"image_out": true}'::jsonb,
    '{}'::jsonb, true, 'Variante usando Gemini Flash Image diretamente. STUB hoje, ativará após implementação.'),

  ('generate-ad-image',
    (SELECT model_uuid FROM model_lookup WHERE provider_slug='google' AND model_id='gemini-2.5-flash-image-preview'),
    ARRAY[
      (SELECT model_uuid FROM model_lookup WHERE provider_slug='openai' AND model_id='gpt-image-1'),
      (SELECT model_uuid FROM model_lookup WHERE provider_slug='lovable' AND model_id='google/gemini-2.5-flash-image-preview')
    ],
    '{"image_out": true}'::jsonb,
    '{}'::jsonb, true, 'Magic Up Ads — geração de imagem publicitária.'),

  -- Chat / reasoning / tools — Claude principal, GPT/Gemini/DeepSeek fallbacks
  ('expert-chat',
    (SELECT model_uuid FROM model_lookup WHERE provider_slug='anthropic' AND model_id='claude-sonnet-4-6'),
    ARRAY[
      (SELECT model_uuid FROM model_lookup WHERE provider_slug='openai' AND model_id='gpt-5'),
      (SELECT model_uuid FROM model_lookup WHERE provider_slug='google' AND model_id='gemini-2.5-pro'),
      (SELECT model_uuid FROM model_lookup WHERE provider_slug='deepseek' AND model_id='deepseek-reasoner')
    ],
    '{"tools": true, "streaming": true}'::jsonb,
    '{}'::jsonb, true, 'Chat com vendedor — raciocínio + tools. Sonnet por padrão pelo balance qualidade/custo.'),

  ('bi-copilot',
    (SELECT model_uuid FROM model_lookup WHERE provider_slug='anthropic' AND model_id='claude-sonnet-4-6'),
    ARRAY[
      (SELECT model_uuid FROM model_lookup WHERE provider_slug='openai' AND model_id='gpt-5'),
      (SELECT model_uuid FROM model_lookup WHERE provider_slug='google' AND model_id='gemini-2.5-pro'),
      (SELECT model_uuid FROM model_lookup WHERE provider_slug='deepseek' AND model_id='deepseek-reasoner')
    ],
    '{"tools": true, "json_mode": true}'::jsonb,
    '{}'::jsonb, true, 'Copilot de BI — query + análise.'),

  ('voice-agent',
    (SELECT model_uuid FROM model_lookup WHERE provider_slug='anthropic' AND model_id='claude-sonnet-4-6'),
    ARRAY[
      (SELECT model_uuid FROM model_lookup WHERE provider_slug='openai' AND model_id='gpt-5'),
      (SELECT model_uuid FROM model_lookup WHERE provider_slug='google' AND model_id='gemini-2.5-pro')
    ],
    '{"tools": true, "streaming": true}'::jsonb,
    '{}'::jsonb, true, 'Agente de voz — turn detection + tool calls.'),

  -- Geração rápida e barata — GPT-mini principal, DeepSeek/Gemini fallback
  ('generate-product-seo',
    (SELECT model_uuid FROM model_lookup WHERE provider_slug='openai' AND model_id='gpt-5-mini'),
    ARRAY[
      (SELECT model_uuid FROM model_lookup WHERE provider_slug='deepseek' AND model_id='deepseek-chat'),
      (SELECT model_uuid FROM model_lookup WHERE provider_slug='google' AND model_id='gemini-2.5-flash')
    ],
    '{"chat": true}'::jsonb,
    '{"temperature": 0.7}'::jsonb, true, 'SEO automático para produtos.'),

  ('generate-ad-prompt',
    (SELECT model_uuid FROM model_lookup WHERE provider_slug='openai' AND model_id='gpt-5-mini'),
    ARRAY[
      (SELECT model_uuid FROM model_lookup WHERE provider_slug='deepseek' AND model_id='deepseek-chat'),
      (SELECT model_uuid FROM model_lookup WHERE provider_slug='anthropic' AND model_id='claude-haiku-4-5-20251001')
    ],
    '{"chat": true}'::jsonb,
    '{"temperature": 0.9}'::jsonb, true, 'Prompt criativo para imagem publicitária.'),

  ('magic-up-score',
    (SELECT model_uuid FROM model_lookup WHERE provider_slug='openai' AND model_id='gpt-5-mini'),
    ARRAY[
      (SELECT model_uuid FROM model_lookup WHERE provider_slug='deepseek' AND model_id='deepseek-chat'),
      (SELECT model_uuid FROM model_lookup WHERE provider_slug='anthropic' AND model_id='claude-haiku-4-5-20251001')
    ],
    '{"chat": true, "json_mode": true}'::jsonb,
    '{"temperature": 0.3}'::jsonb, true, 'Score criativo — JSON estruturado.'),

  -- Vision-in (analyze photos) — Gemini Flash principal, GPT/Claude fallback
  ('analyze-logo-colors',
    (SELECT model_uuid FROM model_lookup WHERE provider_slug='google' AND model_id='gemini-2.5-flash'),
    ARRAY[
      (SELECT model_uuid FROM model_lookup WHERE provider_slug='openai' AND model_id='gpt-5-mini'),
      (SELECT model_uuid FROM model_lookup WHERE provider_slug='anthropic' AND model_id='claude-haiku-4-5-20251001')
    ],
    '{"vision_in": true, "json_mode": true}'::jsonb,
    '{"temperature": 0.1}'::jsonb, true, 'Extração de paleta. Vision input obrigatório.'),

  ('kit-identity-suggest',
    (SELECT model_uuid FROM model_lookup WHERE provider_slug='google' AND model_id='gemini-2.5-flash'),
    ARRAY[
      (SELECT model_uuid FROM model_lookup WHERE provider_slug='openai' AND model_id='gpt-5-mini'),
      (SELECT model_uuid FROM model_lookup WHERE provider_slug='anthropic' AND model_id='claude-haiku-4-5-20251001')
    ],
    '{"vision_in": true}'::jsonb,
    '{}'::jsonb, true, 'Sugere identidade visual. Vision input.'),

  ('kit-ai-builder',
    (SELECT model_uuid FROM model_lookup WHERE provider_slug='openai' AND model_id='gpt-5-mini'),
    ARRAY[
      (SELECT model_uuid FROM model_lookup WHERE provider_slug='anthropic' AND model_id='claude-sonnet-4-6'),
      (SELECT model_uuid FROM model_lookup WHERE provider_slug='deepseek' AND model_id='deepseek-chat')
    ],
    '{"chat": true, "json_mode": true}'::jsonb,
    '{}'::jsonb, true, 'Builder de kits via IA.'),

  -- Volume alto, custo crítico — DeepSeek V3 (mais barato) principal
  ('ai-recommendations',
    (SELECT model_uuid FROM model_lookup WHERE provider_slug='deepseek' AND model_id='deepseek-chat'),
    ARRAY[
      (SELECT model_uuid FROM model_lookup WHERE provider_slug='google' AND model_id='gemini-2.5-flash-lite'),
      (SELECT model_uuid FROM model_lookup WHERE provider_slug='openai' AND model_id='gpt-5-nano')
    ],
    '{"chat": true}'::jsonb,
    '{}'::jsonb, true, 'Recomendações personalizadas — alto volume, custo é crítico.'),

  ('semantic-search',
    (SELECT model_uuid FROM model_lookup WHERE provider_slug='deepseek' AND model_id='deepseek-chat'),
    ARRAY[
      (SELECT model_uuid FROM model_lookup WHERE provider_slug='google' AND model_id='gemini-2.5-flash-lite'),
      (SELECT model_uuid FROM model_lookup WHERE provider_slug='openai' AND model_id='gpt-5-nano')
    ],
    '{"chat": true}'::jsonb,
    '{}'::jsonb, true, 'Busca semântica — alto volume.'),

  ('comparison-ai-advisor',
    (SELECT model_uuid FROM model_lookup WHERE provider_slug='openai' AND model_id='gpt-5-mini'),
    ARRAY[
      (SELECT model_uuid FROM model_lookup WHERE provider_slug='anthropic' AND model_id='claude-haiku-4-5-20251001'),
      (SELECT model_uuid FROM model_lookup WHERE provider_slug='deepseek' AND model_id='deepseek-chat')
    ],
    '{"chat": true}'::jsonb,
    '{}'::jsonb, true, 'Conselheiro IA em comparações de produto.'),

  ('market-intelligence-insights',
    (SELECT model_uuid FROM model_lookup WHERE provider_slug='anthropic' AND model_id='claude-sonnet-4-6'),
    ARRAY[
      (SELECT model_uuid FROM model_lookup WHERE provider_slug='openai' AND model_id='gpt-5'),
      (SELECT model_uuid FROM model_lookup WHERE provider_slug='google' AND model_id='gemini-2.5-pro')
    ],
    '{"chat": true, "tools": true}'::jsonb,
    '{}'::jsonb, true, 'BI insights de mercado.'),

  ('trends-insights',
    (SELECT model_uuid FROM model_lookup WHERE provider_slug='anthropic' AND model_id='claude-sonnet-4-6'),
    ARRAY[
      (SELECT model_uuid FROM model_lookup WHERE provider_slug='openai' AND model_id='gpt-5'),
      (SELECT model_uuid FROM model_lookup WHERE provider_slug='google' AND model_id='gemini-2.5-pro')
    ],
    '{"chat": true}'::jsonb,
    '{}'::jsonb, true, 'Insights de tendências.'),

  ('visual-search',
    (SELECT model_uuid FROM model_lookup WHERE provider_slug='google' AND model_id='gemini-2.5-flash'),
    ARRAY[
      (SELECT model_uuid FROM model_lookup WHERE provider_slug='openai' AND model_id='gpt-5-mini'),
      (SELECT model_uuid FROM model_lookup WHERE provider_slug='anthropic' AND model_id='claude-haiku-4-5-20251001')
    ],
    '{"vision_in": true}'::jsonb,
    '{}'::jsonb, true, 'Busca visual — entrada por imagem.');
