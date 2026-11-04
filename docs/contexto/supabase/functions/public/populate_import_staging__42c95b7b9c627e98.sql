CREATE OR REPLACE FUNCTION public.populate_import_staging(p_filenames text[], p_source_zip character varying DEFAULT 'products_print_area_allcolors_market1_150px.zip'::character varying, p_batch_id character varying DEFAULT NULL::character varying)
 RETURNS TABLE(total_processado integer, total_pending integer, total_already_exists integer, total_no_product integer, total_no_color integer, total_skipped integer, total_location integer, total_area integer, total_component integer)
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
    v_filename TEXT;
    v_base TEXT;
    v_parts TEXT[];
    v_sku TEXT;
    v_color_code TEXT;
    v_component INTEGER;
    v_location INTEGER;
    v_view INTEGER;
    v_product_id UUID;
    v_color_id UUID;
    v_cf_id TEXT;
    v_status VARCHAR;
    v_image_type VARCHAR;
    v_image_type_id UUID;
    v_match TEXT[];
    -- Contadores
    v_count_processado INTEGER := 0;
    v_count_pending INTEGER := 0;
    v_count_exists INTEGER := 0;
    v_count_no_product INTEGER := 0;
    v_count_no_color INTEGER := 0;
    v_count_skipped INTEGER := 0;
    v_count_location INTEGER := 0;
    v_count_area INTEGER := 0;
    v_count_component INTEGER := 0;
    -- UUID do fornecedor SPOT
    v_spot_supplier_id UUID := 'bcfc0d02-44c6-48ae-8472-12b1a3f3d8e0';
    -- UUIDs dos image_types
    v_type_location UUID := '2ce4bc92-a110-4cca-a217-1a7a7f724ac0';
    v_type_area UUID := '2137f12c-12f0-4a76-adfb-5a3614d7a3dc';
    v_type_component UUID := '3303cd07-bab0-4018-9d91-954e12a0035a';
