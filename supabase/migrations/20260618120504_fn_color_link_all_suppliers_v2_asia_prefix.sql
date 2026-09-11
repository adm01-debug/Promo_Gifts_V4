
CREATE OR REPLACE FUNCTION public.fn_color_link_all_suppliers(
  p_dry_run boolean DEFAULT true
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_xbz_mono    int := 0;
  v_spot_sm_mono int := 0;
  v_asia_varcor  int := 0;
  v_asia_prefix  int := 0;
  v_xbz_cross    int := 0;
  v_t04          int := 0;
BEGIN

  -- 1. XBZ Mono-cor
  IF NOT p_dry_run THEN
    WITH m AS (
      SELECT DISTINCT ON (pi.id)
        pi.id iid, pv.id vid, pv.color_id cid
      FROM product_images pi
      JOIN LATERAL (
        SELECT pv2.id, pv2.color_id
        FROM product_variants pv2
        WHERE pv2.product_id=pi.product_id AND pv2.is_active=true AND pv2.color_id IS NOT NULL
        ORDER BY pv2.id LIMIT 1
      ) pv ON true
      WHERE pi.supplier_code='XBZ' AND pi.is_active=true
        AND pi.color_id IS NULL AND pi.variant_id IS NULL
        AND (SELECT COUNT(DISTINCT pv3.color_id) FROM product_variants pv3
             WHERE pv3.product_id=pi.product_id AND pv3.is_active=true AND pv3.color_id IS NOT NULL)=1
      ORDER BY pi.id
    )
    UPDATE product_images SET color_id=m.cid, variant_id=m.vid, updated_at=NOW()
    FROM m WHERE id=m.iid;
    GET DIAGNOSTICS v_xbz_mono = ROW_COUNT;
  ELSE
    SELECT COUNT(DISTINCT pi.id) INTO v_xbz_mono
    FROM product_images pi
    WHERE pi.supplier_code='XBZ' AND pi.is_active=true
      AND pi.color_id IS NULL AND pi.variant_id IS NULL
      AND (SELECT COUNT(DISTINCT pv3.color_id) FROM product_variants pv3
           WHERE pv3.product_id=pi.product_id AND pv3.is_active=true AND pv3.color_id IS NOT NULL)=1;
  END IF;

  -- 2. SPOT+SOMARCAS Mono-cor
  IF NOT p_dry_run THEN
    WITH m AS (
      SELECT DISTINCT ON (pi.id)
        pi.id iid, pv.id vid, pv.color_id cid
      FROM product_images pi
      JOIN LATERAL (
        SELECT pv2.id, pv2.color_id
        FROM product_variants pv2
        WHERE pv2.product_id=pi.product_id AND pv2.is_active=true AND pv2.color_id IS NOT NULL
        ORDER BY pv2.id LIMIT 1
      ) pv ON true
      WHERE pi.supplier_code IN ('SPOT','SOMARCAS') AND pi.is_active=true
        AND pi.color_id IS NULL AND pi.variant_id IS NULL
        AND (SELECT COUNT(DISTINCT pv3.color_id) FROM product_variants pv3
             WHERE pv3.product_id=pi.product_id AND pv3.is_active=true AND pv3.color_id IS NOT NULL)=1
      ORDER BY pi.id
    )
    UPDATE product_images SET color_id=m.cid, variant_id=m.vid, updated_at=NOW()
    FROM m WHERE id=m.iid;
    GET DIAGNOSTICS v_spot_sm_mono = ROW_COUNT;
  ELSE
    SELECT COUNT(DISTINCT pi.id) INTO v_spot_sm_mono
    FROM product_images pi
    WHERE pi.supplier_code IN ('SPOT','SOMARCAS') AND pi.is_active=true
      AND pi.color_id IS NULL AND pi.variant_id IS NULL
      AND (SELECT COUNT(DISTINCT pv3.color_id) FROM product_variants pv3
           WHERE pv3.product_id=pi.product_id AND pv3.is_active=true AND pv3.color_id IS NOT NULL)=1;
  END IF;

  -- 3. ASIA via var_cor_nome (raw_data)
  IF NOT p_dry_run THEN
    WITH af AS (
      SELECT DISTINCT ON (pi.id)
        pi.id iid, pv.id vid, pv.color_id cid
      FROM supplier_products_raw spr
      JOIN product_variants pv ON pv.product_id=spr.product_id
        AND pv.is_active=true AND pv.color_id IS NOT NULL
        AND (UPPER(TRIM(spr.raw_data->>'var_cor_nome'))=UPPER(TRIM(pv.color_name))
          OR UPPER(TRIM(spr.raw_data->>'var_cor_nome'))=UPPER(TRIM(
             (SELECT cv.name FROM color_variations cv WHERE cv.id=pv.color_id LIMIT 1))))
        AND NOT EXISTS (SELECT 1 FROM product_images pi2
                        WHERE pi2.product_id=pv.product_id AND pi2.color_id=pv.color_id AND pi2.is_active=true)
      JOIN product_images pi ON pi.product_id=spr.product_id
        AND REGEXP_REPLACE(pi.url_original,'.*/(.+)$','\1')=REGEXP_REPLACE(spr.raw_data->>'imagem','.*/(.+)$','\1')
        AND pi.is_active=true AND pi.color_id IS NULL
      WHERE spr.supplier_id='d2734e23-d633-4819-bb15-e51aa44e2118'::uuid
        AND spr.raw_data->>'var_cor_nome' IS NOT NULL AND spr.raw_data->>'imagem' IS NOT NULL
      ORDER BY pi.id, pv.color_id
    ),
    unamb AS (
      SELECT iid, vid, cid FROM af
      WHERE iid IN (SELECT iid FROM af GROUP BY iid HAVING COUNT(DISTINCT cid)=1)
    )
    UPDATE product_images SET color_id=u.cid, variant_id=u.vid, updated_at=NOW()
    FROM unamb u WHERE id=u.iid;
    GET DIAGNOSTICS v_asia_varcor = ROW_COUNT;
  ELSE
    SELECT COUNT(DISTINCT pi.id) INTO v_asia_varcor
    FROM product_images pi
    JOIN supplier_products_raw spr ON spr.product_id=pi.product_id
    JOIN product_variants pv ON pv.product_id=spr.product_id
      AND pv.is_active=true AND pv.color_id IS NOT NULL
      AND (UPPER(TRIM(spr.raw_data->>'var_cor_nome'))=UPPER(TRIM(pv.color_name))
        OR UPPER(TRIM(spr.raw_data->>'var_cor_nome'))=UPPER(TRIM(
           (SELECT cv.name FROM color_variations cv WHERE cv.id=pv.color_id LIMIT 1))))
      AND NOT EXISTS (SELECT 1 FROM product_images pi2
                      WHERE pi2.product_id=pv.product_id AND pi2.color_id=pv.color_id AND pi2.is_active=true)
    WHERE spr.supplier_id='d2734e23-d633-4819-bb15-e51aa44e2118'::uuid
      AND spr.raw_data->>'var_cor_nome' IS NOT NULL AND spr.raw_data->>'imagem' IS NOT NULL
      AND REGEXP_REPLACE(pi.url_original,'.*/(.+)$','\1')=REGEXP_REPLACE(spr.raw_data->>'imagem','.*/(.+)$','\1')
      AND pi.is_active=true AND pi.color_id IS NULL;
  END IF;

  -- 4. ASIA via prefixo de cor no filename (VD-PERSONALIZACAO, PT-CANETA...)
  IF NOT p_dry_run THEN
    WITH af AS (
      SELECT DISTINCT ON (pi.id)
        pi.id iid, pv.id vid, pv.color_id cid
      FROM product_images pi
      JOIN product_variants pv ON pv.product_id=pi.product_id
        AND pv.is_active=true AND pv.color_id IS NOT NULL
      WHERE pi.supplier_code='ASIA' AND pi.is_active=true
        AND pi.color_id IS NULL AND pi.variant_id IS NULL
        AND (
          UPPER(REGEXP_REPLACE(pi.url_original,'^.*[/-]([A-Z]{2,3})[-_][A-Z].*\.(?:jpg|png|jpeg)$','\1'))
            = UPPER(TRIM(pv.color_code))
          OR UPPER(REGEXP_REPLACE(pi.url_original,'^.+[-_]([A-Z]{2,4})[-_]?\d*\.(?:jpg|png|jpeg)$','\1'))
            = UPPER(TRIM(pv.color_code))
          OR pi.url_original ILIKE '%-' || REPLACE(UPPER(pv.color_name),' ','-') || '-%'
          OR pi.url_original ILIKE '%-' || REPLACE(UPPER(pv.color_name),' ','-') || '.'
          OR pi.url_original ILIKE '%-' || REPLACE(UPPER(pv.color_name),' ','-') || '_'
        )
        AND NOT EXISTS (SELECT 1 FROM product_images pi2
                        WHERE pi2.product_id=pv.product_id AND pi2.color_id=pv.color_id AND pi2.is_active=true)
      ORDER BY pi.id, pv.color_id
    ),
    unamb AS (
      SELECT iid, vid, cid FROM af
      WHERE iid IN (SELECT iid FROM af GROUP BY iid HAVING COUNT(DISTINCT cid)=1)
    )
    UPDATE product_images SET color_id=u.cid, variant_id=u.vid, updated_at=NOW()
    FROM unamb u WHERE id=u.iid;
    GET DIAGNOSTICS v_asia_prefix = ROW_COUNT;
  ELSE
    SELECT COUNT(DISTINCT pi.id) INTO v_asia_prefix
    FROM product_images pi
    JOIN product_variants pv ON pv.product_id=pi.product_id
      AND pv.is_active=true AND pv.color_id IS NOT NULL
    WHERE pi.supplier_code='ASIA' AND pi.is_active=true
      AND pi.color_id IS NULL AND pi.variant_id IS NULL
      AND (
        UPPER(REGEXP_REPLACE(pi.url_original,'^.*[/-]([A-Z]{2,3})[-_][A-Z].*\.(?:jpg|png|jpeg)$','\1'))
          = UPPER(TRIM(pv.color_code))
        OR UPPER(REGEXP_REPLACE(pi.url_original,'^.+[-_]([A-Z]{2,4})[-_]?\d*\.(?:jpg|png|jpeg)$','\1'))
          = UPPER(TRIM(pv.color_code))
        OR pi.url_original ILIKE '%-' || REPLACE(UPPER(pv.color_name),' ','-') || '-%'
        OR pi.url_original ILIKE '%-' || REPLACE(UPPER(pv.color_name),' ','-') || '.'
        OR pi.url_original ILIKE '%-' || REPLACE(UPPER(pv.color_name),' ','-') || '_'
      )
      AND NOT EXISTS (SELECT 1 FROM product_images pi2
                      WHERE pi2.product_id=pv.product_id AND pi2.color_id=pv.color_id AND pi2.is_active=true);
  END IF;

  -- 5. XBZ cross-product color fix (mono-cor com cor errada)
  IF NOT p_dry_run THEN
    WITH fix AS (
      SELECT DISTINCT ON (pi.id)
        pi.id iid, pv.color_id cid, pv.id vid
      FROM product_images pi
      JOIN product_variants pv ON pv.product_id=pi.product_id
        AND pv.is_active=true AND pv.color_id IS NOT NULL
      WHERE pi.is_active=true AND pi.color_id IS NOT NULL AND pi.color_id != pv.color_id
        AND (SELECT COUNT(DISTINCT pv2.color_id) FROM product_variants pv2
             WHERE pv2.product_id=pi.product_id AND pv2.is_active=true AND pv2.color_id IS NOT NULL)=1
        AND NOT EXISTS (SELECT 1 FROM product_images pi3
                        WHERE pi3.product_id=pi.product_id AND pi3.color_id=pv.color_id AND pi3.is_active=true)
        AND NOT EXISTS (SELECT 1 FROM product_variants pv4
                        WHERE pv4.product_id=pi.product_id AND pv4.color_id=pi.color_id AND pv4.is_active=true)
        AND EXISTS (SELECT 1 FROM product_images pi5
                    WHERE pi5.product_id=pi.product_id AND pi5.supplier_code='XBZ' AND pi5.is_active=true)
      ORDER BY pi.id
    )
    UPDATE product_images SET color_id=f.cid, variant_id=f.vid, updated_at=NOW()
    FROM fix f WHERE id=f.iid;
    GET DIAGNOSTICS v_xbz_cross = ROW_COUNT;
  ELSE
    SELECT COUNT(DISTINCT pi.id) INTO v_xbz_cross
    FROM product_images pi
    JOIN product_variants pv ON pv.product_id=pi.product_id AND pv.is_active=true AND pv.color_id IS NOT NULL
    WHERE pi.is_active=true AND pi.color_id IS NOT NULL AND pi.color_id != pv.color_id
      AND (SELECT COUNT(DISTINCT pv2.color_id) FROM product_variants pv2
           WHERE pv2.product_id=pi.product_id AND pv2.is_active=true AND pv2.color_id IS NOT NULL)=1
      AND NOT EXISTS (SELECT 1 FROM product_images pi3
                      WHERE pi3.product_id=pi.product_id AND pi3.color_id=pv.color_id AND pi3.is_active=true)
      AND NOT EXISTS (SELECT 1 FROM product_variants pv4
                      WHERE pv4.product_id=pi.product_id AND pv4.color_id=pi.color_id AND pv4.is_active=true)
      AND EXISTS (SELECT 1 FROM product_images pi5
                  WHERE pi5.product_id=pi.product_id AND pi5.supplier_code='XBZ' AND pi5.is_active=true);
  END IF;

  -- 6. T04 fix: color_id ← variant.color_id quando divergem (nuance vs canonical)
  IF NOT p_dry_run THEN
    WITH div AS (
      SELECT pi.id, pv.color_id cid
      FROM product_images pi
      JOIN product_variants pv ON pv.id=pi.variant_id
      WHERE pi.is_active=true AND pi.color_id IS DISTINCT FROM pv.color_id
        AND pi.variant_id IS NOT NULL AND pv.color_id IS NOT NULL
    )
    UPDATE product_images SET color_id=d.cid, updated_at=NOW()
    FROM div d WHERE product_images.id=d.id;
    GET DIAGNOSTICS v_t04 = ROW_COUNT;
  ELSE
    SELECT COUNT(*) INTO v_t04
    FROM product_images pi JOIN product_variants pv ON pv.id=pi.variant_id
    WHERE pi.is_active=true AND pi.color_id IS DISTINCT FROM pv.color_id
      AND pi.variant_id IS NOT NULL AND pv.color_id IS NOT NULL;
  END IF;

  RETURN jsonb_build_object(
    'dry_run', p_dry_run,
    'xbz_mono', v_xbz_mono,
    'spot_sm_mono', v_spot_sm_mono,
    'asia_varcor', v_asia_varcor,
    'asia_prefix', v_asia_prefix,
    'xbz_cross', v_xbz_cross,
    't04_fix', v_t04,
    'total', v_xbz_mono+v_spot_sm_mono+v_asia_varcor+v_asia_prefix+v_xbz_cross+v_t04,
    'run_at', NOW()
  );
END;
$$;
;
