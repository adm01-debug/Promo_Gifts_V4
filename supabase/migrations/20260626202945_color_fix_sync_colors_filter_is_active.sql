-- [anti-regressao 2026-06 | fix_version color_sync_isactive] BUG: fn_sync_product_colors_from_variants e
-- fn_sync_all_product_colors agregavam color_name SEM filtrar is_active, enquanto fn_rebuild_color_swatches
-- filtra is_active=true. Assimetria: ao desativar uma variante, o swatch removia a cor mas products.colors NAO
-- (recomputava incluindo a variante inativa) => colors podia ficar stale com cores descontinuadas.
-- Semantica correta: colors/has_colors refletem variantes ATIVAS. Impacto na aplicacao = 0 (nenhum produto
-- atualmente tem cor exclusiva de variante inativa). NAO REMOVER o filtro is_active.

CREATE OR REPLACE FUNCTION public.fn_sync_product_colors_from_variants(p_product_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
    v_colors JSONB;
    v_has_colors BOOLEAN;
BEGIN
    SELECT
        COALESCE(jsonb_agg(DISTINCT color_name ORDER BY color_name), '[]'::JSONB),
        COUNT(DISTINCT color_name) > 0
    INTO v_colors, v_has_colors
    FROM product_variants
    WHERE product_id = p_product_id
      AND is_active = true                         -- [fix color_sync_isactive] so cores de variantes ATIVAS
      AND color_name IS NOT NULL
      AND color_name != '';

    UPDATE products
    SET colors = v_colors, has_colors = v_has_colors
    WHERE id = p_product_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.fn_sync_all_product_colors()
 RETURNS TABLE(total_products integer, products_with_colors integer, products_without_colors integer)
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
    v_total INTEGER := 0;
    v_with_colors INTEGER := 0;
    v_without_colors INTEGER := 0;
BEGIN
    UPDATE products p
    SET
        colors = COALESCE((
            SELECT jsonb_agg(DISTINCT v.color_name ORDER BY v.color_name)
            FROM product_variants v
            WHERE v.product_id = p.id
              AND v.is_active = true               -- [fix color_sync_isactive]
              AND v.color_name IS NOT NULL
              AND v.color_name != ''
        ), '[]'::JSONB),
        has_colors = EXISTS (
            SELECT 1 FROM product_variants v
            WHERE v.product_id = p.id
              AND v.is_active = true               -- [fix color_sync_isactive]
              AND v.color_name IS NOT NULL
              AND v.color_name != ''
        );

    SELECT COUNT(*) INTO v_total FROM products;
    SELECT COUNT(*) INTO v_with_colors FROM products WHERE has_colors = true;
    v_without_colors := v_total - v_with_colors;
    RETURN QUERY SELECT v_total, v_with_colors, v_without_colors;
END;
$function$;;
