-- ============================================================================
-- fix_version: 20261125_restaura_grant_anon_mv_product_compositions
-- Rollback: supabase/rollbacks/20261125160000_rollback.sql
--
-- SINTOMA MEDIDO (ao vivo): `scripts/check-public-views-drift.mjs --require-live`
-- (Gate 1 - Lint + TypeScript, dentro de Deploy Gates) passou a falhar em
-- 2026-11-25 15:11Z (PR #4079) e 15:16Z (PR #4080), duas PRs independentes,
-- com a mesma mensagem e o mesmo objeto:
--     mv_product_compositions: entrada da allowlist sem efeito
--     (anon nao tem SELECT no objeto) -> remover a entrada
-- Nao e efeito de migration do repo: o repo nao revoga nada nesta view.
--
-- LINHA DO TEMPO (medida):
--   2026-11-24    dump `supabase/migrations-snapshot/SCHEMA_LIVE.sql:121216`
--                 -> GRANT SELECT ON TABLE "public"."mv_product_compositions" TO "anon";
--   2026-11-25 13:23Z ultima aplicacao em producao (`db-apply-migration.yml`,
--                 run 45623101508) aplica `20261125131000` com sucesso; o
--                 post-check dela exige anon SELECT nesta view (bloco 1) e passou;
--   2026-11-25 14:05Z Gate 1 da main verde (run 45629183424):
--                 "10 views do contrato OK (live); 617 objeto(s) conferido(s)";
--   2026-11-25 15:11Z/15:16Z Gate 1 vermelho nas duas PRs.
--   Na janela 14:05Z-15:11Z nenhum workflow tocou o banco (`Uptime Monitor` e
--   `Contexto para agentes de IA` apenas) e nenhuma migration foi aplicada.
--   => o SELECT de anon nesta view foi revogado FORA do repo. Mesmo padrao que a
--      `20261125131000` ja documentou para `fn_product_active_for_rls`
--      ("grant revogado fora do repo depois de 20260717161748").
--
-- IMPACTO NO NEGOCIO: `public.mv_product_compositions` e a view publica
-- (SECURITY DEFINER sobre `analytics.mv_product_compositions`) de onde o
-- catalogo anonimo le composicao de kit - `src/lib/external-db/rest-native.ts:107`
-- esta no whitelist de leitura do cliente anon. Sem o grant a leitura responde
-- 42501 e a composicao de kit some da pagina publica do produto.
--
-- ESCOPO: um GRANT na view publica. A matview-base `analytics.mv_product_compositions`
-- segue fechada para anon (bloco 8 do tripwire v5 e 20260905033200): a cadeia e
-- por view DEFINER, nao por grant na base.
-- ============================================================================
GRANT SELECT ON TABLE public.mv_product_compositions TO anon

-- ---------------------------------------------------------------------------
-- Post-check: comprova o efeito e prova que a superficie nao foi ampliada.
-- ---------------------------------------------------------------------------
DO $verify$
DECLARE
  v_find text;
BEGIN
  IF to_regclass('public.mv_product_compositions') IS NULL THEN
    RAISE EXCEPTION 'public.mv_product_compositions nao existe: a view publica do catalogo sumiu';
  END IF;

  IF NOT has_table_privilege('anon', 'public.mv_product_compositions', 'SELECT') THEN
    RAISE EXCEPTION 'anon continua sem SELECT em public.mv_product_compositions (catalogo publico quebrado)';
  END IF;

  -- Nao ampliar superficie: a matview-base tem de seguir fechada para anon.
  IF to_regclass('analytics.mv_product_compositions') IS NOT NULL
     AND has_table_privilege('anon', 'analytics.mv_product_compositions', 'SELECT') THEN
    RAISE EXCEPTION 'anon passou a ler analytics.mv_product_compositions (bloco 8 do tripwire v5)';
  END IF;

  -- A view precisa seguir DEFINER; com invoker=true ela dependeria de grant na base.
  IF COALESCE((SELECT option_value FROM pg_options_to_table(
        (SELECT reloptions FROM pg_class
          WHERE relname = 'mv_product_compositions'
            AND relnamespace = 'public'::regnamespace))
      WHERE option_name = 'security_invoker'), 'false') = 'true' THEN
    RAISE EXCEPTION 'public.mv_product_compositions voltou a security_invoker=true';
  END IF;

  -- O tripwire v5 (20261125131000, bloco 1) exige este objeto: zero achado para ele.
  IF to_regprocedure('public.fn_verify_anon_catalog_grants()') IS NULL THEN
    RAISE NOTICE 'aviso: public.fn_verify_anon_catalog_grants() ausente; checagem de tripwire pulada';
  ELSE
    SELECT string_agg(f.object_name || ' [' || f.issue || ']', '; ')
      INTO v_find
    FROM public.fn_verify_anon_catalog_grants() f
    WHERE f.object_name = 'public.mv_product_compositions';

    IF v_find IS NOT NULL THEN
      RAISE EXCEPTION 'tripwire ainda acusa public.mv_product_compositions: %', v_find;
    END IF;
  END IF;

  RAISE NOTICE 'ok: anon le public.mv_product_compositions de novo, analytics segue fechada, view segue DEFINER';
END
$verify$
