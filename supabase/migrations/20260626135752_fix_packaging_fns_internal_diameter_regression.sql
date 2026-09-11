-- ════════════════════════════════════════════════════════════════════
-- CORRECAO CRITICA: products.internal_diameter_cm foi removida (regressao),
-- mas 3 funcoes ainda a referenciavam -> quebradas em runtime.
-- fn_calculate_packaging_fit e fn_check_item_fits ja recriadas no dry-run validado.
-- Aqui aplico as 3 (fit, check, batch) tratando diameter como NULL/retangular.
-- fix_version=2026-06-26_diameter_regression
-- ════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.fn_calculate_packaging_fit(p_product_id uuid, p_packaging_id uuid, p_config_type text DEFAULT 'default'::text)
 RETURNS jsonb LANGUAGE plpgsql STABLE SET search_path TO 'public'
AS $function$
DECLARE
    v_product RECORD; v_packaging RECORD;
    v_gap_h DECIMAL; v_gap_w DECIMAL; v_gap_l DECIMAL; v_gap_d DECIMAL;
    v_gap_min DECIMAL; v_gap_avg DECIMAL; v_rating VARCHAR(20); v_prefix TEXT;
    v_min DECIMAL := 2; v_tight DECIMAL := 5; v_good DECIMAL := 15; v_max DECIMAL := 50;
    v_pkg_dims DECIMAL[]; v_pkg_long DECIMAL; v_pkg_short DECIMAL; v_pkg_mid DECIMAL;
    v_needs_padding BOOLEAN := false;
