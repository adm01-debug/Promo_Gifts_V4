CREATE OR REPLACE FUNCTION public.fn_resync_all_category_counts()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_updated integer := 0;
  v_color_inherited integer := 0;
BEGIN
  -- 1. Resync products_count via PCA
  UPDATE categories c
  SET products_count = COALESCE(sub.cnt, 0), updated_at = now()
  FROM (
    SELECT pca.category_id, COUNT(DISTINCT p.id) as cnt
    FROM product_category_assignments pca
    JOIN products p ON p.id = pca.product_id AND p.is_active = true
    GROUP BY pca.category_id
  ) sub
  WHERE c.id = sub.category_id AND c.products_count IS DISTINCT FROM sub.cnt;
  GET DIAGNOSTICS v_updated = ROW_COUNT;

  -- 2. Zerar categorias sem produtos
  UPDATE categories c
  SET products_count = 0, updated_at = now()
  WHERE c.products_count > 0
    AND NOT EXISTS (
      SELECT 1 FROM product_category_assignments pca
      JOIN products p ON p.id=pca.product_id AND p.is_active=true
      WHERE pca.category_id=c.id
    );

  -- 3. Restaurar visibilidade de categorias que ganharam produtos
  UPDATE categories c
  SET is_visible = true, updated_at = now()
  WHERE c.is_active = true AND c.is_visible = false AND c.products_count > 0;

  -- 4. Herdar color_hex de categorias novas sem cor (prevenção de gaps futuros)
  FOR v_color_inherited IN 2..6 LOOP
    UPDATE categories c
    SET color_hex = parent.color_hex, updated_at = now()
    FROM categories parent
    WHERE c.parent_id = parent.id
      AND c.level = v_color_inherited
      AND c.is_active = true
      AND c.color_hex IS NULL
      AND parent.color_hex IS NOT NULL;
  END LOOP;
  GET DIAGNOSTICS v_color_inherited = ROW_COUNT;

  RETURN jsonb_build_object(
    'updated_counts', v_updated,
    'color_inherited', v_color_inherited,
    'executed_at', now(),
    'total_visible', (SELECT COUNT(*) FROM categories WHERE is_active=true AND is_visible=true),
    'zero_color', (SELECT COUNT(*) FROM categories WHERE is_active=true AND color_hex IS NULL)
  );
END;
$function$
