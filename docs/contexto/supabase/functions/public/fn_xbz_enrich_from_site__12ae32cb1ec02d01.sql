CREATE OR REPLACE FUNCTION public.fn_xbz_enrich_from_site()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
    v_site  jsonb;
    v_ref   text;
BEGIN
    -- Só executa para XBZ
    IF NEW.supplier_id != 'd6718a29-e954-4c1b-bd84-03ea24884900' THEN RETURN NEW; END IF;

    -- ════════════════════════════════════════════════════════════
    -- BLOCO 1: campos que NÃO dependem de site_data
    -- ════════════════════════════════════════════════════════════

    -- Defaults hardcoded
    IF NEW.brand          IS NULL THEN NEW.brand          := 'XBZ Brindes'; END IF;
    IF NEW.product_type   IS NULL THEN NEW.product_type   := 'product';     END IF;
    IF NEW.origin_country IS NULL THEN NEW.origin_country := 'China';       END IF;

    -- Flags booleanas sem fonte → false
    IF NEW.is_online_exclusive IS NULL THEN NEW.is_online_exclusive := false; END IF;
    IF NEW.is_seasonal         IS NULL THEN NEW.is_seasonal         := false; END IF;
    IF NEW.pvc_free            IS NULL THEN NEW.pvc_free            := false; END IF;
    IF NEW.has_sizes           IS NULL THEN NEW.has_sizes           := false; END IF;

    -- is_textil: keywords no nome ou categoria
    IF NEW.is_textil IS NULL THEN
        NEW.is_textil := (
            COALESCE(NEW.name,'') ~* '\m(nylon|neoprene|oxford|lona|poliéster|poliester|tnt|tecido|flanela|algodão|algodao|microfibra|veludo|viscose|moletom|malha|jeans|spandex|lycra|percal|couro sint)\M'
            OR COALESCE(NEW.supplier_type,'') IN (
                'Malas Mochilas Bolsas','Sacolas E Sacochilas',
                'Bolsas Termicas','Necessaires','Guarda Chuva'
            )
        );
    END IF;

    -- Materials: keyword lookup do nome + subtype
    IF NEW.materials IS NULL THEN
        NEW.materials := fn_xbz_derive_materials(NEW.name, NEW.supplier_subtype);
    END IF;

    -- allows_personalization: fallback para engraving_type (mesmo sem site)
    IF NEW.allows_personalization IS NULL THEN
        NEW.allows_personalization := (NEW.engraving_type IS NOT NULL);
    END IF;

    -- Supplier type/subtype das categories (se já preenchidas)
    IF NEW.supplier_type IS NULL AND NEW.supplier_categories IS NOT NULL THEN
        SELECT c->>'nome' INTO NEW.supplier_type
        FROM jsonb_array_elements(NEW.supplier_categories) c
        WHERE (c->>'nivel')::int = 1 LIMIT 1;
        SELECT c->>'path' INTO NEW.supplier_type_code
        FROM jsonb_array_elements(NEW.supplier_categories) c
        WHERE (c->>'nivel')::int = 1 LIMIT 1;
    END IF;
    IF NEW.supplier_subtype IS NULL AND NEW.supplier_categories IS NOT NULL THEN
        SELECT c->>'nome' INTO NEW.supplier_subtype
        FROM jsonb_array_elements(NEW.supplier_categories) c
        WHERE (c->>'nivel')::int = 2 LIMIT 1;
        SELECT c->>'path' INTO NEW.supplier_subtype_code
        FROM jsonb_array_elements(NEW.supplier_categories) c
        WHERE (c->>'nivel')::int = 2 LIMIT 1;
    END IF;

    -- ════════════════════════════════════════════════════════════
    -- Buscar site_data da variante representativa
    -- ════════════════════════════════════════════════════════════
    v_ref := NEW.supplier_reference;
    SELECT spr.site_data INTO v_site
    FROM supplier_products_raw spr
    WHERE spr.supplier_id = NEW.supplier_id
      AND (spr.supplier_reference = v_ref
           OR spr.supplier_reference LIKE v_ref || '-%')
      AND spr.site_status = 'processed'
      AND spr.site_data IS NOT NULL
    ORDER BY
        (spr.site_data->'gravacao'->>'medida_texto' IS NOT NULL) DESC,
        jsonb_array_length(COALESCE(spr.site_data->'relacionados','[]')) DESC,
        jsonb_array_length(COALESCE(spr.site_data->'imagens','[]')) DESC
    LIMIT 1;

    -- Early return se sem site_data (os campos do bloco 1 já foram definidos)
    IF v_site IS NULL THEN RETURN NEW; END IF;

    -- ════════════════════════════════════════════════════════════
    -- BLOCO 2: campos que dependem de site_data
    -- ════════════════════════════════════════════════════════════

    -- Colors (staging)
    IF NEW.colors IS NULL AND jsonb_array_length(COALESCE(v_site->'cores','[]')) > 0 THEN
        NEW.colors := v_site->'cores';
    END IF;

    -- has_colors
    IF NEW.has_colors IS NULL THEN
        NEW.has_colors := jsonb_array_length(COALESCE(v_site->'cores','[]')) > 1;
    END IF;

    -- Description
    IF NEW.description IS NULL AND length(COALESCE(v_site->>'descricao','')) >= 10
       AND v_site->>'descricao' NOT ILIKE 'http%' THEN
        NEW.description := v_site->>'descricao';
    END IF;

    -- Primary image
    IF NEW.primary_image_url IS NULL THEN
        SELECT img->>'url' INTO NEW.primary_image_url
        FROM jsonb_array_elements(COALESCE(v_site->'imagens','[]')) AS img
        WHERE (img->>'principal')::boolean = true LIMIT 1;
        IF NEW.primary_image_url IS NULL OR NEW.primary_image_url NOT ILIKE 'http%' THEN
            NEW.primary_image_url := NULL;
        END IF;
    END IF;

    -- Engraving
    IF NEW.engraving_type IS NULL THEN
        NEW.engraving_type := v_site->'gravacao'->>'medida_texto';
        IF NEW.engraving_type IS NOT NULL THEN
            NEW.allows_personalization := true;
        END IF;
    END IF;

    -- Related references
    IF NEW.related_references IS NULL AND
       jsonb_array_length(COALESCE(v_site->'relacionados','[]')) > 0 THEN
        SELECT jsonb_agg(r->>'codigo') INTO NEW.related_references
        FROM jsonb_array_elements(v_site->'relacionados') AS r
        WHERE (r->>'codigo') IS NOT NULL;
    END IF;

    -- Supplier categories
    IF NEW.supplier_categories IS NULL AND
       jsonb_array_length(COALESCE(v_site->'categorias','[]')) > 0 THEN
        SELECT jsonb_agg(jsonb_build_object(
            'nome',  c->>'nome','path',c->>'path',
            'nivel',(c->>'nivel')::int,'url',c->>'url'))
        INTO NEW.supplier_categories
        FROM jsonb_array_elements(v_site->'categorias') AS c
        WHERE (c->>'nome') IS NOT NULL;
    END IF;

    -- Dimensions (site, se API zerou)
    IF COALESCE(NEW.weight_g, 0) = 0 AND (v_site->>'peso_g') IS NOT NULL THEN
        NEW.weight_g := NULLIF((v_site->>'peso_g')::numeric, 0)::integer;
    END IF;
    IF COALESCE(NEW.height_cm, 0) = 0 THEN
        NEW.height_cm := NULLIF((v_site->'dimensoes'->>'altura_cm')::numeric, 0);
    END IF;
    IF COALESCE(NEW.width_cm, 0) = 0 THEN
        NEW.width_cm := NULLIF((v_site->'dimensoes'->>'largura_cm')::numeric, 0);
    END IF;
    IF NEW.length_cm IS NULL THEN
        NEW.length_cm := CASE
            WHEN (v_site->'dimensoes'->>'profundidade_cm')::numeric BETWEEN 0.1 AND 200
            THEN (v_site->'dimensoes'->>'profundidade_cm')::numeric ELSE NULL END;
    END IF;
    IF NEW.circumference_cm IS NULL THEN
        NEW.circumference_cm := NULLIF((v_site->'dimensoes'->>'circunferencia_cm')::numeric, 0);
    END IF;

    -- capacity_ml via regex do nome
    IF NEW.capacity_ml IS NULL AND NEW.name ~* '(\d+)\s*ml' THEN
        NEW.capacity_ml := (regexp_match(NEW.name, '(\d+)\s*ml', 'i'))[1]::integer;
    END IF;

    -- dimensions_display
    IF NEW.dimensions_display IS NULL THEN
        SELECT INTO NEW.dimensions_display
            CASE WHEN COUNT(*) > 0
                 THEN string_agg(v || 'cm', ' x ' ORDER BY ord)
                 ELSE NULL END
        FROM (VALUES
            (1, COALESCE(NEW.height_cm, 0)::text),
            (2, COALESCE(NEW.width_cm,  0)::text),
            (3, COALESCE(NEW.length_cm, 0)::text)
        ) AS t(ord, v)
        WHERE v::numeric > 0;
    END IF;

    RETURN NEW;
END;
$function$
