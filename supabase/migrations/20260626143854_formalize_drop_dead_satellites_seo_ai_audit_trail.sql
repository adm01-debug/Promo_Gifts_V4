-- ============================================================================
-- MELHORIA 1+2 (medallion satellites cleanup) — TRILHA DE AUDITORIA FORMAL
-- fix_version: 2026-06-26-satellites-dead-shell-removal
-- ----------------------------------------------------------------------------
-- CONTEXTO ARQUITETURAL (anti-regressao — NAO recriar product_seo/product_ai):
--   * product_seo e product_ai eram SATELITES "dual-write" criados mas nunca
--     finalizados. Diagnostico ao vivo (26/06/2026) provou que eram CASCAS
--     100% MORTAS: zero leitores (0 funcoes, 0 views, 0 FKs de entrada, 0
--     triggers alem de uma fn_refresh QUEBRADA).
--   * O frontend NAO le essas tabelas: serve por v_products_public, que produz
--     as colunas exclusivas dos satelites como CONSTANTES hardcoded
--     (NULL::text[] AS key_benefits, etc.). Logo o "drift" era inocuo.
--   * fn_refresh_product_satellites referenciava p.key_benefits / p.use_cases
--     em products (colunas inexistentes la) -> SEMPRE falhava -> codigo morto.
--   * Backups integrais preservados: _archive_product_seo_20260626 (6610),
--     _archive_product_ai_20260626 (6610).
--   * PRESERVADOS (NAO dropar): product_packaging e product_physical — estes
--     SAO escritos ativamente pelo pipeline medallion
--     (fn_promote_packaging_to_gold, fn_promote_padronizacao,
--      fn_sync_product_physical_from_products, fn_site_promote_to_gold,
--      fn_asia_site_promote_to_gold) e estao em expansao pelo proprio bot.
-- ----------------------------------------------------------------------------
-- Esta migration e IDEMPOTENTE e DEFENSIVA: o DROP real ja ocorreu via
-- execute_sql; aqui apenas formalizamos no historico. Se alguma das tabelas
-- "reaparecer" (ex.: recriada pelo bot Lovable) e estiver VAZIA, removemos;
-- se reaparecer COM dados, NAO tocamos e emitimos NOTICE para revisao manual.
-- ============================================================================

DO $$
DECLARE
  v_n bigint;
BEGIN
  -- product_seo
  IF to_regclass('public.product_seo') IS NOT NULL THEN
    EXECUTE 'SELECT count(*) FROM public.product_seo' INTO v_n;
    IF v_n = 0 THEN
      EXECUTE 'DROP TABLE public.product_seo';
      RAISE NOTICE '[satellites-cleanup] product_seo reaparecida vazia -> dropada.';
    ELSE
      RAISE WARNING '[satellites-cleanup] product_seo reapareceu com % linhas -> NAO dropada (revisao manual).', v_n;
    END IF;
  ELSE
    RAISE NOTICE '[satellites-cleanup] product_seo ja inexistente (esperado).';
  END IF;

  -- product_ai
  IF to_regclass('public.product_ai') IS NOT NULL THEN
    EXECUTE 'SELECT count(*) FROM public.product_ai' INTO v_n;
    IF v_n = 0 THEN
      EXECUTE 'DROP TABLE public.product_ai';
      RAISE NOTICE '[satellites-cleanup] product_ai reaparecida vazia -> dropada.';
    ELSE
      RAISE WARNING '[satellites-cleanup] product_ai reapareceu com % linhas -> NAO dropada (revisao manual).', v_n;
    END IF;
  ELSE
    RAISE NOTICE '[satellites-cleanup] product_ai ja inexistente (esperado).';
  END IF;

  -- funcao quebrada
  DROP FUNCTION IF EXISTS public.fn_refresh_product_satellites(uuid);
  DROP FUNCTION IF EXISTS public.fn_refresh_product_satellites();
END $$;

-- Documentar os backups (retencao recomendada: >= 90 dias, ate 2026-09-26)
DO $$
BEGIN
  IF to_regclass('public._archive_product_seo_20260626') IS NOT NULL THEN
    EXECUTE $c$ COMMENT ON TABLE public._archive_product_seo_20260626 IS
      'Backup de product_seo (casca morta removida em 2026-06-26, MELHORIA 1+2 medallion). Retencao ate ~2026-09-26.' $c$;
  END IF;
  IF to_regclass('public._archive_product_ai_20260626') IS NOT NULL THEN
    EXECUTE $c$ COMMENT ON TABLE public._archive_product_ai_20260626 IS
      'Backup de product_ai (casca morta removida em 2026-06-26, MELHORIA 1+2 medallion). Retencao ate ~2026-09-26.' $c$;
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';;
