-- [anti-regressao 2026-06 | fix_version color_sync_isactive] GAP: trg_sync_colors_to_product disparava apenas em
-- UPDATE OF color_name, color_id -- NAO em is_active. Resultado: ao desativar/reativar uma variante, o swatch era
-- reconstruido (trg_rebuild_swatches_on_variant ja inclui is_active) mas products.colors NAO era ressincronizado,
-- podendo ficar stale (listar cor de variante descontinuada). Alinha a lista de colunas com o trigger de swatch.
-- NAO REMOVER is_active da lista de colunas.
DROP TRIGGER IF EXISTS trg_sync_colors_to_product ON public.product_variants;
CREATE TRIGGER trg_sync_colors_to_product
  AFTER INSERT OR DELETE OR UPDATE OF color_name, color_id, is_active
  ON public.product_variants
  FOR EACH ROW EXECUTE FUNCTION fn_trigger_sync_colors_to_product();;
