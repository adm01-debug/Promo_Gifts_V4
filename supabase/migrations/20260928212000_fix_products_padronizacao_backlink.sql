-- Migration: fix_products_padronizacao_backlink
-- Projeto canônico: doufsxqlfjyuvxuezpln (PG17). Aplicar SÓ via
-- .github/workflows/db-apply-migration.yml (E15) — CLAUDE.md REGRA #8.
--
-- Causa raiz (medida em 2026-09-28, pg_catalog + contagem real):
--   fn_promote_padronizacao grava produtos_padronizacao.product_id (Silver→Gold)
--   mas NUNCA gravou products.padronizacao_id (Gold→Silver). A string
--   'padronizacao_id' não aparece no corpo da função em produção.
--   Resultado: 528 products com padronizacao_id IS NULL, dos quais 522 têm a
--   Silver 'promoted' apontando exatamente para eles (pp.product_id = p.id).
--   O gap cresce a cada promoção nova (XBZ: 469 casos, último em 2026-09-26).
--   Os 6 restantes (ASIA/88BRINDES, fev–mar/2026) são anteriores ao Medallion
--   e não têm Silver — ficam fora, de propósito.
--
-- Efeito desta migration (idempotente, uma transação via psql -1):
--   1. Backfill do back-link nos produtos já promovidos, por join exato em
--      produtos_padronizacao.product_id (não por supplier_reference).
--   2. fn_promote_padronizacao passa a gravar padronizacao_id no INSERT
--      (produto novo) e no UPDATE (produto existente). Corpo idêntico ao vivo
--      (pg_get_functiondef em 2026-09-28) + as duas linhas novas; única
--      diferença cosmética: `COALESCE(TRIM(v_cat_l1),'') <> ''` no lugar de
--      `v_cat_l1 IS NOT NULL AND TRIM(v_cat_l1) <> ''` (mesma semântica; evita
--      falso positivo do SonarCloud na regra de comparação com NULL). SECURITY
--      DEFINER + search_path preservados; CREATE OR REPLACE mantém owner/ACL.
--   3. Pós-check fail-closed: se sobrar produto sem back-link cuja Silver
--      'promoted' aponta para ele, RAISE → rollback de tudo.
--
-- Triggers em products: 42. Esta migration seta app.write_source='pipeline' e
--   app.bulk_import_mode='true' (transação-local), exatamente como
--   fn_promote_padronizacao, para não acionar fn_products_capture_manual_edits
--   (locked_fields) nem fn_trigger_product_automation. padronizacao_id não
--   está na lista de campos capturados, mas o GUC é setado por simetria.
--
-- Rollback: migration compensatória que (a) restaura a definição anterior de
--   fn_promote_padronizacao (esta menos as duas linhas `padronizacao_id`) e
--   (b) `UPDATE products p SET padronizacao_id = NULL FROM produtos_padronizacao
--   pp WHERE pp.product_id = p.id AND p.padronizacao_id = pp.id AND p.updated_at
--   >= '<timestamp UTC do apply>'`. Nunca reeditar este arquivo.

SELECT set_config('app.write_source',     'pipeline', true);
SELECT set_config('app.bulk_import_mode', 'true',     true);

-- 1) Backfill do back-link (522 linhas esperadas em 2026-09-28)
UPDATE public.products p
SET    padronizacao_id = pp.id,
       updated_at      = now()
FROM   public.produtos_padronizacao pp
WHERE  pp.product_id     = p.id
  AND  pp.status         = 'promoted'
  AND  p.padronizacao_id IS NULL;

