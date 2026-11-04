CREATE OR REPLACE FUNCTION public.fn_find_material_type_id(material_name text)
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
    v_type_id UUID;
    v_search TEXT;
BEGIN
    IF material_name IS NULL OR trim(material_name) = '' THEN
        RETURN NULL;
    END IF;

    v_search := lower(trim(material_name));
    v_search := regexp_replace(v_search, ':\s*\d+\s*g/m²', '', 'gi');
    v_search := regexp_replace(v_search, '\d+\s*g/m²', '', 'gi');
    v_search := trim(v_search);

    -- ESTRATÉGIA 0: termos genéricos → tipos *Genérico
    v_type_id := CASE
        WHEN v_search ~ '^pl[áa]stic[oa]s?$' THEN
            (SELECT id FROM material_types WHERE slug = 'plastico|generico' AND is_active LIMIT 1)
        WHEN v_search ~ '^metal$|^metais$|^met[áa]lic[oa]s?$' THEN
            (SELECT id FROM material_types WHERE slug = 'metal|generico' AND is_active LIMIT 1)
        WHEN v_search ~ '^tecidos?$' THEN
            (SELECT id FROM material_types WHERE slug = 'tecido|generico' AND is_active LIMIT 1)
        WHEN v_search ~ '^pap[ée]is$|^papel$' THEN
            (SELECT id FROM material_types WHERE slug = 'papel|generico' AND is_active LIMIT 1)
        WHEN v_search ~ '^papel[ãa]o$' THEN
            (SELECT id FROM material_types WHERE slug = 'papelao' AND is_active LIMIT 1)
        ELSE NULL
    END;
    IF v_type_id IS NOT NULL THEN RETURN v_type_id; END IF;

    -- ESTRATÉGIA 1: nome exato (ativos)
    SELECT id INTO v_type_id FROM material_types
    WHERE lower(name) = v_search AND is_active = true LIMIT 1;
    IF v_type_id IS NOT NULL THEN RETURN v_type_id; END IF;

    -- ESTRATÉGIA 2: slug exato (ativos)
    SELECT id INTO v_type_id FROM material_types
    WHERE (lower(slug) = v_search OR lower(slug) = regexp_replace(v_search, '\s+', '-', 'g'))
      AND is_active = true LIMIT 1;
    IF v_type_id IS NOT NULL THEN RETURN v_type_id; END IF;

    -- ESTRATÉGIA 3: nome contém busca (ativos)
    SELECT id INTO v_type_id FROM material_types
    WHERE lower(name) LIKE '%' || v_search || '%' AND is_active = true
      AND length(v_search) > 3
    ORDER BY length(name) ASC LIMIT 1;
    IF v_type_id IS NOT NULL THEN RETURN v_type_id; END IF;

    -- ESTRATÉGIA 4: busca contém nome (ativos)
    SELECT id INTO v_type_id FROM material_types
    WHERE v_search LIKE '%' || lower(name) || '%' AND is_active = true
      AND length(v_search) > 3
    ORDER BY length(name) DESC LIMIT 1;
    IF v_type_id IS NOT NULL THEN RETURN v_type_id; END IF;

    -- ESTRATÉGIA 5: mapeamentos especiais e aliases (todos is_active)
    v_type_id := CASE
        WHEN v_search ~ '^\d+d$' OR v_search ~ '^\d+t$' THEN
            (SELECT id FROM material_types WHERE (lower(name) LIKE '%poliéster%' OR lower(name) LIKE '%poliester%') AND is_active LIMIT 1)
        WHEN v_search = 'pp' OR v_search ~ '\mpp\M' AND v_search ~ '^pl[áa]stico pp$|^pp ' THEN
            (SELECT id FROM material_types WHERE lower(name) LIKE '%polipropileno%' AND is_active LIMIT 1)
        WHEN v_search ~ '^pl[áa]stico pp' THEN
            (SELECT id FROM material_types WHERE lower(name) LIKE '%polipropileno%' AND is_active LIMIT 1)
        WHEN v_search = 'pet' OR v_search = 'petg' THEN
            (SELECT id FROM material_types WHERE lower(slug) = 'plastico-pet' AND is_active LIMIT 1)
        WHEN v_search LIKE '%rpet%' OR v_search = 'r-pet' THEN
            (SELECT id FROM material_types WHERE lower(slug) = 'plastico-rpet' AND is_active LIMIT 1)
        WHEN v_search = 'rabs' THEN
            (SELECT id FROM material_types WHERE lower(name) LIKE '%abs%' AND lower(name) NOT LIKE '%eps%' AND is_active ORDER BY length(name) LIMIT 1)
        WHEN v_search = 'pc' OR v_search LIKE '%policarbonato%' THEN
            (SELECT id FROM material_types WHERE lower(slug) = 'policarbonato' AND is_active LIMIT 1)
        WHEN v_search IN ('tpr','tpe') THEN
            (SELECT id FROM material_types WHERE lower(name) = 'borracha' AND is_active LIMIT 1)
        WHEN v_search ~ '^polietileno' OR v_search = 'pe' OR v_search = 'hdpe' THEN
            (SELECT id FROM material_types WHERE lower(slug) = 'polietileno-de-alta-densidade-pead-pe' AND is_active LIMIT 1)
        WHEN v_search ~ '^poliestireno' OR v_search = 'ps' OR v_search = 'hips' THEN
            (SELECT id FROM material_types WHERE lower(slug) = 'poliestireno-ps' AND is_active LIMIT 1)
        WHEN v_search LIKE '%juta%' OR v_search LIKE '%juco%' OR v_search LIKE '%fibra natural%'
          OR v_search LIKE '%casca de coco%' OR v_search LIKE '%linho%' OR v_search LIKE '%palha%' THEN
            (SELECT id FROM material_types WHERE lower(name) LIKE '%fibras naturais%' AND is_active LIMIT 1)
        WHEN v_search LIKE '%fibra de arroz%' OR v_search LIKE '%fibra de bambu e pp%' OR v_search LIKE '%fibra de trigo%' THEN
            (SELECT id FROM material_types WHERE lower(name) LIKE '%plásticos ecológicos%' AND is_active LIMIT 1)
        WHEN v_search LIKE '%papel craft%' THEN
            (SELECT id FROM material_types WHERE lower(slug) = 'kraft' AND is_active LIMIT 1)
        WHEN v_search = 'percalux' OR v_search LIKE '%pele reciclada%' OR v_search ~ '^c\.?\s?sint[ée]tico'
          OR v_search LIKE '%couro sintético%' OR v_search LIKE '%couro sintetico%' OR v_search ~ '^pu\M' THEN
            (SELECT id FROM material_types WHERE (lower(name) LIKE '%couro sintético%' OR lower(name) LIKE '%couro sintetico%') AND is_active LIMIT 1)
        WHEN v_search LIKE '%soft shell%' OR v_search = 'cetim' OR v_search = 'webbing' THEN
            (SELECT id FROM material_types WHERE (lower(name) = 'poliéster' OR lower(name) = 'poliester') AND is_active LIMIT 1)
        WHEN v_search LIKE '%aço inox%' OR v_search LIKE '%aco inox%' THEN
            (SELECT id FROM material_types WHERE lower(slug) = 'aco-inox' AND is_active LIMIT 1)
        WHEN v_search = 'ferro' THEN
            (SELECT id FROM material_types WHERE slug = 'metal|generico' AND is_active LIMIT 1)
        WHEN v_search LIKE '%eva%' THEN
            (SELECT id FROM material_types WHERE lower(name) LIKE '%eva%' AND is_active LIMIT 1)
        WHEN v_search LIKE '%pongee%' THEN
            (SELECT id FROM material_types WHERE lower(name) LIKE '%pongee%' AND is_active LIMIT 1)
        WHEN v_search LIKE '%tarpaulin%' OR v_search LIKE '%canvas%' THEN
            (SELECT id FROM material_types WHERE lower(name) LIKE '%lona%' AND is_active LIMIT 1)
        WHEN v_search LIKE '%non-woven%' OR v_search LIKE '%nonwoven%' THEN
            (SELECT id FROM material_types WHERE lower(name) LIKE '%tnt%' AND is_active LIMIT 1)
        WHEN v_search LIKE '%microfibra%' THEN
            (SELECT id FROM material_types WHERE lower(name) LIKE '%microfibra%' AND is_active LIMIT 1)
        WHEN v_search LIKE '%polar%' THEN
            (SELECT id FROM material_types WHERE lower(name) LIKE '%polar%' AND is_active LIMIT 1)
        WHEN v_search LIKE '%feltro%' THEN
            (SELECT id FROM material_types WHERE lower(name) LIKE '%feltro%' AND is_active LIMIT 1)
        WHEN v_search LIKE '%poliamida%' THEN
            (SELECT id FROM material_types WHERE lower(name) LIKE '%poliamida%' AND is_active LIMIT 1)
        WHEN v_search LIKE '%denim%' OR v_search LIKE '%tipo jeans%' THEN
            (SELECT id FROM material_types WHERE lower(name) LIKE '%indigo%' AND is_active LIMIT 1)
        WHEN v_search LIKE '%contraplacado%' THEN
            (SELECT id FROM material_types WHERE lower(name) LIKE '%mdf%' AND is_active LIMIT 1)
        WHEN v_search LIKE '%vidro%' THEN
            (SELECT id FROM material_types WHERE lower(name) = 'vidro' AND is_active LIMIT 1)
        WHEN v_search LIKE '%madeira%' THEN
            (SELECT id FROM material_types WHERE lower(name) = 'madeira' AND is_active LIMIT 1)
        WHEN v_search = 'abs' THEN
            (SELECT id FROM material_types WHERE lower(name) LIKE '%abs%' AND is_active LIMIT 1)
        WHEN v_search LIKE '%peva%' THEN
            (SELECT id FROM material_types WHERE lower(name) LIKE '%pvc%' AND is_active LIMIT 1)
        WHEN v_search LIKE '%jacquard%' THEN
            (SELECT id FROM material_types WHERE lower(name) LIKE '%jacquard%' AND is_active LIMIT 1)
        WHEN v_search LIKE '%rede%' OR v_search LIKE '%tela%' THEN
            (SELECT id FROM material_types WHERE lower(name) LIKE '%nylon%' AND is_active LIMIT 1)
        WHEN v_search LIKE '%tecido em poli%' OR v_search LIKE '%tecido poli%' THEN
            (SELECT id FROM material_types WHERE (lower(name) LIKE '%poliéster%' OR lower(name) LIKE '%poliester%') AND is_active LIMIT 1)
        WHEN v_search = 'ral' THEN
            (SELECT id FROM material_types WHERE lower(name) = 'alumínio' AND is_active LIMIT 1)
        WHEN v_search = 'as' THEN
            (SELECT id FROM material_types WHERE lower(name) LIKE '%abs%' AND is_active ORDER BY length(name) LIMIT 1)
        WHEN v_search LIKE 'pvc%' OR v_search LIKE '%pvc%' THEN
            (SELECT id FROM material_types WHERE lower(name) = 'pvc (policloreto de vinila)' AND is_active LIMIT 1)
        WHEN v_search = 'tnt' THEN
            (SELECT id FROM material_types WHERE lower(name) LIKE '%tnt%' AND is_active ORDER BY length(name) LIMIT 1)
        WHEN v_search ~ '^papel\M' THEN
            (SELECT id FROM material_types WHERE slug = 'papel|generico' AND is_active LIMIT 1)
        WHEN v_search ~ '^\d+d\b' OR v_search ~ '^\d+d\s*(de alta dens|melange|2tone|multi)' OR v_search ~ '^\d+d\s*(e|and)\s*\d+d' THEN
            (SELECT id FROM material_types WHERE (lower(name) LIKE '%poliéster%' OR lower(name) LIKE '%poliester%') AND is_active LIMIT 1)
        WHEN v_search IN ('-','–','—','/') OR v_search = '' THEN NULL
        WHEN v_search LIKE '%grafite%' OR v_search LIKE '%fibra de carbono%' THEN
            (SELECT id FROM material_types WHERE slug='metal|generico' AND is_active LIMIT 1)
        WHEN v_search LIKE '%esmalte%' THEN
            (SELECT id FROM material_types WHERE slug='ceramica' AND is_active LIMIT 1)
        WHEN v_search LIKE '%ptfe%' THEN
            (SELECT id FROM material_types WHERE lower(name) LIKE '%borracha%' AND is_active ORDER BY length(name) LIMIT 1)
        WHEN v_search LIKE '%latão%' OR v_search LIKE '%latao%' THEN
            (SELECT id FROM material_types WHERE lower(name) LIKE '%cobre%' OR lower(name) LIKE '%metal gen%' AND is_active ORDER BY lower(name) LIMIT 1)
        WHEN v_search ~ 'abs e pu|pu e abs' THEN
            (SELECT id FROM material_types WHERE lower(name) LIKE '%abs%' AND is_active LIMIT 1)
        WHEN v_search LIKE '%webbing%' THEN
            (SELECT id FROM material_types WHERE (lower(name) LIKE '%poliéster%' OR lower(name) LIKE '%poliester%') AND is_active LIMIT 1)
        ELSE NULL
    END;

    RETURN v_type_id;
END;
$function$
