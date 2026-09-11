
-- PASSO 5: Adicionar testes T21-T26 à fn_smoke_tests_categorization
-- Cobre os 4 blind spots identificados + 2 testes extras de governança
CREATE OR REPLACE FUNCTION public.fn_smoke_tests_categorization()
 RETURNS TABLE(test_id text, test_name text, expected text, actual text, passed boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

  -- ── TESTES ORIGINAIS T01-T20 ─────────────────────────────────────────────
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

  -- T07 ATUALIZADO: hierarquia entre 3 e 4 níveis (antes só >= 3, passava com L6)
  RETURN QUERY SELECT 'T07','categories: hierarquia ativa entre 3 e 4 níveis (max=4)','true',
    (COUNT(DISTINCT level) BETWEEN 3 AND 4)::text,
    COUNT(DISTINCT level) BETWEEN 3 AND 4
    FROM categories
    WHERE is_active=true AND deleted_at IS NULL;

  -- T08 ATUALIZADO: >= 300 registros ATIVOS não deletados (antes era 400 total)
  RETURN QUERY SELECT 'T08','categories ativas (não deletadas) >= 300','true',
    (COUNT(*)>=300)::text, COUNT(*)>=300
    FROM categories WHERE is_active=true AND deleted_at IS NULL;

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

  -- ── NOVOS TESTES T21-T26: GOVERNANÇA DE CATEGORIAS ──────────────────────

  -- T21 [BLIND SPOT 1]: Nenhum produto ativo com category_id em nível > 4
  -- Detecta regressão de categorias L5/L6 voltando ao pipeline
  RETURN QUERY SELECT 'T21',
    'Produtos ativos: category_id nivel máximo = 4 (nenhum em L5+)',
    '0',
    (SELECT COUNT(*)::text
     FROM products p
     JOIN categories c ON c.id = p.category_id
     WHERE p.is_active = true AND c.level > 4),
    (SELECT COUNT(*) = 0
     FROM products p
     JOIN categories c ON c.id = p.category_id
     WHERE p.is_active = true AND c.level > 4);

  -- T22 [BLIND SPOT 2]: Coerência Gold — category_id = main_category_id (0 divergências)
  -- Detecta regressão do trigger fn_sync_main_category_from_pca
  RETURN QUERY SELECT 'T22',
    'Gold coerência: category_id = main_category_id (0 divergências)',
    '0',
    (SELECT COUNT(*)::text
     FROM products
     WHERE is_active = true
       AND category_id IS NOT NULL
       AND main_category_id IS NOT NULL
       AND category_id != main_category_id),
    (SELECT COUNT(*) = 0
     FROM products
     WHERE is_active = true
       AND category_id IS NOT NULL
       AND main_category_id IS NOT NULL
       AND category_id != main_category_id);

  -- T23 [BLIND SPOT 3]: Todas as categorias L1-L3 ativas têm slug
  -- Sem slug = sem URL válida no site
  RETURN QUERY SELECT 'T23',
    'Categorias L1-L3 ativas: todas têm slug (0 sem slug)',
    '0',
    (SELECT COUNT(*)::text
     FROM categories
     WHERE level BETWEEN 1 AND 3
       AND is_active = true
       AND deleted_at IS NULL
       AND (slug IS NULL OR TRIM(slug) = '')),
    (SELECT COUNT(*) = 0
     FROM categories
     WHERE level BETWEEN 1 AND 3
       AND is_active = true
       AND deleted_at IS NULL
       AND (slug IS NULL OR TRIM(slug) = ''));

  -- T24 [BLIND SPOT 4]: supplier_subtype_category_map aponta só para cats ativas/não-deletadas
  -- Detecta contaminação por categorias órfãs no pipeline
  RETURN QUERY SELECT 'T24',
    'supplier_subtype_category_map: 0 entradas apontando para cats deletadas/inativas',
    '0',
    (SELECT COUNT(*)::text
     FROM supplier_subtype_category_map sscm
     LEFT JOIN categories c ON c.id = sscm.category_id
     WHERE c.id IS NULL 
       OR c.is_active = false 
       OR c.deleted_at IS NOT NULL),
    (SELECT COUNT(*) = 0
     FROM supplier_subtype_category_map sscm
     LEFT JOIN categories c ON c.id = sscm.category_id
     WHERE c.id IS NULL 
       OR c.is_active = false 
       OR c.deleted_at IS NOT NULL);

  -- T25 [EXTRA]: Produtos ativos têm PCA is_primary=true (0 órfãos)
  -- Garante integridade da atribuição primária de categoria
  RETURN QUERY SELECT 'T25',
    'Produtos ativos: todos têm PCA is_primary=true (0 órfãos)',
    '0',
    (SELECT COUNT(*)::text
     FROM products p
     WHERE p.is_active = true
       AND NOT EXISTS (
         SELECT 1 FROM product_category_assignments pca
         WHERE pca.product_id = p.id AND pca.is_primary = true
       )),
    (SELECT COUNT(*) = 0
     FROM products p
     WHERE p.is_active = true
       AND NOT EXISTS (
         SELECT 1 FROM product_category_assignments pca
         WHERE pca.product_id = p.id AND pca.is_primary = true
       ));

  -- T26 [EXTRA]: Nenhum produto ativo com category_id apontando para categoria deletada
  -- Detecta vazamentos de FK para categorias soft-deleted
  RETURN QUERY SELECT 'T26',
    'Produtos ativos: category_id aponta para categoria ativa (0 FK órfãs)',
    '0',
    (SELECT COUNT(*)::text
     FROM products p
     LEFT JOIN categories c ON c.id = p.category_id
     WHERE p.is_active = true
       AND p.category_id IS NOT NULL
       AND (c.id IS NULL OR c.is_active = false OR c.deleted_at IS NOT NULL)),
    (SELECT COUNT(*) = 0
     FROM products p
     LEFT JOIN categories c ON c.id = p.category_id
     WHERE p.is_active = true
       AND p.category_id IS NOT NULL
       AND (c.id IS NULL OR c.is_active = false OR c.deleted_at IS NOT NULL));

END;
$function$;

COMMENT ON FUNCTION public.fn_smoke_tests_categorization() IS
'Suite de smoke tests para categorização. 
T01-T20: testes originais.
T21: nível máximo L4 (detecta regressão L5).
T22: coerência category_id = main_category_id.
T23: slugs obrigatórios em L1-L3.
T24: pipeline SSCM sem categorias deletadas.
T25: PCA is_primary cobertura total.
T26: FK integrity category_id.
Atualizado: 2026-06-12 — adicionados T21-T26, T07/T08 corrigidos.';
;
