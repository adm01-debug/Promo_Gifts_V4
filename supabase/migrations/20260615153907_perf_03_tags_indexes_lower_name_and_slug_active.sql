
-- ══════════════════════════════════════════════════════════════════
-- MIGRATION 03: tags — índices para padrões de busca reais
--
-- Gap 1: LOWER(name) usado por fn_auto_link_eco, fn_auto_link_feminino,
--         fn_auto_link_tags → seq scan (nenhum índice funcional)
-- Gap 2: (slug) WHERE is_active=true → cobre o padrão mais frequente
--         (fn_apply_auto_tag_rules, fn_apply_supplier_flag_tags × 9 slugs)
--         com índice ainda menor que o compound existente
-- ══════════════════════════════════════════════════════════════════

-- Índice funcional em LOWER(name) — para lookups case-insensitive por nome
CREATE INDEX IF NOT EXISTS idx_tags_lower_name
  ON public.tags (lower(name))
  WHERE is_active = true;

-- Índice parcial em slug para tags ativas — padrão mais frequente nas funções
-- Complementa o compound (slug, org_id) existente: este é menor e
-- elimina o step de Filter: is_active no plan
CREATE INDEX IF NOT EXISTS idx_tags_slug_active
  ON public.tags (slug)
  WHERE is_active = true;

COMMENT ON INDEX public.idx_tags_lower_name IS
'Suporte para fn_auto_link_eco, fn_auto_link_feminino, fn_auto_link_tags:
WHERE LOWER(name) IN (...) OR LOWER(slug) IN (...)';

COMMENT ON INDEX public.idx_tags_slug_active IS
'Suporte para fn_apply_auto_tag_rules e fn_apply_supplier_flag_tags:
WHERE slug = $1 AND is_active = true (padrão mais frequente — 9 slugs hardcoded)';
;
