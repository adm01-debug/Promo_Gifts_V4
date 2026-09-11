-- CORRECTIVE BACKFILL (fix 2026-06-26): ordem_exibicao on tabela_preco_gravacao_oficial must honor
-- the curated catalog order defined in tecnicas_gravacao (parent technique linked via
-- grupo_tecnica = tecnicas_gravacao.codigo), then codigo_tabela within each group.
-- The initial backfill (migration 20260626120000) used pure alphabetical codigo_tabela order, which
-- ignored the curated tecnicas_gravacao.ordem_exibicao (16 distinct values 10..100, deliberate gaps).
-- This corrects all rows to the curated grouping order. Deterministic & idempotent (re-running is a no-op).
WITH ranked AS (
  SELECT t.id,
         row_number() OVER (ORDER BY g.ordem_exibicao, t.codigo_tabela, t.id) AS new_ord
  FROM public.tabela_preco_gravacao_oficial t
  JOIN public.tecnicas_gravacao g ON g.codigo::text = t.grupo_tecnica::text
)
UPDATE public.tabela_preco_gravacao_oficial t
SET ordem_exibicao = ranked.new_ord
FROM ranked
WHERE ranked.id = t.id
  AND t.ordem_exibicao IS DISTINCT FROM ranked.new_ord;

COMMENT ON COLUMN public.tabela_preco_gravacao_oficial.ordem_exibicao IS
'ANTI-REGRESSION (fix 2026-06-26): display order for the technique-list UI. Frontend reads this table via bridge alias tecnica_gravacao (dbInvoke BRIDGE_ALIASES) and ORDERs BY ordem_exibicao; column previously existed only on tecnicas_gravacao, causing PostgREST 400 (42703). NOT NULL DEFAULT 99 (intentionally STRICTER than tecnicas_gravacao.ordem_exibicao which is nullable - prevents ordering surprises). Values backfilled to honor the CURATED order: parent technique tecnicas_gravacao.ordem_exibicao (joined via grupo_tecnica=tecnicas_gravacao.codigo), then codigo_tabela within group. DO NOT DROP.';;