BEGIN
    v_prefix := lower(trim(COALESCE(p_config_type,'default')));
    IF v_prefix NOT IN ('fragile','precision','bottles') THEN v_prefix := ''; END IF;
    IF v_prefix <> '' THEN v_prefix := v_prefix || '_'; END IF;
    SELECT COALESCE((SELECT config_value::DECIMAL FROM packaging_compatibility_config WHERE config_key=v_prefix||'min_gap_mm'),(SELECT config_value::DECIMAL FROM packaging_compatibility_config WHERE config_key='min_gap_mm'),2) INTO v_min;
    SELECT COALESCE((SELECT config_value::DECIMAL FROM packaging_compatibility_config WHERE config_key=v_prefix||'tight_max_mm'),(SELECT config_value::DECIMAL FROM packaging_compatibility_config WHERE config_key='tight_gap_max_mm'),5) INTO v_tight;
    SELECT COALESCE((SELECT config_value::DECIMAL FROM packaging_compatibility_config WHERE config_key=v_prefix||'good_max_mm'),(SELECT config_value::DECIMAL FROM packaging_compatibility_config WHERE config_key='good_gap_max_mm'),15) INTO v_good;
    SELECT COALESCE((SELECT config_value::DECIMAL FROM packaging_compatibility_config WHERE config_key=v_prefix||'max_gap_mm'),(SELECT config_value::DECIMAL FROM packaging_compatibility_config WHERE config_key='max_gap_mm'),50) INTO v_max;
    SELECT height_cm, width_cm, length_cm, diameter_cm, shape_type INTO v_product FROM products WHERE id=p_product_id;
    IF v_product IS NULL THEN RETURN jsonb_build_object('error','Produto não encontrado: '||p_product_id,'compatible',false,'fit_rating','error','needs_padding',false); END IF;
    -- FIX: internal_diameter_cm NAO existe em products -> NULL.
    SELECT internal_height_cm, internal_width_cm, internal_length_cm, NULL::numeric AS internal_diameter_cm, product_type
      INTO v_packaging FROM products WHERE id=p_packaging_id;
    IF v_packaging IS NULL OR v_packaging.product_type <> 'packaging' THEN
        RETURN jsonb_build_object('error',CASE WHEN v_packaging IS NULL THEN 'Embalagem não encontrada: '||p_packaging_id ELSE 'Produto '||p_packaging_id||' não é do tipo packaging' END,'compatible',false,'fit_rating','error','needs_padding',false);
    END IF;
    IF v_product.shape_type = 'cylindrical' THEN
        IF v_packaging.internal_diameter_cm IS NOT NULL THEN
            v_gap_d := (v_packaging.internal_diameter_cm - COALESCE(v_product.diameter_cm,v_product.width_cm)) * 10;
            v_gap_h := (v_packaging.internal_height_cm - v_product.height_cm) * 10;
        ELSE
            v_pkg_dims := ARRAY[COALESCE(v_packaging.internal_height_cm,0),COALESCE(v_packaging.internal_width_cm,0),COALESCE(v_packaging.internal_length_cm,0)];
            v_pkg_long := GREATEST(v_pkg_dims[1],v_pkg_dims[2],v_pkg_dims[3]);
            v_pkg_short := LEAST(v_pkg_dims[1],v_pkg_dims[2],v_pkg_dims[3]);
            v_pkg_mid := v_pkg_dims[1]+v_pkg_dims[2]+v_pkg_dims[3]-v_pkg_long-v_pkg_short;
            v_gap_h := (v_pkg_long - v_product.height_cm) * 10;
            v_gap_d := (v_pkg_short - COALESCE(v_product.diameter_cm,v_product.width_cm)) * 10;
            IF v_pkg_mid < COALESCE(v_product.diameter_cm,v_product.width_cm) THEN
                v_gap_d := LEAST(v_gap_d,(v_pkg_mid-COALESCE(v_product.diameter_cm,v_product.width_cm))*10);
            END IF;
        END IF;
        v_gap_min := LEAST(COALESCE(v_gap_d,999),COALESCE(v_gap_h,999));
        v_gap_avg := (COALESCE(v_gap_d,0)+COALESCE(v_gap_h,0))/2.0;
        IF COALESCE(v_gap_h,0) > 200 THEN v_needs_padding := true; END IF;
    ELSE
        v_gap_h := (v_packaging.internal_height_cm - v_product.height_cm) * 10;
        v_gap_w := (v_packaging.internal_width_cm - v_product.width_cm) * 10;
        v_gap_l := (v_packaging.internal_length_cm - v_product.length_cm) * 10;
        v_gap_min := LEAST(COALESCE(v_gap_h,999),COALESCE(v_gap_w,999),COALESCE(v_gap_l,999));
        v_gap_avg := (COALESCE(v_gap_h,0)+COALESCE(v_gap_w,0)+COALESCE(v_gap_l,0))/3.0;
    END IF;
    IF    v_gap_min IS NULL OR v_gap_min >= 900 THEN v_rating := 'incompatible';
    ELSIF v_gap_min < 0 THEN v_rating := 'too_tight';
    ELSIF v_gap_min < v_min THEN v_rating := 'too_tight';
    ELSIF v_gap_min <= v_tight THEN v_rating := 'tight';
    ELSIF v_gap_min <= v_good THEN v_rating := 'good';
    ELSIF v_gap_min <= v_max THEN v_rating := 'loose';
    ELSE v_rating := 'too_large'; END IF;
    IF v_needs_padding AND v_rating IN ('tight','good') THEN v_rating := 'loose'; END IF;
    RETURN jsonb_build_object('compatible',v_rating IN ('tight','good','loose'),'fit_rating',v_rating,
        'config_type',COALESCE(NULLIF(p_config_type,'default'),'default'),
        'gap_height_mm',ROUND(COALESCE(v_gap_h,0)::numeric,2),'gap_width_mm',ROUND(COALESCE(v_gap_w,0)::numeric,2),
        'gap_length_mm',ROUND(COALESCE(v_gap_l,0)::numeric,2),'gap_diameter_mm',ROUND(COALESCE(v_gap_d,0)::numeric,2),
        'gap_min_mm',CASE WHEN v_gap_min < 900 THEN ROUND(v_gap_min::numeric,2) ELSE NULL END,
        'gap_avg_mm',ROUND(v_gap_avg::numeric,2),'shape',v_product.shape_type,'needs_padding',v_needs_padding,
        'limits_mm',jsonb_build_object('min',v_min,'tight',v_tight,'good',v_good,'max',v_max));
