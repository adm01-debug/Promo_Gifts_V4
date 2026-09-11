-- Fix PostgREST 400 on tabela_preco_gravacao_oficial?order=ordem_exibicao.asc
-- Root cause: the frontend reads this table through the bridge alias 'tecnica_gravacao'
--   (src/lib/db/postgrest.ts BRIDGE_ALIASES: tecnica_gravacao -> tabela_preco_gravacao_oficial)
--   in:
--     - src/hooks/tecnicas/useTecnicasList.ts::fetchTecnicasExterno  (orderBy ordem_exibicao, limit 200)
--     - src/lib/external-db/techniques.ts::fetchPromobrindTechniques (orderBy ordem_exibicao, limit 100)
--   and applies ORDER BY ordem_exibicao -- a column that existed ONLY on the sibling table
--   tecnicas_gravacao. PostgREST returned 42703 (undefined_column) -> HTTP 400.
-- Fix: add ordem_exibicao to tabela_preco_gravacao_oficial, mirroring tecnicas_gravacao.ordem_exibicao
--   (integer DEFAULT 99). Backfill a deterministic order by codigo_tabela. Purely additive and
--   regression-proof against the recurring Lovable-bot reintroduction of .order('ordem_exibicao').
DO $mig$
DECLARE
  v_exists boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_attribute
    WHERE attrelid = 'public.tabela_preco_gravacao_oficial'::regclass
      AND attname = 'ordem_exibicao'
      AND NOT attisdropped
  ) INTO v_exists;

  IF NOT v_exists THEN
    ALTER TABLE public.tabela_preco_gravacao_oficial
      ADD COLUMN ordem_exibicao integer NOT NULL DEFAULT 99;

    WITH ranked AS (
      SELECT id, row_number() OVER (ORDER BY codigo_tabela, id) AS rn
      FROM public.tabela_preco_gravacao_oficial
    )
    UPDATE public.tabela_preco_gravacao_oficial t
    SET ordem_exibicao = r.rn
    FROM ranked r
    WHERE r.id = t.id;

    COMMENT ON COLUMN public.tabela_preco_gravacao_oficial.ordem_exibicao IS
      'ANTI-REGRESSION (fix 2026-06-26): display order for the technique-list UI. Frontend reads this table via bridge alias tecnica_gravacao (dbInvoke BRIDGE_ALIASES) and ORDERs BY ordem_exibicao; column previously existed only on tecnicas_gravacao, causing PostgREST 400 (42703). Mirrors tecnicas_gravacao.ordem_exibicao (integer default 99). DO NOT DROP.';
  END IF;
END
$mig$;

-- Critical: refresh PostgREST schema cache so the new column is queryable immediately.
NOTIFY pgrst, 'reload schema';;
