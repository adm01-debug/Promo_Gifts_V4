-- ============================================================
-- BUGFIX CRÍTICO: MAX(uuid) não existe em PostgreSQL.
-- Solução: cast id→text para MAX, depois cast de volta →uuid.
-- fix_version: fix_uuid_max_bug_20260627
-- ============================================================
CREATE OR REPLACE FUNCTION public.fn_auto_classify_product_image()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
-- ============================================================
-- fix_version: anti_uuid_hardcode_20260627 / fix_uuid_max_bug_20260627
-- ANTI-REGRESSÃO LOVABLE: UUIDs resolvidos dinamicamente via code.
-- MAX(id::text)::uuid — UUID não tem função MAX nativa; cast via text.
-- ============================================================
DECLARE
    v_filename TEXT;
    v_image_type TEXT;
    v_image_type_id UUID;
    v_is_primary BOOLEAN := FALSE;
    v_display_order INTEGER;
    v_existing_primary_count INTEGER;
    v_color_id UUID;
    v_variant_id UUID;
    v_n_cores INTEGER;
    v_id_set       UUID;
    v_id_logo      UUID;
    v_id_box       UUID;
    v_id_pouch     UUID;
    v_id_bag       UUID;
    v_id_ambient   UUID;
    v_id_detail    UUID;
    v_id_gallery   UUID;
    v_id_main      UUID;
    v_id_other     UUID;