END;$function$;

CREATE OR REPLACE FUNCTION public.fn_check_item_fits(p_packaging_id uuid, p_product_id uuid, p_current_used_liters numeric DEFAULT 0)
 RETURNS TABLE(fits boolean, packaging_volume numeric, product_volume numeric, used_volume numeric, available_volume numeric, percentage_used numeric)
 LANGUAGE plpgsql SET search_path TO 'public' AS $function$
DECLARE v_pkg NUMERIC; v_prod NUMERIC; v_avail NUMERIC; v_has_dims BOOLEAN;
BEGIN
  SELECT ((COALESCE(p.internal_length_cm,0)*COALESCE(p.internal_width_cm,0)*COALESCE(p.internal_height_cm,0))/1000)::NUMERIC
  INTO v_pkg FROM products p WHERE p.id=p_packaging_id AND p.product_type='packaging';
  SELECT (CASE
      WHEN p.length_cm IS NOT NULL AND p.width_cm IS NOT NULL AND p.height_cm IS NOT NULL THEN (p.length_cm*p.width_cm*p.height_cm)/1000
      WHEN p.diameter_cm IS NOT NULL AND p.height_cm IS NOT NULL THEN (PI()*POWER(p.diameter_cm/2,2)*p.height_cm)/1000
      WHEN p.is_kit THEN (SELECT SUM(COALESCE(pkc.quantity,1)*CASE
            WHEN pkc.shape_type='cylindrical' AND pkc.diameter_mm IS NOT NULL AND pkc.height_mm IS NOT NULL THEN PI()*POWER(pkc.diameter_mm/20.0,2)*(pkc.height_mm/10.0)
            WHEN pkc.length_mm IS NOT NULL AND pkc.width_mm IS NOT NULL AND pkc.height_mm IS NOT NULL THEN (pkc.length_mm/10.0)*(pkc.width_mm/10.0)*(pkc.height_mm/10.0)
            WHEN pkc.shape_type='flat' AND pkc.length_mm IS NOT NULL AND pkc.width_mm IS NOT NULL THEN (pkc.length_mm/10.0)*(pkc.width_mm/10.0)*0.8
            ELSE 0 END)/1000 FROM product_kit_components pkc WHERE pkc.kit_product_id=p.id AND pkc.is_packaging=FALSE)
      ELSE NULL END)::NUMERIC,
    (p.length_cm IS NOT NULL OR p.diameter_cm IS NOT NULL OR p.is_kit)
  INTO v_prod, v_has_dims FROM products p WHERE p.id=p_product_id;
  v_avail := v_pkg - p_current_used_liters;
  RETURN QUERY SELECT CASE WHEN v_prod IS NULL OR NOT COALESCE(v_has_dims,FALSE) THEN NULL ELSE (v_prod <= v_avail) END,
    ROUND(v_pkg,2), ROUND(v_prod,4), p_current_used_liters, ROUND(v_avail,2), ROUND((p_current_used_liters/NULLIF(v_pkg,0))*100,1);
END;$function$;

-- Batch: remover referencia a internal_diameter_cm (nao usada no calculo cilindrico)
CREATE OR REPLACE FUNCTION public.fn_auto_discover_all_compatible_packagings(p_min_fit_rating text DEFAULT 'good'::text, p_config_type text DEFAULT 'default'::text, p_only_missing boolean DEFAULT true)
 RETURNS jsonb LANGUAGE plpgsql SET search_path TO 'public'
AS $function$
DECLARE
    v_prefix TEXT; v_min DECIMAL; v_tight DECIMAL; v_good DECIMAL; v_max DECIMAL;
    v_inserted INT := 0; v_ranked INT := 0;
