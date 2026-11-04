CREATE OR REPLACE FUNCTION public.fn_super_filtro_opcoes()
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT jsonb_build_object(
    -- Tamanhos disponíveis (apenas produtos com has_sizes=true)
    'tamanhos', (
      SELECT jsonb_agg(DISTINCT jsonb_build_object(
        'code',  pv.size_code,
        'total', cnt.total
      ) ORDER BY jsonb_build_object('code', pv.size_code, 'total', cnt.total))
      FROM product_variants pv
      JOIN products p ON p.id = pv.product_id AND p.is_active=true AND p.is_deleted=false
      JOIN (
        SELECT size_code, COUNT(DISTINCT product_id) AS total
        FROM product_variants
        WHERE is_active=true AND size_code IS NOT NULL
        GROUP BY size_code
      ) cnt ON cnt.size_code = pv.size_code
      WHERE pv.is_active=true AND pv.size_code IS NOT NULL
    ),
    -- Público-alvo distintos
    'publico_alvo', (
      SELECT jsonb_agg(jsonb_build_object('value', aud, 'total', cnt))
      FROM (
        SELECT unnest(target_audience) AS aud, COUNT(*) AS cnt
        FROM products
        WHERE is_active=true AND is_deleted=false
          AND target_audience IS NOT NULL
          AND array_length(target_audience,1) > 0
        GROUP BY aud
        ORDER BY cnt DESC
      ) t
    ),
    -- Gênero com contagem real
    'genero', (
      SELECT jsonb_agg(jsonb_build_object('value', gender, 'total', cnt))
      FROM (
        SELECT gender, COUNT(*) AS cnt
        FROM products
        WHERE is_active=true AND is_deleted=false AND gender IS NOT NULL
        GROUP BY gender ORDER BY cnt DESC
      ) t
    ),
    -- Acabamentos disponíveis
    'acabamento', (
      SELECT jsonb_agg(jsonb_build_object('value', fin, 'total', cnt))
      FROM (
        SELECT unnest(surface_finish) AS fin, COUNT(*) AS cnt
        FROM products
        WHERE is_active=true AND is_deleted=false
          AND surface_finish IS NOT NULL AND surface_finish <> '{}'
        GROUP BY fin ORDER BY cnt DESC
      ) t
    ),
    -- Técnicas de gravação (canonical)
    'tecnicas', (
      SELECT jsonb_agg(jsonb_build_object('value', engraving_type, 'total', cnt))
      FROM (
        SELECT engraving_type, COUNT(*) AS cnt
        FROM products
        WHERE is_active=true AND is_deleted=false AND engraving_type IS NOT NULL
        GROUP BY engraving_type ORDER BY cnt DESC
      ) t
    ),
    -- Stats gerais
    'total_produtos', (SELECT COUNT(*) FROM products WHERE is_active=true AND is_deleted=false),
    'em_estoque', (SELECT COUNT(*) FROM products WHERE is_active=true AND is_deleted=false AND stock_quantity > 0),
    'com_personalizacao', (SELECT COUNT(*) FROM products WHERE is_active=true AND is_deleted=false AND allows_personalization=true),
    'gerado_em', now()
  );
$function$
