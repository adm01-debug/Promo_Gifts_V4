-- Magic Up modo Pro vs Fast — separação de routing
--
-- Contexto: PR #132 introduz toggle "Modo Rápido" no Magic Up. Cada modo deve
-- usar um modelo distinto via function_name diferente. Esta migration:
--
--   1) Ativa Gemini 3 Pro Image Preview (estava is_active=false)
--   2) Atualiza routing existente 'generate-ad-image' para primary = Gemini 3 Pro
--      (modo Pro = qualidade máxima)
--   3) Cria routing novo 'generate-ad-image-fast' apontando para Gemini 2.5 Flash
--      Image Preview (modo Fast = "nano-banana", barato e rápido)
--
-- Sem esta migration, ambos modos do PR #132 resolveriam para nano-banana via
-- router (porque o routing atual de generate-ad-image aponta para ele).

BEGIN;

-- 1) Ativar Gemini 3 Pro Image (estava is_active=false)
UPDATE public.ai_models
SET is_active = true,
    updated_at = now()
WHERE id = 'a7e6b742-964e-4a3a-afa1-31efe1d8c50d'   -- gemini-3-pro-image-preview
  AND is_active = false;

-- 2) Atualizar routing 'generate-ad-image' (modo Pro) → Gemini 3 Pro como primary
UPDATE public.ai_function_routing
SET primary_model_id = 'a7e6b742-964e-4a3a-afa1-31efe1d8c50d',  -- Gemini 3 Pro Image
    fallback_model_ids = ARRAY[
      'fe741112-71ed-4a8e-b48a-59dfe2e3169c'::uuid,  -- Gemini 2.5 Flash Image (google direto)
      '36a410bf-deb2-4277-95de-0477098a506e'::uuid,  -- GPT Image 1 (openai)
      'fdb15855-40cd-483c-b41c-6bc5ad2522be'::uuid   -- Gemini 2.5 Flash Image (via Lovable)
    ],
    notes = 'Magic Up modo Pro — qualidade máxima. Primary: Gemini 3 Pro Image. Fallbacks: nano-banana → GPT Image 1 → nano-banana via Lovable.',
    updated_at = now()
WHERE function_name = 'generate-ad-image';

-- 3) Criar routing novo 'generate-ad-image-fast' (modo Fast) → nano-banana como primary
INSERT INTO public.ai_function_routing (
  function_name,
  primary_model_id,
  fallback_model_ids,
  required_capabilities,
  request_overrides,
  is_active,
  notes
)
VALUES (
  'generate-ad-image-fast',
  'fe741112-71ed-4a8e-b48a-59dfe2e3169c',  -- Gemini 2.5 Flash Image Preview (nano-banana, google direto)
  ARRAY[
    'fdb15855-40cd-483c-b41c-6bc5ad2522be'::uuid,  -- Gemini 2.5 Flash Image (via Lovable, fallback se Google direto falhar)
    '36a410bf-deb2-4277-95de-0477098a506e'::uuid   -- GPT Image 1 (último fallback)
  ],
  '{"image_out": true}'::jsonb,
  '{}'::jsonb,
  true,
  'Magic Up modo Fast (Nano Banana) — barato/rápido para iterações. Primary: Gemini 2.5 Flash Image. Fallback Lovable → OpenAI.'
)
ON CONFLICT (function_name) DO UPDATE
SET primary_model_id = EXCLUDED.primary_model_id,
    fallback_model_ids = EXCLUDED.fallback_model_ids,
    required_capabilities = EXCLUDED.required_capabilities,
    notes = EXCLUDED.notes,
    is_active = true,
    updated_at = now();

COMMIT;
