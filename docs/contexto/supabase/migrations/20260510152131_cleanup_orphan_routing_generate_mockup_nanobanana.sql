-- Remove routing órfão: a edge generate-mockup-nanobanana foi deletada em 10/mai/2026
-- (PR #132 mergeado, edge removida via workflow delete-orphan-edges com extraEdges).
-- O routing era um stub originalmente criado em 10/mai (commit 1:19am UTC) com plano de
-- ativar Gemini Flash Image, mas o fluxo final ficou unificado em generate-ad-image
-- (Pro) e generate-ad-image-fast (nano-banana), tornando este routing redundante.

DELETE FROM public.ai_function_routing
WHERE id = 'a3192a9c-7dbd-4713-a706-9a511ed012ea'
  AND function_name = 'generate-mockup-nanobanana';
