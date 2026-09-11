
-- FIX C2: Limpar schema dashboard_insights_cache + reconstruir view ai_insights_cache
--
-- Contexto: ai_insights_cache é uma VIEW sobre dashboard_insights_cache (tabela base).
-- A tabela base ainda tem tokens_input/tokens_output (colunas mortas sempre NULL).
-- A VIEW precisa ser dropada antes de alterar a tabela base; depois recriada sem as colunas.
-- Ordem: DROP VIEW → ALTER TABLE → CREATE VIEW (operação atômica dentro de 1 transação DDL).

-- Passo 1: remover a VIEW para liberar a dependência
DROP VIEW IF EXISTS public.ai_insights_cache;

-- Passo 2: dropar colunas mortas da tabela base
ALTER TABLE public.dashboard_insights_cache
  DROP COLUMN IF EXISTS tokens_input,
  DROP COLUMN IF EXISTS tokens_output;

-- Passo 3: recriar VIEW sem as colunas descontinuadas
-- Mantém ai_insights_cache como alias de backward-compatibility.
-- INSERT/UPDATE/ON CONFLICT funcionam através de VIEW simples no PostgreSQL 17.
CREATE VIEW public.ai_insights_cache AS
SELECT
  id,
  user_id,
  function_name,
  cache_key,
  payload,
  model,
  duration_ms,
  created_at,
  expires_at
FROM public.dashboard_insights_cache;

COMMENT ON VIEW public.ai_insights_cache IS
  'View de compatibilidade sobre dashboard_insights_cache. '
  'Mantém o nome original para que funções existentes não precisem ser alteradas. '
  'INSERT/ON CONFLICT roteados automaticamente para a tabela base pelo PostgreSQL.';
;
