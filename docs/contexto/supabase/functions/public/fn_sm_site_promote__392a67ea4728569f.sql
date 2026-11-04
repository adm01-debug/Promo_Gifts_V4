CREATE OR REPLACE FUNCTION public.fn_sm_site_promote(p_limit integer DEFAULT 50)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_sup        uuid := '841cd690-210a-422a-908c-7676828db272';
  rec          record;
  v_product_id uuid;
  v_n_url      int := 0;
  v_n_video    int := 0;
  v_n_spec     int := 0;
  v_n_prices   int := 0;
  v_n_master   int := 0;
  v_n_fotos    int := 0;
  v_n_total    int := 0;
  v_rows       int := 0;
  v_yt_id      text;
BEGIN
  FOR rec IN
    SELECT
      spr.id                    AS spr_id,
      spr.site_data             AS sd,
      spr.raw_data->>'codigo'   AS codigo,
      spr.product_id            AS fk_product_id,
      m.site_url                AS canonical_site_url
    FROM supplier_products_raw spr
    LEFT JOIN public.sm_site_url_map m
      ON  m.supplier_id = v_sup
      AND m.codigo      = spr.raw_data->>'codigo'
    WHERE spr.supplier_id    = v_sup
      AND spr.site_status    = 'processed'
      AND spr.site_data      IS NOT NULL
      -- Repromover se site_data mudou (hash diferente) ou nunca promoveu
      AND (spr.site_promoted_at IS NULL
           OR spr.site_promoted_at < spr.site_processed_at)
    ORDER BY spr.site_processed_at
    LIMIT p_limit
  LOOP
    -- ── Lookup product_id no Gold ──────────────────────────────────────────
    -- Path 1: FK direto (quando Bronze já tem product_id populado)
    v_product_id := rec.fk_product_id;

    -- Path 2: join por supplier_reference (fallback robusto)
    IF v_product_id IS NULL THEN
      SELECT p.id INTO v_product_id
      FROM products p
      WHERE p.supplier_id        = v_sup
        AND p.supplier_reference = rec.codigo
        AND COALESCE(p.is_deleted, false) = false
      LIMIT 1;
    END IF;

    -- Path 3: join por sku_promo (ex: Bronze tem codigo=AS-01900, Gold tem sku_promo=AS-01900)
    IF v_product_id IS NULL THEN
      SELECT p.id INTO v_product_id
      FROM products p
      WHERE p.supplier_id = v_sup
        AND p.sku_promo   = rec.codigo
        AND COALESCE(p.is_deleted, false) = false
      LIMIT 1;
    END IF;

    IF v_product_id IS NULL THEN CONTINUE; END IF;

    v_n_total := v_n_total + 1;

    -- ── A. supplier_product_url ────────────────────────────────────────────
    IF rec.canonical_site_url IS NOT NULL THEN
      UPDATE products
        SET supplier_product_url = rec.canonical_site_url,
            updated_at           = now()
      WHERE id = v_product_id
        AND COALESCE(supplier_product_url,'') <> rec.canonical_site_url;
      GET DIAGNOSTICS v_rows = ROW_COUNT;
      v_n_url := v_n_url + v_rows;
    END IF;

    -- ── B. Vídeo YouTube ──────────────────────────────────────────────────
    IF rec.sd->>'video_url' IS NOT NULL THEN
      v_yt_id := substring(rec.sd->>'video_url' FROM 'v=([A-Za-z0-9_-]+)');
      INSERT INTO product_properties (product_id, property_code, property_value, source, raw_value)
      VALUES (v_product_id, 'video_youtube_url', rec.sd->>'video_url', 'sm_site_scraping', v_yt_id)
      ON CONFLICT (product_id, property_code) DO UPDATE
        SET property_value = EXCLUDED.property_value,
            raw_value      = EXCLUDED.raw_value,
            source         = EXCLUDED.source
        WHERE product_properties.property_value IS DISTINCT FROM EXCLUDED.property_value
           OR product_properties.source = 'sm_site_scraping';
      GET DIAGNOSTICS v_rows = ROW_COUNT;
      v_n_video := v_n_video + v_rows;
    END IF;

    -- ── C. Spec técnica ───────────────────────────────────────────────────
    IF rec.sd->>'spec_tecnica_url' IS NOT NULL THEN
      INSERT INTO product_properties (product_id, property_code, property_value, source, raw_value)
      VALUES (v_product_id, 'spec_tecnica_url', rec.sd->>'spec_tecnica_url',
              'sm_site_scraping', rec.sd->>'spec_tecnica_url')
      ON CONFLICT (product_id, property_code) DO UPDATE
        SET property_value = EXCLUDED.property_value, source = EXCLUDED.source
        WHERE product_properties.property_value IS DISTINCT FROM EXCLUDED.property_value;
      GET DIAGNOSTICS v_rows = ROW_COUNT;
      v_n_spec := v_n_spec + v_rows;
    END IF;

    -- ── D. Fotos CDN extras (array → JSON em properties) ─────────────────
    IF rec.sd->'fotos_cdn' IS NOT NULL
       AND jsonb_array_length(rec.sd->'fotos_cdn') > 0 THEN
      INSERT INTO product_properties (product_id, property_code, property_value, source, raw_value)
      VALUES (v_product_id, 'fotos_cdn_sm',
              (rec.sd->'fotos_cdn')::text, 'sm_site_scraping',
              jsonb_array_length(rec.sd->'fotos_cdn')::text || ' fotos')
      ON CONFLICT (product_id, property_code) DO UPDATE
        SET property_value = EXCLUDED.property_value, source = EXCLUDED.source
        WHERE product_properties.property_value IS DISTINCT FROM EXCLUDED.property_value;
      GET DIAGNOSTICS v_rows = ROW_COUNT;
      v_n_fotos := v_n_fotos + v_rows;
    END IF;

    -- ── E. Price tiers (autenticado) ─────────────────────────────────────
    IF rec.sd->'price_tiers' IS NOT NULL
       AND jsonb_array_length(rec.sd->'price_tiers') > 0 THEN
      INSERT INTO product_properties (product_id, property_code, property_value, source, raw_value)
      VALUES (v_product_id, 'price_tiers_sm',
              (rec.sd->'price_tiers')::text, 'sm_site_scraping_auth',
              (rec.sd->'price_tiers')::text)
      ON CONFLICT (product_id, property_code) DO UPDATE
        SET property_value = EXCLUDED.property_value,
            raw_value      = EXCLUDED.raw_value,
            source         = EXCLUDED.source;
      GET DIAGNOSTICS v_rows = ROW_COUNT;
      v_n_prices := v_n_prices + v_rows;
    END IF;

    -- ── F. Caixa Master (autenticado) ─────────────────────────────────────
    IF rec.sd->'caixa_master' IS NOT NULL THEN
      INSERT INTO product_properties (product_id, property_code, property_value, source, raw_value)
      VALUES (v_product_id, 'caixa_master_sm',
              (rec.sd->'caixa_master')::text, 'sm_site_scraping',
              (rec.sd->'caixa_master')::text)
      ON CONFLICT (product_id, property_code) DO UPDATE
        SET property_value = EXCLUDED.property_value, raw_value = EXCLUDED.raw_value;
      GET DIAGNOSTICS v_rows = ROW_COUNT;
      v_n_master := v_n_master + v_rows;

      -- Colunas diretas em products (só se nulos)
      UPDATE products
        SET box_quantity  = COALESCE(box_quantity,
                              CASE WHEN rec.sd->'caixa_master'->>'qtd' IS NOT NULL
                                   THEN (rec.sd->'caixa_master'->>'qtd')::int END),
            box_weight_kg = COALESCE(box_weight_kg,
                              CASE WHEN rec.sd->'caixa_master'->>'peso_kg' IS NOT NULL
                                   THEN (rec.sd->'caixa_master'->>'peso_kg')::numeric END),
            updated_at    = now()
      WHERE id = v_product_id
        AND (box_quantity IS NULL OR box_weight_kg IS NULL);
    END IF;

    -- ── G. NCM / IPI ─────────────────────────────────────────────────────
    IF (rec.sd->>'ncm_site') IS NOT NULL OR (rec.sd->>'ipi_site') IS NOT NULL THEN
      UPDATE products
        SET ncm_code   = COALESCE(ncm_code, rec.sd->>'ncm_site'),
            ipi_rate   = COALESCE(ipi_rate,
                           CASE WHEN rec.sd->>'ipi_site' IS NOT NULL
                                THEN (rec.sd->>'ipi_site')::numeric END),
            updated_at = now()
      WHERE id = v_product_id
        AND (ncm_code IS NULL OR ipi_rate IS NULL);
    END IF;

    -- ── Marca como promovido ──────────────────────────────────────────────
    UPDATE supplier_products_raw
      SET site_promoted_at = now()
    WHERE id = rec.spr_id;

  END LOOP;

  RETURN jsonb_build_object(
    'produtos_processados', v_n_total,
    'urls',      v_n_url,
    'videos',    v_n_video,
    'specs',     v_n_spec,
    'fotos_cdn', v_n_fotos,
    'precos',    v_n_prices,
    'caixa_master', v_n_master,
    'ts', now()
  );
END;
$function$