BEGIN
    v_prefix := lower(trim(COALESCE(p_config_type,'default')));
    IF v_prefix NOT IN ('fragile','precision','bottles') THEN v_prefix := ''; END IF;
    IF v_prefix <> '' THEN v_prefix := v_prefix || '_'; END IF;
    SELECT COALESCE((SELECT config_value::DECIMAL FROM packaging_compatibility_config WHERE config_key=v_prefix||'min_gap_mm'),(SELECT config_value::DECIMAL FROM packaging_compatibility_config WHERE config_key='min_gap_mm'),2) INTO v_min;
    SELECT COALESCE((SELECT config_value::DECIMAL FROM packaging_compatibility_config WHERE config_key=v_prefix||'tight_max_mm'),(SELECT config_value::DECIMAL FROM packaging_compatibility_config WHERE config_key='tight_gap_max_mm'),5) INTO v_tight;
    SELECT COALESCE((SELECT config_value::DECIMAL FROM packaging_compatibility_config WHERE config_key=v_prefix||'good_max_mm'),(SELECT config_value::DECIMAL FROM packaging_compatibility_config WHERE config_key='good_gap_max_mm'),15) INTO v_good;
    SELECT COALESCE((SELECT config_value::DECIMAL FROM packaging_compatibility_config WHERE config_key=v_prefix||'max_gap_mm'),(SELECT config_value::DECIMAL FROM packaging_compatibility_config WHERE config_key='max_gap_mm'),50) INTO v_max;

    WITH prods AS (
        SELECT p.id, p.height_cm, p.width_cm, p.length_cm, p.diameter_cm, p.shape_type, p.supplier_id
        FROM products p WHERE p.is_active=true AND p.product_type IN ('product','kit')
          AND p.height_cm IS NOT NULL AND p.width_cm IS NOT NULL
          AND (NOT p_only_missing OR NOT EXISTS (SELECT 1 FROM product_packaging_compatibility x WHERE x.product_id=p.id AND x.active=true))
    ),
    pkgs AS (
        SELECT pk.id, pk.internal_height_cm, pk.internal_width_cm, pk.internal_length_cm, pk.supplier_id
        FROM products pk WHERE pk.product_type='packaging' AND pk.is_active=true AND pk.internal_height_cm IS NOT NULL
    ),
    pairs AS (
        SELECT pr.id AS product_id, pk.id AS packaging_id, pr.supplier_id AS prod_supplier, pk.supplier_id AS pkg_supplier, pr.shape_type,
            CASE WHEN pr.shape_type='cylindrical' THEN (GREATEST(pk.internal_height_cm,pk.internal_width_cm,pk.internal_length_cm)-pr.height_cm)*10
                 ELSE (pk.internal_height_cm-pr.height_cm)*10 END AS gap_h_mm,
            CASE WHEN pr.shape_type='cylindrical' THEN NULL ELSE (pk.internal_width_cm-pr.width_cm)*10 END AS gap_w_mm,
            CASE WHEN pr.shape_type='cylindrical' THEN NULL ELSE (pk.internal_length_cm-pr.length_cm)*10 END AS gap_l_mm,
            CASE WHEN pr.shape_type='cylindrical' THEN (LEAST(pk.internal_height_cm,pk.internal_width_cm,pk.internal_length_cm)-COALESCE(pr.diameter_cm,pr.width_cm))*10 ELSE NULL END AS gap_d_mm
        FROM prods pr CROSS JOIN pkgs pk
    ),
    classified AS (
        SELECT product_id, packaging_id, prod_supplier, pkg_supplier, shape_type, gap_h_mm, gap_w_mm, gap_l_mm, gap_d_mm,
            CASE WHEN shape_type='cylindrical' THEN LEAST(COALESCE(gap_h_mm,999),COALESCE(gap_d_mm,999)) ELSE LEAST(COALESCE(gap_h_mm,999),COALESCE(gap_w_mm,999),COALESCE(gap_l_mm,999)) END AS gap_min,
            CASE WHEN shape_type='cylindrical' THEN (COALESCE(gap_h_mm,0)+COALESCE(gap_d_mm,0))/2.0 ELSE (COALESCE(gap_h_mm,0)+COALESCE(gap_w_mm,0)+COALESCE(gap_l_mm,0))/3.0 END AS gap_avg
        FROM pairs
    ),
    rated AS (
        SELECT *, CASE WHEN gap_min IS NULL OR gap_min>=900 THEN 'incompatible' WHEN gap_min<0 THEN 'too_tight'
            WHEN gap_min<v_min THEN 'too_tight' WHEN gap_min<=v_tight THEN 'tight' WHEN gap_min<=v_good THEN 'good'
            WHEN gap_min<=v_max THEN 'loose' ELSE 'too_large' END AS fit_rating FROM classified
    ),
    compatibles AS (
        SELECT * FROM rated WHERE fit_rating = ANY(CASE p_min_fit_rating WHEN 'tight' THEN ARRAY['tight'] WHEN 'good' THEN ARRAY['tight','good'] WHEN 'loose' THEN ARRAY['tight','good','loose'] ELSE ARRAY['tight','good','loose'] END)
    ),
    ins AS (
        INSERT INTO product_packaging_compatibility (product_id, packaging_id, compatibility_source, fit_rating, fit_gap_height_mm, fit_gap_width_mm, fit_gap_length_mm, fit_gap_diameter_mm, fit_gap_min_mm, fit_gap_avg_mm, is_same_supplier, auto_discovered_at, config_type_used, active)
        SELECT product_id, packaging_id, 'dimension_calculated', fit_rating, ROUND(COALESCE(gap_h_mm,0)::numeric,2), ROUND(COALESCE(gap_w_mm,0)::numeric,2), ROUND(COALESCE(gap_l_mm,0)::numeric,2), ROUND(COALESCE(gap_d_mm,0)::numeric,2), ROUND(gap_min::numeric,2), ROUND(gap_avg::numeric,2), (prod_supplier=pkg_supplier), now(), COALESCE(NULLIF(p_config_type,'default'),'default'), true
        FROM compatibles ON CONFLICT (product_id, packaging_id) DO NOTHING RETURNING 1
    )
    SELECT COUNT(*) INTO v_inserted FROM ins;

    IF v_inserted > 0 THEN
        WITH ranking AS (
            SELECT id, ROW_NUMBER() OVER (PARTITION BY product_id ORDER BY
                CASE compatibility_source WHEN 'supplier_indicated' THEN 1 WHEN 'dimension_matching' THEN 2 WHEN 'dimension_calculated' THEN 3 ELSE 4 END,
                CASE fit_rating WHEN 'tight' THEN 1 WHEN 'good' THEN 2 WHEN 'loose' THEN 3 ELSE 4 END, COALESCE(fit_gap_min_mm,99999) ASC) rn
            FROM product_packaging_compatibility WHERE active=true AND fit_rating IN ('tight','good','loose')
              AND product_id IN (SELECT product_id FROM product_packaging_compatibility WHERE active=true GROUP BY product_id HAVING BOOL_OR(is_recommended)=false)
        )
        UPDATE product_packaging_compatibility ppc SET is_recommended=true, updated_at=now() FROM ranking r WHERE ppc.id=r.id AND r.rn=1;
        GET DIAGNOSTICS v_ranked = ROW_COUNT;
    END IF;

    RETURN jsonb_build_object('success',true,'inserted',v_inserted,'ranked',v_ranked,'config_type',p_config_type,'min_fit_rating',p_min_fit_rating,'only_missing',p_only_missing,'limits_mm',jsonb_build_object('min',v_min,'tight',v_tight,'good',v_good,'max',v_max));
END;$function$;

NOTIFY pgrst, 'reload schema';;
