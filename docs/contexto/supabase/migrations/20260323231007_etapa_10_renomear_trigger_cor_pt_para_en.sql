-- ETAPA 10: Padronizar nomenclatura do trigger PT -> EN
-- Renomear trg_auto_vincular_cor_variante -> trg_auto_resolve_variant_color
-- (manter mesma funcao, apenas renomear o trigger)

-- Drop e recreate com novo nome (PostgreSQL nao tem ALTER TRIGGER...RENAME facilmente)
DROP TRIGGER IF EXISTS trg_auto_vincular_cor_variante ON public.product_variants;

CREATE TRIGGER trg_auto_resolve_variant_color
  BEFORE INSERT OR UPDATE ON public.product_variants
  FOR EACH ROW EXECUTE FUNCTION fn_auto_vincular_cor_variante();

-- Documentar via comment
COMMENT ON TRIGGER trg_auto_resolve_variant_color ON public.product_variants IS 
  'BEFORE: Resolve color_id a partir de attributes->codigo_cor/cor via supplier_colors + color_equivalences. Parte 1 do pipeline de cor (BEFORE resolve -> AFTER link categorias -> AFTER feminino -> AFTER sync cache).';

COMMENT ON TRIGGER trg_auto_link_variant_color ON public.product_variants IS
  'AFTER: Linka produto a categorias de cor quando color_id muda. Parte 2 do pipeline de cor.';

COMMENT ON TRIGGER trg_auto_link_feminine_color ON public.product_variants IS
  'AFTER: Se cor e feminina, marca target_audience + datas comemorativas (Dia da Mulher, Dia das Maes). Parte 3 do pipeline de cor.';

COMMENT ON TRIGGER trg_sync_colors_to_product ON public.product_variants IS
  'AFTER: Sincroniza cache JSONB products.colors a partir das variantes. Parte 4 do pipeline de cor. DEPRECAR quando JSONB colors for removido.';
