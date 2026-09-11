
CREATE OR REPLACE FUNCTION public.fn_smoke_tests_categorization()
RETURNS TABLE(
  test_id   text,
  test_name text,
  expected  text,
  actual    text,
  passed    boolean
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_org uuid := '5db5aee1-064b-4ef4-9193-345dcd8274ea';
  v_active_total bigint;
  v_active_no_tags bigint;
  v_pct_no_tags numeric;
BEGIN

  SELECT COUNT(*) INTO v_active_total FROM products WHERE is_active=true;
  SELECT COUNT(*) INTO v_active_no_tags FROM products p WHERE p.is_active=true
    AND NOT EXISTS(SELECT 1 FROM product_tags pt WHERE pt.product_id=p.id);
  v_pct_no_tags := ROUND(100.0*v_active_no_tags/NULLIF(v_active_total,0),2);

  RETURN QUERY SELECT 'T01','COR variation_type existe e ativo','true',
    EXISTS(SELECT 1 FROM variation_types WHERE code='COR' AND organization_id=v_org AND is_active=true)::text,
    EXISTS(SELECT 1 FROM variation_types WHERE code='COR' AND organization_id=v_org AND is_active=true);

  RETURN QUERY SELECT 'T02','variation_values COR >= 90','true',
    (COUNT(*)>=90)::text, COUNT(*)>=90
    FROM variation_values vv JOIN variation_types vt ON vv.variation_type_id=vt.id
    WHERE vt.code='COR' AND vt.organization_id=v_org;

  RETURN QUERY SELECT 'T03','supplier_colors 100% linked a color_variations','true',
    (COUNT(*)=0)::text, COUNT(*)=0
    FROM supplier_colors WHERE color_variation_id IS NULL AND organization_id=v_org;

  RETURN QUERY SELECT 'T04','product_novelties sem duplicatas (product+supplier)','true',
    (COUNT(*)=0)::text, COUNT(*)=0
    FROM (SELECT product_id,COALESCE(supplier_id::text,'__null__') k,COUNT(*)n
          FROM product_novelties GROUP BY 1,2 HAVING COUNT(*)>1) x;

  RETURN QUERY SELECT 'T05','product_novelties: 0 expiradas ainda ativas','true',
    (COUNT(*)=0)::text, COUNT(*)=0
    FROM product_novelties
    WHERE is_active=true AND expires_at IS NOT NULL AND expires_at < NOW();

  RETURN QUERY SELECT 'T06','product_novelties: partial UNIQUE index supplier NOT NULL','true',
    EXISTS(SELECT 1 FROM pg_indexes WHERE tablename='product_novelties'
      AND indexdef ILIKE '%supplier_id IS NOT NULL%')::text,
    EXISTS(SELECT 1 FROM pg_indexes WHERE tablename='product_novelties'
      AND indexdef ILIKE '%supplier_id IS NOT NULL%');

  RETURN QUERY SELECT 'T07','categories: hierarquia >= 3 níveis','true',
    (COUNT(DISTINCT level)>=3)::text, COUNT(DISTINCT level)>=3
    FROM categories;

  RETURN QUERY SELECT 'T08','categories: >= 400 registros','true',
    (COUNT(*)>=400)::text, COUNT(*)>=400
    FROM categories;

  RETURN QUERY SELECT 'T09','color_variations: >= 80 registros','true',
    (COUNT(*)>=80)::text, COUNT(*)>=80
    FROM color_variations;

  RETURN QUERY SELECT 'T10','supplier_category_mappings: >= 100 registros','true',
    (COUNT(*)>=100)::text, COUNT(*)>=100
    FROM supplier_category_mappings;

  RETURN QUERY SELECT 'T11','variant_supplier_sources: 6 colunas next_date','true',
    (COUNT(*)=6)::text, COUNT(*)=6
    FROM information_schema.columns
    WHERE table_schema='public' AND table_name='variant_supplier_sources'
      AND column_name ILIKE 'next_date_%';

  RETURN QUERY SELECT 'T12','products ativos com category_id >= 99.9%','true',
    (ROUND(100.0*SUM(CASE WHEN category_id IS NOT NULL THEN 1 ELSE 0 END)/COUNT(*),2)>=99.9)::text,
    ROUND(100.0*SUM(CASE WHEN category_id IS NOT NULL THEN 1 ELSE 0 END)/COUNT(*),2)>=99.9
    FROM products WHERE is_active=true;

  RETURN QUERY SELECT 'T13','tags: UNIQUE (org_id, slug) existe','true',
    EXISTS(SELECT 1 FROM pg_indexes WHERE tablename='tags'
      AND indexdef ILIKE '%organization_id%slug%')::text,
    EXISTS(SELECT 1 FROM pg_indexes WHERE tablename='tags'
      AND indexdef ILIKE '%organization_id%slug%');

  RETURN QUERY SELECT 'T14','product_tags: UNIQUE (product_id, tag_id) existe','true',
    EXISTS(SELECT 1 FROM pg_indexes WHERE tablename='product_tags'
      AND indexdef ILIKE '%product_id%tag_id%' AND indexdef ILIKE '%unique%')::text,
    EXISTS(SELECT 1 FROM pg_indexes WHERE tablename='product_tags'
      AND indexdef ILIKE '%product_id%tag_id%' AND indexdef ILIKE '%unique%');

  RETURN QUERY SELECT 'T15','product_relationships: 0 duplicatas','true',
    (COUNT(*)=0)::text, COUNT(*)=0
    FROM (SELECT product_id,related_product_id,relationship_type,COUNT(*)n
          FROM product_relationships GROUP BY 1,2,3 HAVING COUNT(*)>1) x;

  RETURN QUERY SELECT 'T16',
    'product_tags: produtos sem tag <= 0.5% (Gold-only orphans aceitos)',
    '<= 0.5%',
    v_pct_no_tags::text || '%  (' || v_active_no_tags || ' de ' || v_active_total || ' ativos)',
    v_pct_no_tags <= 0.5;

  RETURN QUERY SELECT 'T17','variation_values: UNIQUE (org, type, value) existe','true',
    EXISTS(SELECT 1 FROM pg_indexes WHERE tablename='variation_values'
      AND indexdef ILIKE '%organization_id%variation_type_id%value%')::text,
    EXISTS(SELECT 1 FROM pg_indexes WHERE tablename='variation_values'
      AND indexdef ILIKE '%organization_id%variation_type_id%value%');

  RETURN QUERY SELECT 'T18','supplier_colors: index (supplier_id, code) existe','true',
    EXISTS(SELECT 1 FROM pg_indexes WHERE tablename='supplier_colors'
      AND indexdef ILIKE '%supplier_id%code%')::text,
    EXISTS(SELECT 1 FROM pg_indexes WHERE tablename='supplier_colors'
      AND indexdef ILIKE '%supplier_id%code%');

  RETURN QUERY SELECT 'T19','fn_expire_novelties() executável','true',
    EXISTS(SELECT 1 FROM pg_proc WHERE proname='fn_expire_novelties')::text,
    EXISTS(SELECT 1 FROM pg_proc WHERE proname='fn_expire_novelties');

  RETURN QUERY SELECT 'T20',
    'products ativos >= 7100',
    '>= 7100',
    v_active_total::text,
    v_active_total >= 7100;

END;
$$;
;