BEGIN
    -- Resolver UUIDs por code — MAX(id::text)::uuid (PostgreSQL não tem MAX(uuid) nativo)
    SELECT
      MAX(CASE WHEN code='set'     THEN id::text END)::uuid,
      MAX(CASE WHEN code='logo'    THEN id::text END)::uuid,
      MAX(CASE WHEN code='box'     THEN id::text END)::uuid,
      MAX(CASE WHEN code='pouch'   THEN id::text END)::uuid,
      MAX(CASE WHEN code='bag'     THEN id::text END)::uuid,
      MAX(CASE WHEN code='ambient' THEN id::text END)::uuid,
      MAX(CASE WHEN code='detail'  THEN id::text END)::uuid,
      MAX(CASE WHEN code='gallery' THEN id::text END)::uuid,
      MAX(CASE WHEN code='main'    THEN id::text END)::uuid,
      MAX(CASE WHEN code='other'   THEN id::text END)::uuid
    INTO
      v_id_set, v_id_logo, v_id_box, v_id_pouch, v_id_bag,
      v_id_ambient, v_id_detail, v_id_gallery, v_id_main, v_id_other
    FROM image_types;

    IF v_id_gallery IS NULL OR v_id_main IS NULL THEN
      RAISE EXCEPTION 'fn_auto_classify: image_types incompleta — tipos essenciais (gallery, main) ausentes. fix_version:anti_uuid_hardcode_20260627';
    END IF;

    IF NEW.image_type IS NOT NULL 
       AND NEW.image_type NOT IN ('other', '')
       AND NEW.image_type_id IS NULL THEN
        SELECT id INTO NEW.image_type_id 
        FROM image_types WHERE code = NEW.image_type LIMIT 1;
    END IF;

    v_filename := LOWER(COALESCE(
        SUBSTRING(NEW.url_original FROM '[^/]+$'),
        SUBSTRING(NEW.url_cdn FROM '[^/]+$'),
        ''
    ));

    IF v_filename ~ '[-_]set[._-]' OR v_filename ~ '[-_]set$' THEN
        v_image_type := 'set'; v_image_type_id := v_id_set;
    ELSIF v_filename ~ '[-_]c\.' THEN
        v_image_type := 'logo'; v_image_type_id := v_id_logo;
    ELSIF v_filename ~ '[-_]box[._-]' OR v_filename ~ '[-_]box$' THEN
        v_image_type := 'box'; v_image_type_id := v_id_box;
    ELSIF v_filename ~ '[-_]pouch[._-]' OR v_filename ~ '[-_]estojo[._-]' OR v_filename ~ '[-_]pouch$' THEN
        v_image_type := 'pouch'; v_image_type_id := v_id_pouch;
    ELSIF v_filename ~ '[-_]bag[._-]' OR v_filename ~ '[-_]sacola[._-]' OR v_filename ~ '[-_]bag$' THEN
        v_image_type := 'bag'; v_image_type_id := v_id_bag;
    ELSIF v_filename ~ '[-_]amb[._-]' OR v_filename ~ '[-_]ambiente[._-]' OR v_filename ~ '[-_]lifestyle[._-]'
       OR v_filename ~ '[-_]amb$' THEN
        v_image_type := 'ambient'; v_image_type_id := v_id_ambient;
    ELSIF v_filename ~ '[-_]det[._-]' OR v_filename ~ '[-_]detalhe[._-]' OR v_filename ~ '[-_]detail[._-]'
       OR v_filename ~ '[-_]det$' THEN
        v_image_type := 'detail'; v_image_type_id := v_id_detail;
    ELSIF v_filename ~ '[-_][de]\.' THEN
        v_image_type := 'gallery'; v_image_type_id := v_id_gallery;
    ELSIF v_filename ~ '_\d{3}\.' THEN
        SELECT COUNT(*) INTO v_existing_primary_count FROM product_images 
        WHERE product_id = NEW.product_id AND is_primary = TRUE AND is_active = TRUE;
        IF v_existing_primary_count = 0 THEN
            v_image_type := 'main'; v_image_type_id := v_id_main; v_is_primary := TRUE;
        ELSE
            v_image_type := 'gallery'; v_image_type_id := v_id_gallery;
        END IF;
    ELSIF v_filename ~ '_[a-z]\.' AND v_filename !~ '[-_]c\.' THEN
        v_image_type := 'gallery'; v_image_type_id := v_id_gallery;
    ELSIF NEW.cloudflare_image_id ~ '-gal-\d+$' OR NEW.cloudflare_image_id ~ '-d\d+$' THEN
        v_image_type := 'gallery'; v_image_type_id := v_id_gallery;
    ELSIF NEW.cloudflare_image_id ~ '-main$' THEN
        SELECT COUNT(*) INTO v_existing_primary_count FROM product_images 
        WHERE product_id = NEW.product_id AND is_primary = TRUE AND is_active = TRUE;
        IF v_existing_primary_count = 0 THEN
            v_image_type := 'main'; v_image_type_id := v_id_main; v_is_primary := TRUE;
        ELSE
            v_image_type := 'gallery'; v_image_type_id := v_id_gallery;
        END IF;
    ELSIF NEW.cloudflare_image_id ~ '-set$' OR NEW.cloudflare_image_id ~ '_set$' THEN
        v_image_type := 'set'; v_image_type_id := v_id_set;
    ELSIF NEW.cloudflare_image_id ~ '-amb$' OR NEW.cloudflare_image_id ~ '_amb$' THEN
        v_image_type := 'ambient'; v_image_type_id := v_id_ambient;
    ELSIF NEW.cloudflare_image_id ~ '-det$' OR NEW.cloudflare_image_id ~ '_det$' THEN
        v_image_type := 'detail'; v_image_type_id := v_id_detail;
    ELSIF NEW.cloudflare_image_id ~ '-logo$' OR NEW.cloudflare_image_id ~ '-logo-[a-z]' OR NEW.cloudflare_image_id ~ '_logo$' THEN
        v_image_type := 'logo'; v_image_type_id := v_id_logo;
    ELSIF NEW.cloudflare_image_id ~ '-box$' OR NEW.cloudflare_image_id ~ '_box$' THEN
        v_image_type := 'box'; v_image_type_id := v_id_box;
    ELSIF NEW.image_type IS NOT NULL AND NEW.image_type NOT IN ('other', '') THEN
        v_image_type := NEW.image_type;
        v_image_type_id := COALESCE(
            NEW.image_type_id,
            (SELECT id FROM image_types WHERE code = NEW.image_type LIMIT 1)
        );
    ELSE
        v_image_type := 'other'; v_image_type_id := v_id_other;
    END IF;

    IF NOT v_is_primary THEN
        SELECT COUNT(*) INTO v_existing_primary_count FROM product_images 
        WHERE product_id = NEW.product_id AND is_primary = TRUE AND is_active = TRUE;
        IF v_existing_primary_count = 0 AND v_image_type = 'main' THEN
            v_is_primary := TRUE;
        END IF;
    END IF;

    IF NEW.display_order IS NULL OR NEW.display_order = 0 THEN
        SELECT COALESCE(MAX(display_order), 0) + 1 INTO v_display_order
        FROM product_images WHERE product_id = NEW.product_id AND is_active = TRUE;
    ELSE
        v_display_order := NEW.display_order;
    END IF;

    NEW.image_type    := v_image_type;
    NEW.image_type_id := v_image_type_id;
    NEW.is_primary    := v_is_primary;
    NEW.display_order := v_display_order;

    IF v_is_primary THEN NEW.is_og_image := TRUE; END IF;
    IF NEW.is_active IS NULL THEN NEW.is_active := TRUE; END IF;

    IF NEW.color_id IS NULL AND NEW.supplier_code = 'XBZ' THEN
        IF NEW.variant_id IS NOT NULL THEN
            SELECT color_id INTO v_color_id FROM product_variants
            WHERE id = NEW.variant_id AND is_active = true;
            IF v_color_id IS NOT NULL THEN NEW.color_id := v_color_id; END IF;
        ELSE
            SELECT COUNT(DISTINCT pv.color_id) INTO v_n_cores FROM product_variants pv
            WHERE pv.product_id = NEW.product_id AND pv.is_active = true AND pv.color_id IS NOT NULL;
            IF v_n_cores = 1 THEN
                SELECT pv.id, pv.color_id INTO v_variant_id, v_color_id FROM product_variants pv
                WHERE pv.product_id = NEW.product_id AND pv.is_active = true AND pv.color_id IS NOT NULL
                ORDER BY pv.id LIMIT 1;
                NEW.color_id := v_color_id; NEW.variant_id := v_variant_id;
            ELSIF v_n_cores > 1 THEN
                SELECT pv.id, pv.color_id INTO v_variant_id, v_color_id FROM product_variants pv
                WHERE pv.product_id = NEW.product_id AND pv.is_active = true AND pv.color_id IS NOT NULL
                  AND NEW.url_original ILIKE '%' || REPLACE(pv.color_name, ' ', '-') || '%'
                GROUP BY pv.id, pv.color_id HAVING COUNT(*) = 1 LIMIT 1;
                IF v_color_id IS NOT NULL AND (
                  SELECT COUNT(DISTINCT pv2.color_id) FROM product_variants pv2
                  WHERE pv2.product_id = NEW.product_id AND pv2.is_active = true AND pv2.color_id IS NOT NULL
                    AND NEW.url_original ILIKE '%' || REPLACE(pv2.color_name, ' ', '-') || '%'
                ) = 1 THEN
                    NEW.color_id := v_color_id; NEW.variant_id := v_variant_id;
                END IF;
            END IF;
        END IF;
    END IF;

    RETURN NEW;
END;
$function$;
;