BEGIN
    FOREACH v_filename IN ARRAY p_filenames
    LOOP
        -- Ignorar se não é .png
        IF NOT v_filename ILIKE '%.png' THEN
            v_count_skipped := v_count_skipped + 1;
            CONTINUE;
        END IF;

        -- Remover extensão
        v_base := replace(v_filename, '.png', '');
        v_parts := string_to_array(v_base, '_');

        -- Reset variáveis
        v_sku := NULL;
        v_color_code := '';
        v_component := 1;
        v_location := 0;
        v_view := 1;
        v_product_id := NULL;
        v_color_id := NULL;
        v_image_type := 'area';
        v_image_type_id := v_type_area;

        -- ====================================================
        -- DETECTAR PADRÃO pelo conteúdo do filename
        -- ====================================================

        IF v_base ~ '_C[0-9]+_L[0-9]+$' THEN
            -- ================================================
            -- PADRÃO 1: LOCATION → SKU_COR_Cn_Ln.png
            -- Ex: 11103_103_C1_L1.png
            -- ================================================
            IF array_length(v_parts, 1) < 4 THEN
                v_count_skipped := v_count_skipped + 1;
                CONTINUE;
            END IF;

            v_sku := v_parts[1];
            v_color_code := v_parts[2];

            -- Extrair número do C e L via regex
            v_match := regexp_match(v_parts[3], '^C(\d+)$');
            IF v_match IS NULL THEN
                v_count_skipped := v_count_skipped + 1;
                CONTINUE;
            END IF;
            v_component := v_match[1]::INTEGER;

            v_match := regexp_match(v_parts[4], '^L(\d+)$');
            IF v_match IS NULL THEN
                v_count_skipped := v_count_skipped + 1;
                CONTINUE;
            END IF;
            v_location := v_match[1]::INTEGER;
            v_view := 1;

            v_image_type := 'location';
            v_image_type_id := v_type_location;
            v_count_location := v_count_location + 1;

        ELSIF v_base ~ '_C[0-9]+$' THEN
            -- ================================================
            -- PADRÃO 3: COMPONENT → SKU_COR_Cn.png
            -- Ex: 11103_103_C1.png
            -- ================================================
            IF array_length(v_parts, 1) < 3 THEN
                v_count_skipped := v_count_skipped + 1;
                CONTINUE;
            END IF;

            v_sku := v_parts[1];
            v_color_code := v_parts[2];

            v_match := regexp_match(v_parts[3], '^C(\d+)$');
            IF v_match IS NULL THEN
                v_count_skipped := v_count_skipped + 1;
                CONTINUE;
            END IF;
            v_component := v_match[1]::INTEGER;
            v_location := 0;
            v_view := 1;

            v_image_type := 'component';
            v_image_type_id := v_type_component;
            v_count_component := v_count_component + 1;

        ELSE
            -- ================================================
            -- PADRÃO 2: AREA → SKU_comp_loc_view.png
            -- Ex: 11103_1_1_1.png (SEM cor, tudo numérico)
            -- ================================================
            IF array_length(v_parts, 1) < 4 THEN
                v_count_skipped := v_count_skipped + 1;
                CONTINUE;
            END IF;

            -- Validar que partes 2,3,4 são numéricas
            IF v_parts[2] !~ '^\d+$' OR v_parts[3] !~ '^\d+$' OR v_parts[4] !~ '^\d+$' THEN
                v_count_skipped := v_count_skipped + 1;
                CONTINUE;
            END IF;

            v_sku := v_parts[1];
            v_color_code := '';  -- Area NÃO tem cor (genérico)
            v_component := v_parts[2]::INTEGER;
            v_location := v_parts[3]::INTEGER;
            v_view := v_parts[4]::INTEGER;

            v_image_type := 'area';
            v_image_type_id := v_type_area;
            v_count_area := v_count_area + 1;
        END IF;

        -- ====================================================
        -- GERAR cloudflare_image_id
        -- ====================================================
        v_cf_id := 'spot-pa-' || replace(v_filename, '.png', '');

        -- ====================================================
        -- VERIFICAÇÕES DE EXISTÊNCIA
        -- ====================================================

        -- 1. Já existe em product_images?
        IF EXISTS (
            SELECT 1 FROM product_images
            WHERE cloudflare_image_id = v_cf_id
        ) THEN
            v_status := 'already_exists';
            v_count_exists := v_count_exists + 1;

            -- Mesmo assim buscar product_id para registro
            SELECT id INTO v_product_id
            FROM products
            WHERE sku = v_sku AND supplier_id = v_spot_supplier_id
            LIMIT 1;
        ELSE
            -- 2. Buscar product_id
            SELECT id INTO v_product_id
            FROM products
            WHERE sku = v_sku AND supplier_id = v_spot_supplier_id
            LIMIT 1;

            IF v_product_id IS NULL THEN
                v_status := 'no_product';
                v_count_no_product := v_count_no_product + 1;
            ELSE
                -- 3. Buscar color_id (só se tem cor)
                IF v_color_code != '' THEN
                    SELECT pv.color_id INTO v_color_id
                    FROM product_variants pv
                    WHERE pv.product_id = v_product_id
                      AND pv.color_code = v_color_code
                    LIMIT 1;

                    IF v_color_id IS NULL THEN
                        v_status := 'no_color';
                        v_count_no_color := v_count_no_color + 1;
                    ELSE
                        v_status := 'pending';
                        v_count_pending := v_count_pending + 1;
                    END IF;
                ELSE
                    -- Area sem cor → pending direto
                    v_color_id := NULL;
                    v_status := 'pending';
                    v_count_pending := v_count_pending + 1;
                END IF;
            END IF;
        END IF;

        -- ====================================================
        -- INSERIR NA STAGING
        -- ====================================================
        INSERT INTO import_staging_images (
            filename,
            source_zip,
            parsed_sku,
            parsed_color_code,
            parsed_component,
            parsed_location,
            parsed_view,
            product_id,
            color_id,
            cloudflare_image_id,
            url_cdn,
            target_image_type_id,
            target_image_type,
            target_display_order,
            status,
            batch_id
        ) VALUES (
            v_filename,
            p_source_zip,
            v_sku,
            v_color_code,
            v_component,
            v_location,
            v_view,
            v_product_id,
            v_color_id,
            v_cf_id,
            'https://imagedelivery.net/vKMs9Ow8bA_enuhLXZ2HAw/' || v_cf_id || '/public',
            v_image_type_id,
            v_image_type,
            (v_component * 100) + (v_location * 10) + v_view,
            v_status,
            p_batch_id
        )
        ON CONFLICT (filename, source_zip) DO NOTHING;

        v_count_processado := v_count_processado + 1;
    END LOOP;

    RETURN QUERY SELECT
        v_count_processado,
        v_count_pending,
        v_count_exists,
        v_count_no_product,
        v_count_no_color,
        v_count_skipped,
        v_count_location,
        v_count_area,
        v_count_component;
END;
$function$
