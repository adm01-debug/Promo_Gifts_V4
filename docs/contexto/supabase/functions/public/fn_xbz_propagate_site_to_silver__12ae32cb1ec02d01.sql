CREATE OR REPLACE FUNCTION public.fn_xbz_propagate_site_to_silver()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
    v_ref_pai  text;
    v_cats     jsonb;
    v_cores    jsonb;
    v_relac    jsonb;
BEGIN
    IF NEW.supplier_id != 'd6718a29-e954-4c1b-bd84-03ea24884900' THEN RETURN NEW; END IF;
    IF NEW.site_status != 'processed'  THEN RETURN NEW; END IF;
    IF OLD.site_status = 'processed'   THEN RETURN NEW; END IF;

    v_ref_pai := split_part(NEW.supplier_reference, '-', 1);

    -- ── SUPPLIER_CATEGORIES ──────────────────────────────────────
    IF jsonb_array_length(COALESCE(NEW.site_data->'categorias','[]')) > 0 THEN
        SELECT jsonb_agg(jsonb_build_object(
            'nome',  elem.value->>'nome',
            'path',  elem.value->>'path',
            'nivel', (elem.value->>'nivel')::int,
            'url',   elem.value->>'url'))
        INTO v_cats
        FROM jsonb_array_elements(NEW.site_data->'categorias') AS elem
        WHERE (elem.value->>'nome') IS NOT NULL;
    END IF;

    -- ── COLORS (staging) ─────────────────────────────────────────
    IF jsonb_array_length(COALESCE(NEW.site_data->'cores','[]')) > 0 THEN
        v_cores := NEW.site_data->'cores';
    END IF;

    -- ── RELATED REFERENCES ───────────────────────────────────────
    IF jsonb_array_length(COALESCE(NEW.site_data->'relacionados','[]')) > 0 THEN
        SELECT jsonb_agg(r.value->>'codigo')
        INTO v_relac
        FROM jsonb_array_elements(NEW.site_data->'relacionados') AS r
        WHERE (r.value->>'codigo') IS NOT NULL;
    END IF;

    -- ── UPDATE SILVER ────────────────────────────────────────────
    UPDATE produtos_padronizacao pp
    SET
        supplier_categories   = COALESCE(pp.supplier_categories, v_cats),
        supplier_type         = COALESCE(pp.supplier_type,
            (SELECT c->>'nome' FROM jsonb_array_elements(v_cats) c
             WHERE (c->>'nivel')::int=1 LIMIT 1)),
        supplier_type_code    = COALESCE(pp.supplier_type_code,
            (SELECT c->>'path' FROM jsonb_array_elements(v_cats) c
             WHERE (c->>'nivel')::int=1 LIMIT 1)),
        supplier_subtype      = COALESCE(pp.supplier_subtype,
            (SELECT c->>'nome' FROM jsonb_array_elements(v_cats) c
             WHERE (c->>'nivel')::int=2 LIMIT 1)),
        supplier_subtype_code = COALESCE(pp.supplier_subtype_code,
            (SELECT c->>'path' FROM jsonb_array_elements(v_cats) c
             WHERE (c->>'nivel')::int=2 LIMIT 1)),
        colors                = COALESCE(pp.colors, v_cores),
        related_references    = COALESCE(pp.related_references, v_relac),
        materials             = COALESCE(pp.materials,
                                    fn_xbz_derive_materials(pp.name, pp.supplier_subtype)),
        updated_at = now()
    WHERE pp.supplier_id = NEW.supplier_id
      AND pp.supplier_reference = v_ref_pai
      AND (pp.supplier_categories IS NULL
           OR pp.colors IS NULL
           OR pp.related_references IS NULL
           OR pp.materials IS NULL);

    RETURN NEW;
END;
$function$