-- 2) fn_promote_padronizacao passa a gravar o back-link
CREATE OR REPLACE FUNCTION public.fn_promote_padronizacao(p_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  s        public.produtos_padronizacao%ROWTYPE;
  v_pid    uuid;
  v_org    uuid;
  v_locked text[];
  v_is_new boolean := false;
  v_cat_id   uuid    := NULL;
  v_cat_src  text;
  v_cat_l1   text;
  v_existing_cat uuid := NULL;
  v_min_qty  integer := NULL;
  v_display_name text;
BEGIN
  SELECT * INTO s FROM public.produtos_padronizacao WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'padronizacao_nao_encontrada', 'id', p_id);
  END IF;
  IF s.status <> 'standardized' THEN
    RETURN jsonb_build_object('success', false, 'error', 'status_invalido', 'status', s.status);
  END IF;

  PERFORM set_config('app.write_source',     'pipeline', true);
  PERFORM set_config('app.bulk_import_mode', 'true',     true);

  v_display_name := public.fn_display_product_name(s.name);

  SELECT id, locked_fields, category_id INTO v_pid, v_locked, v_existing_cat
  FROM public.products
  WHERE supplier_id = s.supplier_id AND supplier_reference = s.supplier_reference;

  IF v_pid IS NULL THEN
    v_is_new := true;
    SELECT organization_id INTO v_org FROM public.suppliers WHERE id = s.supplier_id;
    INSERT INTO public.products (organization_id, supplier_id, supplier_reference, sku, name, is_active, product_type, category_id, padronizacao_id)
    VALUES (v_org, s.supplier_id, s.supplier_reference,
            COALESCE(s.supplier_reference, s.name),
            COALESCE(v_display_name, s.name, 'Produto ' || s.supplier_reference),
            true, 'product', 'c0000000-0000-0000-0000-000000000000', p_id)
    RETURNING id, locked_fields INTO v_pid, v_locked;
  END IF;

  v_locked := COALESCE(v_locked, '{}');

  -- Categoria nível 1
  IF s.raw_id IS NOT NULL AND NOT ('category_id' = ANY(v_locked)) THEN
    BEGIN
      SELECT sfm.source_field INTO v_cat_src
      FROM public.supplier_field_mappings sfm
      WHERE sfm.supplier_id = s.supplier_id AND sfm.target_field = 'categories'
      LIMIT 1;
      IF v_cat_src IS NOT NULL THEN
        SELECT split_part(COALESCE(spr.raw_data ->> v_cat_src, ''), '|', 1)
        INTO v_cat_l1
        FROM public.supplier_products_raw spr WHERE spr.id = s.raw_id;
        IF COALESCE(TRIM(v_cat_l1), '') <> '' THEN
          SELECT scm.category_id INTO v_cat_id
          FROM public.supplier_categories sc
          JOIN public.supplier_category_mappings scm ON scm.supplier_category_id = sc.id
          WHERE sc.supplier_id = s.supplier_id AND TRIM(sc.supplier_code) = TRIM(v_cat_l1)
          LIMIT 1;
        END IF;
      END IF;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END IF;

  IF v_cat_id IS NULL AND v_existing_cat IS NULL AND NOT ('category_id' = ANY(v_locked)) THEN
    v_cat_id := public.fn_promote_category_fallback(s.name);
  END IF;

  IF s.min_quantity IS NOT NULL THEN
    SELECT GREATEST(s.min_quantity, COALESCE(c.min_order_quantity, 1))
    INTO v_min_qty
    FROM public.categories c
    WHERE c.id = COALESCE(v_cat_id,
        (SELECT category_id FROM public.products WHERE id = v_pid));
    v_min_qty := COALESCE(v_min_qty, s.min_quantity);
  END IF;

  UPDATE public.products p SET
    sku                = COALESCE(p.sku, s.supplier_reference, s.name),
    name               = CASE WHEN 'name'               = ANY(v_locked) THEN p.name               ELSE COALESCE(v_display_name, s.name, p.name)           END,
    description        = CASE WHEN 'description'        = ANY(v_locked) THEN p.description        ELSE COALESCE(s.description,        p.description)        END,
    short_description  = CASE WHEN 'short_description'  = ANY(v_locked) THEN p.short_description  ELSE COALESCE(s.short_description,  p.short_description)  END,
    cost_price         = CASE WHEN 'cost_price'         = ANY(v_locked) THEN p.cost_price         ELSE COALESCE(NULLIF(s.cost_price,      0), p.cost_price)      END,
    suggested_price    = CASE WHEN 'suggested_price'    = ANY(v_locked) THEN p.suggested_price    ELSE COALESCE(NULLIF(s.suggested_price, 0), p.suggested_price) END,
    stock_quantity     = CASE WHEN 'stock_quantity'     = ANY(v_locked) THEN p.stock_quantity     ELSE COALESCE(s.stock_quantity,     p.stock_quantity)     END,
    min_quantity       = CASE WHEN 'min_quantity'       = ANY(v_locked) THEN p.min_quantity
                              WHEN v_min_qty IS NOT NULL                THEN v_min_qty
                              ELSE COALESCE(s.min_quantity, p.min_quantity)              END,
    primary_image_url  = CASE
      WHEN 'primary_image_url' = ANY(v_locked)        THEN p.primary_image_url
      WHEN p.primary_image_url LIKE '%imagedelivery%' THEN p.primary_image_url
      ELSE COALESCE(s.primary_image_url, p.primary_image_url)
    END,
    images             = CASE WHEN 'images'             = ANY(v_locked) THEN p.images             ELSE COALESCE(s.images,             p.images)             END,
    ncm_code           = CASE WHEN 'ncm_code'           = ANY(v_locked) THEN p.ncm_code           ELSE COALESCE(NULLIF(s.ncm_code,'00000000'), p.ncm_code)  END,
    weight_g           = CASE WHEN 'weight_g'           = ANY(v_locked) THEN p.weight_g           ELSE COALESCE(NULLIF(s.weight_g,   0), p.weight_g)   END,
    height_cm          = CASE WHEN 'height_cm'          = ANY(v_locked) THEN p.height_cm          ELSE COALESCE(NULLIF(s.height_cm,  0), p.height_cm)  END,
    width_cm           = CASE WHEN 'width_cm'           = ANY(v_locked) THEN p.width_cm           ELSE COALESCE(NULLIF(s.width_cm,   0), p.width_cm)   END,
    length_cm          = CASE WHEN 'length_cm'          = ANY(v_locked) THEN p.length_cm          ELSE COALESCE(NULLIF(s.length_cm,  0), p.length_cm)  END,
    circumference_cm   = CASE WHEN 'circumference_cm'   = ANY(v_locked) THEN p.circumference_cm   ELSE COALESCE(NULLIF(s.circumference_cm, 0), p.circumference_cm) END,
    diameter_cm        = CASE WHEN 'diameter_cm'        = ANY(v_locked) THEN p.diameter_cm        ELSE COALESCE(NULLIF(s.diameter_cm, 0), p.diameter_cm) END,
    dimensions_display = CASE WHEN 'dimensions_display' = ANY(v_locked) THEN p.dimensions_display ELSE COALESCE(s.dimensions_display, p.dimensions_display) END,
    box_length_cm      = CASE WHEN 'box_length_cm'      = ANY(v_locked) THEN p.box_length_cm      ELSE COALESCE(s.box_length_cm,      p.box_length_cm)      END,
    box_width_cm       = CASE WHEN 'box_width_cm'       = ANY(v_locked) THEN p.box_width_cm       ELSE COALESCE(s.box_width_cm,       p.box_width_cm)       END,
    box_height_cm      = CASE WHEN 'box_height_cm'      = ANY(v_locked) THEN p.box_height_cm      ELSE COALESCE(s.box_height_cm,      p.box_height_cm)      END,
    box_weight_kg      = CASE WHEN 'box_weight_kg'      = ANY(v_locked) THEN p.box_weight_kg      ELSE COALESCE(s.box_weight_kg,      p.box_weight_kg)      END,
    box_volume_cm3     = CASE WHEN 'box_volume_cm3'     = ANY(v_locked) THEN p.box_volume_cm3     ELSE COALESCE(s.box_volume_cm3,     p.box_volume_cm3)     END,
    box_quantity       = CASE WHEN 'box_quantity'       = ANY(v_locked) THEN p.box_quantity       ELSE COALESCE(s.box_quantity,       p.box_quantity)       END,
    box_inner_quantity = CASE WHEN 'box_inner_quantity' = ANY(v_locked) THEN p.box_inner_quantity ELSE COALESCE(s.box_inner_quantity, p.box_inner_quantity) END,
    brand              = CASE WHEN 'brand'              = ANY(v_locked) THEN p.brand              ELSE COALESCE(s.brand,              p.brand)              END,
    packing_type       = CASE WHEN 'packing_type'       = ANY(v_locked) THEN p.packing_type       ELSE COALESCE(s.packing_type,       p.packing_type)       END,
    repacking_type     = CASE WHEN 'repacking_type'     = ANY(v_locked) THEN p.repacking_type     ELSE COALESCE(s.repacking_type,     p.repacking_type)     END,
    capacities         = CASE WHEN 'capacities'         = ANY(v_locked) THEN p.capacities         ELSE COALESCE(s.capacities,         p.capacities)         END,
    capacity_ml        = CASE WHEN 'capacity_ml'        = ANY(v_locked) THEN p.capacity_ml        ELSE COALESCE(NULLIF(s.capacity_ml, 0), p.capacity_ml) END,
    ipi_rate           = CASE WHEN 'ipi_rate'           = ANY(v_locked) THEN p.ipi_rate           ELSE COALESCE(s.ipi_rate,           p.ipi_rate)           END,
    engraving_type     = CASE WHEN 'engraving_type'     = ANY(v_locked) THEN p.engraving_type     ELSE COALESCE(s.engraving_type,     p.engraving_type)     END,
    colors             = CASE WHEN 'colors'             = ANY(v_locked) THEN p.colors             ELSE COALESCE(s.colors,             p.colors)             END,
    combined_sizes     = CASE WHEN 'combined_sizes'     = ANY(v_locked) THEN p.combined_sizes     ELSE COALESCE(s.combined_sizes,     p.combined_sizes)     END,
    box_image          = CASE WHEN 'box_image'          = ANY(v_locked) THEN p.box_image          ELSE COALESCE(s.box_image,          p.box_image)          END,
    is_textil          = CASE WHEN 'is_textil'          = ANY(v_locked) THEN p.is_textil          ELSE COALESCE(s.is_textil,          p.is_textil)          END,
    category_id        = CASE WHEN 'category_id'        = ANY(v_locked) THEN p.category_id        ELSE COALESCE(v_cat_id, v_existing_cat, p.category_id)     END,
    padronizacao_id    = p_id,
    updated_at         = now()
  WHERE p.id = v_pid;

  INSERT INTO public.product_physical (product_id, weight_g, height_cm, width_cm, length_cm, diameter_cm, circumference_cm, capacity_ml)
  VALUES (v_pid, NULLIF(s.weight_g,0), NULLIF(s.height_cm,0), NULLIF(s.width_cm,0), NULLIF(s.length_cm,0), NULLIF(s.diameter_cm,0), NULLIF(s.circumference_cm,0), NULLIF(s.capacity_ml,0))
  ON CONFLICT (product_id) DO UPDATE SET
    weight_g         = COALESCE(public.product_physical.weight_g,         EXCLUDED.weight_g),
    height_cm        = COALESCE(public.product_physical.height_cm,        EXCLUDED.height_cm),
    width_cm         = COALESCE(public.product_physical.width_cm,         EXCLUDED.width_cm),
    length_cm        = COALESCE(public.product_physical.length_cm,        EXCLUDED.length_cm),
    diameter_cm      = COALESCE(public.product_physical.diameter_cm,      EXCLUDED.diameter_cm),
    circumference_cm = COALESCE(public.product_physical.circumference_cm, EXCLUDED.circumference_cm),
    capacity_ml      = COALESCE(public.product_physical.capacity_ml,      EXCLUDED.capacity_ml),
    updated_at       = now();

  UPDATE public.produtos_padronizacao SET status = 'promoted', product_id = v_pid, updated_at = now()
  WHERE id = p_id;

  RETURN jsonb_build_object('success', true, 'created', v_is_new, 'product_id', v_pid);
END;
$function$;

-- 3) Pós-check fail-closed (mesma transação: falha → nada é aplicado)
DO $$
DECLARE
  v_left integer;
  v_fn   text;
BEGIN
  SELECT count(*) INTO v_left
  FROM public.products p
  JOIN public.produtos_padronizacao pp ON pp.product_id = p.id AND pp.status = 'promoted'
  WHERE p.padronizacao_id IS NULL;
  IF v_left <> 0 THEN
    RAISE EXCEPTION 'fix_products_padronizacao_backlink: % produtos promovidos ainda sem padronizacao_id', v_left;
  END IF;

  SELECT pg_get_functiondef('public.fn_promote_padronizacao(uuid)'::regprocedure) INTO v_fn;
  IF position('padronizacao_id    = p_id' IN v_fn) = 0
     OR position('category_id, padronizacao_id)' IN v_fn) = 0 THEN
    RAISE EXCEPTION 'fix_products_padronizacao_backlink: fn_promote_padronizacao não contém o back-link esperado';
  END IF;
END $$;
