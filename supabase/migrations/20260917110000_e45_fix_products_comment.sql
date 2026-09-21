-- E45 — Corrige o COMMENT ON TABLE de public.products, desatualizado desde
-- 2026-06-23 (afirmava 152 colunas; contagem real hoje é 184 — drift de 32
-- colunas não documentado, achado #1 da etapa).
-- Plano: docs/plans/PLANO_DBA_CORRECOES_MELHORIAS_50_ETAPAS_2026-09-16.md (E45)
-- Ver docs/E45_PRODUCTS_GOD_TABLE_2026-09-17.md para a investigação completa
-- (achados #2-#5: satélites já documentados, product_physical já comentado
-- como write-only, proposta de decomposição sem DDL).
--
-- Só metadado (pg_catalog.pg_description via COMMENT ON TABLE) — nenhuma
-- coluna, trigger, função ou dado é alterado. Zero efeito em leitura/escrita.
--
-- [REQUER-PO] — não aplicado nesta revisão. Caminho de aplicação: E15
-- (.github/workflows/db-apply-migration.yml), nunca supabase db push.
--
-- Rollback: COMMENT ON TABLE public.products de volta ao texto de 2026-06-23
-- ("152 colunas...") — texto completo na seção "Reversão" ao final deste
-- arquivo. Metadado apenas, sem risco.

DO $precondition$
DECLARE
  v_comment text;
  v_columns int;
BEGIN
  IF to_regclass('public.products') IS NULL THEN
    RAISE EXCEPTION 'Precondição falhou: public.products não existe';
  END IF;

  SELECT obj_description('public.products'::regclass, 'pg_class') INTO v_comment;
  IF v_comment IS NULL OR v_comment NOT LIKE '%152 colunas%' THEN
    RAISE EXCEPTION 'Precondição falhou: comentário atual não contém "152 colunas" — alguém já corrigiu ou o texto mudou, investigar antes de prosseguir';
  END IF;

  SELECT count(*) INTO v_columns
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'products';
  IF v_columns <> 184 THEN
    RAISE EXCEPTION 'Precondição falhou: contagem real de colunas é % (esperava 184) — o achado #1 mudou desde a investigação, recontar antes de prosseguir', v_columns;
  END IF;
END;
$precondition$;

COMMENT ON TABLE public.products IS
  'GOD TABLE principal do catálogo de brindes.
ESTADO (2026-09-17, E45): 184 colunas (era 152 em 2026-06-23 — o comentário
  não foi mantido em sincronia com o schema; drift de 32 colunas não
  documentado entre 2026-06-23 e 2026-09-17, achado #1 de
  docs/E45_PRODUCTS_GOD_TABLE_2026-09-17.md).
ARQUITETURA: 9 domínios — Core, SEO, AI, Physical, Fiscal, Supply, Counters,
  Cache, Flags. 5 domínios têm satélite 1:1 por trigger (product_seo,
  product_ai_content, product_fiscal, product_supply, product_physical) —
  ~67 das 184 colunas já espelhadas (36%), arquitetura intencional e
  documentada (COMMENT ON TABLE próprio em cada satélite). Ver E45 achado #2
  para o mapeamento completo produtos↔satélite por coluna.
HISTÓRICO 2026-06-23 (preservado):
  - dimensions jsonb DROPADA → escalares canônicos (sessions 2+3)
  - dimensions_source adicionada (origin: cm/mm/estimated)
  - sku_promo auto-sync trigger (sempre = sku)
  - ipi_rate, ncm_id, bitrix_product_id, tax_reference_state expostos em v_products_public
  - 12 índices mortos dropados (~5.4MB)
  - CHECKs: robots_meta, price_freshness, name_max_250, sku_promo=sku
BACKLOG:
  - internal_*_cm (kit-builder, 12 refs) — DROP requer refatoração
  - sku_promo → DROP após refatorar gold-relations.ts/types.ts
  - Colunas AI-worker reativação pendente
  - product_physical: completar decomposição residual (~20 colunas
    físicas/dimensão/frete ainda não satelitadas — única lacuna com ROI
    claro, ver E45 achado #5; NÃO abrir satélite novo, estender o existente)';

DO $postcondition$
DECLARE
  v_comment text;
BEGIN
  SELECT obj_description('public.products'::regclass, 'pg_class') INTO v_comment;

  IF v_comment IS NULL OR v_comment LIKE '%152 colunas%' THEN
    RAISE EXCEPTION 'Pós-condição falhou: comentário ainda contém "152 colunas" ou está nulo — atualização não teve efeito';
  END IF;

  IF v_comment NOT LIKE '%184 colunas%' THEN
    RAISE EXCEPTION 'Pós-condição falhou: comentário novo não contém "184 colunas"';
  END IF;

  -- Confirma que nada de estrutural mudou (comment-only, sem efeito em colunas).
  IF (SELECT count(*) FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'products') <> 184 THEN
    RAISE EXCEPTION 'Pós-condição falhou: contagem de colunas mudou durante a migration — não deveria, comment-only';
  END IF;
END;
$postcondition$;

-- Reversão:
-- COMMENT ON TABLE public.products IS
--   'GOD TABLE principal do catálogo de brindes.
-- ESTADO (2026-06-23): 152 colunas após refatoração contínua (era 152 em 06/03, stável).
-- ARQUITETURA: 9 domínios misturados — Core, SEO, AI, Physical, Fiscal, Supply, Counters, Cache, Flags.
-- MELHORIAS APLICADAS 2026-06-23:
--   - dimensions jsonb DROPADA → escalares canônicos (sessions 2+3)
--   - dimensions_source adicionada (origin: cm/mm/estimated)
--   - sku_promo auto-sync trigger (sempre = sku)
--   - ipi_rate, ncm_id, bitrix_product_id, tax_reference_state expostos em v_products_public
--   - 12 índices mortos dropados (~5.4MB)
--   - CHECKs: robots_meta, price_freshness, name_max_250, sku_promo=sku
-- BACKLOG:
--   - internal_*_cm (kit-builder, 12 refs) — DROP requer refatoração
--   - sku_promo → DROP após refatorar gold-relations.ts/types.ts
--   - Colunas AI-worker reativação pendente';
