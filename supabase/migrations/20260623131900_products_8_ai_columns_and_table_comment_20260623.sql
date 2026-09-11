
-- Melhoria 8: Documentar colunas AI + COMMENT na tabela products

-- AI columns — 63.4% ai_description null (worker parado desde 23/04)
COMMENT ON COLUMN public.products.ai_description IS
'Descrição gerada por IA. null_frac≈63% (worker parado desde 2026-04-23, reativação pendente). Gerado via ai_enrichment_queue.';
COMMENT ON COLUMN public.products.ai_title IS
'Título gerado por IA. Par com ai_description. Worker parado desde 2026-04-23.';
COMMENT ON COLUMN public.products.ai_summary IS
'Sumário gerado por IA para product cards. Worker parado desde 2026-04-23.';
COMMENT ON COLUMN public.products.ai_version IS
'Versão do modelo de IA que gerou o conteúdo. Inteiro incremental.';
COMMENT ON COLUMN public.products.ai_generated_at IS
'Timestamp de geração do conteúdo de IA.';
COMMENT ON COLUMN public.products.ai_model IS
'Identificador do modelo de IA (ex: claude-3-sonnet-20240229).';

-- COMMENT na tabela products documentando o estado atual
COMMENT ON TABLE public.products IS
'GOD TABLE principal do catálogo de brindes.
ESTADO (2026-06-23): 152 colunas após refatoração contínua (era 152 em 06/03, stável).
ARQUITETURA: 9 domínios misturados — Core, SEO, AI, Physical, Fiscal, Supply, Counters, Cache, Flags.
MELHORIAS APLICADAS 2026-06-23:
  - dimensions jsonb DROPADA → escalares canônicos (sessions 2+3)
  - dimensions_source adicionada (origin: cm/mm/estimated)
  - sku_promo auto-sync trigger (sempre = sku)
  - ipi_rate, ncm_id, bitrix_product_id, tax_reference_state expostos em v_products_public
  - 12 índices mortos dropados (~5.4MB)
  - CHECKs: robots_meta, price_freshness, name_max_250, sku_promo=sku
BACKLOG:
  - internal_*_cm (kit-builder, 12 refs) — DROP requer refatoração
  - sku_promo → DROP após refatorar gold-relations.ts/types.ts
  - Colunas AI-worker reativação pendente';
;
