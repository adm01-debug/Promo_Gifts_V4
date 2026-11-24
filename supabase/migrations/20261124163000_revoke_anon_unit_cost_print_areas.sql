-- Migration: 20261124163000_revoke_anon_unit_cost_print_areas.sql
-- Rollback: supabase/rollbacks/20261124163000_rollback.sql
--
-- Fecha o ultimo vazamento de custo real da superficie `anon` em `public`:
-- `print_area_techniques.unit_cost` (numeric(10,4), COMMENT: "Custo unitario de gravacao
-- sobrescrito para este produto") era legivel por qualquer portador da chave anon por DOIS
-- caminhos, medidos no dump ao vivo `supabase/migrations-snapshot/SCHEMA_LIVE.sql`
-- (2026-11-24T00:14:33Z):
--
--   1. direto na TABELA — `GRANT SELECT ON print_area_techniques TO anon` + policy
--      `pat_select_anon` (`FOR SELECT TO anon USING (is_active = true)`, linha 108749 do dump);
--   2. pela view publica `v_print_area_techniques_public` (`security_invoker = true`,
--      `WHERE is_active = true`), que projeta `unit_cost` na lista de colunas.
--
-- O caminho (2) e regressao de um hardening documentado: `20260611150000_medallion_front_
-- public_contract_hardening.sql` (bloco M4) define a view como "apenas geometria/ordem das areas
-- de gravacao (nada sensivel)" e NAO inclui `unit_cost`;
-- `20260623184459_melhoria_12_v_print_area_techniques_public_rebuild_v2.sql` reconstruiu a view
-- depois com a coluna, sem justificativa no arquivo. O front segue declarando o contrato antigo:
-- `src/integrations/supabase/gold-relations.ts:386` — "areas de gravacao sem custo".
--
-- Nenhum consumo do anon depende da coluna: `src/lib/personalization/adapters/print-area.adapter.ts`,
-- `src/lib/fetch-print-areas.ts` e `src/lib/lead-time/*` nao referenciam `unit_cost`; o editor de
-- gravacao do admin le a TABELA como `authenticated` (`useEngravingWizard.ts`,
-- `untypedFrom('print_area_techniques')`), que mantem SELECT na coluna.
--
-- O que esta migration faz:
--   * troca o GRANT de tabela do `anon` por GRANT por COLUNA, sem `unit_cost`;
--   * recria `v_print_area_techniques_public` sem `unit_cost`, preservando
--     `security_invoker = true` e o filtro `is_active = true` (nenhum comportamento de leitura muda);
--   * re-concede SELECT na view para `anon`, `authenticated` e `service_role` —
--     `fn_verify_anon_catalog_grants()` (20260717173510, lista de objetos) exige `anon SELECT`
--     nesta view e passaria a acusar FALTA sem o re-grant;
--   * post-check que aborta a transacao se o custo continuar legivel pelo anon, se o anon perder
--     a geometria, ou se o `authenticated` perder `unit_cost`.
--
-- O que NAO faz, de proposito: `tabela_preco_gravacao_oficial_faixa.preco_unitario` e
-- `v_compras_precos_faixa.unit_cost` continuam como estao — ali o valor e PRECO de venda/cotacao e
-- a leitura anon e decisao registrada (ver 20261124140000_close_anon_cost_surface.sql).
--
-- Seguranca da operacao: `REVOKE`/`GRANT` sao idempotentes; o DROP/CREATE da view e o unico passo
-- nao idempotente, e roda dentro da transacao do apply.

-- 1) Tabela: anon deixa de ter SELECT de tabela, recebe SELECT por coluna (sem unit_cost).
REVOKE SELECT ON TABLE public.print_area_techniques FROM anon;

GRANT SELECT (
  id,
  product_id,
  tabela_preco_id,
  location_code,
  location_name,
  location_order,
  max_width,
  max_height,
  is_curved,
  shape,
  technique_order,
  is_active,
  notes,
  production_days,
  created_at,
  updated_at
) ON TABLE public.print_area_techniques TO anon;

-- 2) View publica: mesma projecao de antes, sem a coluna de custo.
--    Sem CASCADE de proposito: se houver dependente, o DROP falha e nada e aplicado.
DROP VIEW IF EXISTS public.v_print_area_techniques_public;

CREATE VIEW public.v_print_area_techniques_public WITH (security_invoker = true) AS
SELECT
  "id",
  "product_id",
  "tabela_preco_id",
  "location_code",
  "location_name",
  "location_order",
  "max_width",
  "max_height",
  "is_curved",
  "shape",
  "technique_order",
  "is_active",
  "notes",
  "created_at",
  "updated_at"
FROM public.print_area_techniques
WHERE is_active = true;

ALTER VIEW public.v_print_area_techniques_public OWNER TO postgres;

COMMENT ON VIEW public.v_print_area_techniques_public IS 'Areas de gravacao publicas (geometria/ordem). NAO projeta unit_cost: custo de gravacao e dado interno (restaurado o contrato do bloco M4 de 20260611150000). security_invoker=true de proposito (P06, 20260716) - o anon le a tabela por GRANT por coluna, sem unit_cost.';

GRANT SELECT ON public.v_print_area_techniques_public TO anon, authenticated, service_role;
REVOKE INSERT, UPDATE, DELETE, REFERENCES, TRIGGER ON public.v_print_area_techniques_public FROM anon, authenticated;

-- 3) Post-check: aborta a transacao se qualquer afirmacao abaixo falhar.
DO $$
DECLARE
  v_rows bigint;
  v_custo_legivel boolean := false;
BEGIN
  IF has_column_privilege('anon', 'public.print_area_techniques', 'unit_cost', 'select') THEN
    RAISE EXCEPTION 'anon ainda tem GRANT na coluna print_area_techniques.unit_cost';
  END IF;

  IF NOT has_column_privilege('anon', 'public.print_area_techniques', 'product_id', 'select') THEN
    RAISE EXCEPTION 'anon perdeu leitura das colunas de geometria das areas de gravacao';
  END IF;

  IF NOT has_table_privilege('anon', 'public.v_print_area_techniques_public', 'select') THEN
    RAISE EXCEPTION 'anon perdeu SELECT na view publica de areas de gravacao';
  END IF;

  IF NOT has_column_privilege('authenticated', 'public.print_area_techniques', 'unit_cost', 'select') THEN
    RAISE EXCEPTION 'authenticated perdeu unit_cost - editor de gravacao do admin quebraria';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_attribute a
    WHERE a.attrelid = 'public.v_print_area_techniques_public'::regclass
      AND a.attname = 'unit_cost'
      AND a.attnum > 0
      AND NOT a.attisdropped
  ) THEN
    RAISE EXCEPTION 'v_print_area_techniques_public ainda projeta unit_cost';
  END IF;

  -- Prova funcional: le como anon de verdade.
  SET LOCAL ROLE anon;
  SELECT count(*) INTO v_rows FROM public.v_print_area_techniques_public;
  BEGIN
    PERFORM unit_cost FROM public.print_area_techniques LIMIT 1;
    v_custo_legivel := true;
  EXCEPTION WHEN insufficient_privilege THEN
    v_custo_legivel := false;
  END;
  RESET ROLE;

  IF v_custo_legivel THEN
    RAISE EXCEPTION 'anon ainda consegue ler print_area_techniques.unit_cost';
  END IF;

  RAISE NOTICE 'ok: anon le % linhas da view publica e nao le unit_cost', v_rows;
END $$;
