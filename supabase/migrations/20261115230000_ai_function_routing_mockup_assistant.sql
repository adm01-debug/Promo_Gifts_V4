-- mockup-assistant: linha de roteamento de IA (a edge nao funciona sem ela).
--
-- O roteador exige uma linha ATIVA em public.ai_function_routing e nao tem modelo
-- padrao quando ela falta (_shared/ai-router/index.ts): sem esta linha, todo pedido
-- valido ao assistente devolve 502. A edge foi resgatada na PR #3666 e a linha
-- nunca existiu em producao (consulta read-only em 2026-11-15: 18 funcoes
-- cadastradas, `mockup-assistant` ausente).
--
-- Politica do dono, gravada aqui e nao so no codigo: SOMENTE DeepSeek Flash,
-- nunca Pro. `fallback_model_ids` fica VAZIO de proposito — e o que garante que
-- nenhum modelo diferente seja chamado (e pago) para esta funcao, porque o
-- roteador so chama o que esta na lista de candidatos. A conferencia
-- `isFlashModel` na edge e defesa em profundidade, nao a trava principal.
--
-- primary_model_id = e375d89c-8f14-44c9-892b-d213372dbc44
--   -> ai_models.model_id = 'deepseek-v4-flash' (provedor deepseek, is_active = true),
--      o mesmo primario que outras 12 funcoes ja usam.
-- Idempotente: ON CONFLICT pelo nome da funcao, para reaplicacao ser no-op.

INSERT INTO public.ai_function_routing
  (function_name, primary_model_id, fallback_model_ids, required_capabilities, request_overrides, is_active, notes)
VALUES
  ('mockup-assistant',
   'e375d89c-8f14-44c9-892b-d213372dbc44'::uuid,
   '{}'::uuid[],
   '{"text": true}'::jsonb,
   '{}'::jsonb,
   true,
   'Assistente do gerador de mockups. SOMENTE DeepSeek Flash, nunca Pro: fallback vazio de proposito (PR #3666).')
ON CONFLICT (function_name) DO NOTHING;
