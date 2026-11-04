CREATE OR REPLACE FUNCTION public.fn_audit_category_health()
 RETURNS TABLE(categoria_id uuid, categoria_nome text, nivel integer, tipo text, produtos_main integer, produtos_pca integer, descendentes integer, acao_recomendada text)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  SELECT 
    c.id,
    c.name,
    c.level,
    CASE
      WHEN c.descendants_count > 0 AND COUNT(p.id)=0 AND COUNT(pca.product_id)=0 
        THEN 'navegacao'
      WHEN c.descendants_count = 0 AND COUNT(p.id) = 0 AND COUNT(pca.product_id) > 0 
        THEN 'tag_institucional'
      WHEN c.descendants_count = 0 AND COUNT(p.id) = 0 AND COUNT(pca.product_id) = 0 
        THEN 'vazia'
      ELSE 'ativa'
    END::text as tipo,
    COUNT(DISTINCT p.id)::integer as produtos_main,
    COUNT(DISTINCT pca.product_id)::integer as produtos_pca,
    c.descendants_count::integer,
    CASE
      WHEN c.descendants_count > 0 AND COUNT(p.id)=0 AND COUNT(pca.product_id)=0 
        THEN 'ok — nó de navegação, não requer ação'
      WHEN c.descendants_count = 0 AND COUNT(p.id) = 0 AND COUNT(pca.product_id) > 0 
        THEN 'ok — categoria de tag institucional, manter visível'
      WHEN c.descendants_count = 0 AND COUNT(p.id) = 0 AND COUNT(pca.product_id) = 0 
        THEN 'revisar — categoria vazia: popular com produtos ou ocultar (is_visible=false)'
      ELSE 'ok — categoria ativa com produtos'
    END::text
  FROM categories c
  LEFT JOIN products p ON p.main_category_id = c.id AND p.is_active=true
  LEFT JOIN product_category_assignments pca ON pca.category_id = c.id
  WHERE c.is_active = true
  GROUP BY c.id, c.name, c.level, c.descendants_count
  ORDER BY tipo, c.level, c.name;
$function$
