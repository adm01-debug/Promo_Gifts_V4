-- Rollback: 20261112120400_fn_insights_cache_count
-- Remove a RPC de contagem de cache de insights. Depois disso o painel de Inteligencia de Mercado em
-- /admin/consumo-ia volta a mostrar a contagem de cache como "indisponivel" (a RPC passa a falhar).
-- Nenhum GRANT/policy de tabela ou view foi alterado pela migration, entao nada mais a reverter.

DROP FUNCTION IF EXISTS public.fn_insights_cache_count(text, timestamptz);
