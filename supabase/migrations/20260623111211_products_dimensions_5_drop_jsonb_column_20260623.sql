
-- ══════════════════════════════════════════════════════════════════
-- Melhoria 5: DROP da coluna dimensions jsonb da tabela products
-- PRÉ-REQUISITOS CONFIRMADOS (todos 0 dependências):
--   ✅ v_products_public: usa jsonb_build_object dos escalares
--   ✅ v_dimensions_source_divergence: atualizada (jsonb_* = NULL)
--   ✅ v_products_dimensions_audit: reorientada para escalares
--   ✅ 0 funções com dependência
--   ✅ 0 views com dependência
--   ✅ 0 índices em dimensions
--   ✅ 0 triggers com dependência
-- IMPACTO: remove ~4955 jsonb blobs da tabela
--   → VACUUM FULL futuro vai recuperar espaço significativo
-- ══════════════════════════════════════════════════════════════════
ALTER TABLE public.products
  DROP COLUMN IF EXISTS dimensions;

-- Registrar no COMMENT da tabela (não há COMMENT ON TABLE)
-- Registrar via migration description + schema_migrations
;
