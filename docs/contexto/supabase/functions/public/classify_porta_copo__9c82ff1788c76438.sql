CREATE OR REPLACE FUNCTION public.classify_porta_copo(product_name text)
 RETURNS jsonb
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
    v_name TEXT;
    v_material TEXT;
    v_category_id UUID;
    v_category_slug TEXT;
    v_attributes JSONB;
BEGIN
    v_name := UPPER(unaccent(COALESCE(product_name, '')));
    
    IF v_name ~ 'CORTICA|CORTIÇA' THEN
        v_material := 'CORTICA';
        v_category_slug := 'porta-copo-cortica';
        v_category_id := '97b2114b-a243-4233-a59b-067e7c1986ab'::uuid;
    ELSIF v_name ~ 'COURO.?GENUINO|COURO.?LEGITIMO|COURO.?NATURAL' THEN
        v_material := 'COURO_GENUINO';
        v_category_slug := 'porta-copo-couro-genuino';
        v_category_id := 'a96cfdf3-2eff-41b7-876e-d1d66c696816'::uuid;
    ELSIF v_name ~ 'COURO|LEATHER|COURINO' THEN
        v_material := 'COURO_ECOLOGICO';
        v_category_slug := 'porta-copo-couro-ecologico';
        v_category_id := 'd5b5454b-df45-4290-a4e2-62dc042fca73'::uuid;
    ELSIF v_name ~ 'NEOPRENE' THEN
        v_material := 'NEOPRENE';
        v_category_slug := 'porta-copo-neoprene';
        v_category_id := 'a6f00ac0-782d-4277-90ee-99030ba8a83d'::uuid;
    ELSIF v_name ~ 'EMBORRACHAD|BORRACHA|EVA|PVC|RUBBER' THEN
        v_material := 'EMBORRACHADO';
        v_category_slug := 'porta-copo-emborrachado';
        v_category_id := 'f420d0f0-c84e-421f-8ed9-d38e51431ebd'::uuid;
    ELSIF v_name ~ 'SILICONE' THEN
        v_material := 'SILICONE';
        v_category_slug := 'porta-copo-silicone';
        v_category_id := 'c2fab1fc-55de-4eb8-a092-baf216c28d7c'::uuid;
    ELSIF v_name ~ 'MDF|MADEIRA|WOOD' THEN
        v_material := 'MDF';
        v_category_slug := 'porta-copo-mdf';
        v_category_id := 'ae2b289d-b687-4754-873f-32cda2678564'::uuid;
    ELSIF v_name ~ 'PAPEL|ABSORVENTE|DESCARTAVEL' THEN
        v_material := 'PAPEL';
        v_category_slug := 'porta-copo-papel-absorvente';
        v_category_id := 'ab81a799-1c8c-4f04-90f4-5bb5ba4ba89b'::uuid;
    ELSE
        v_material := 'INDEFINIDO';
        v_category_slug := 'porta_copo';
        v_category_id := '968d68f9-ccd0-4357-89dc-3bc9ba33a0ad'::uuid;
    END IF;
    
    v_attributes := jsonb_build_object(
        'is_kit',           v_name ~ 'KIT|CONJUNTO|SET|\d+\s*UN',
        'qtd_unidades',     (regexp_match(v_name, '(\d+)\s*(?:UN|UNID|PC|PCS|PECAS)'))[1],
        'is_personalizavel',v_name ~ 'GRAV|LASER|PERSONAL|SUBLIM'
    );
    
    RETURN jsonb_build_object(
        'category_id', v_category_id,
        'category_slug', v_category_slug,
        'material', v_material,
        'attributes', v_attributes
    );
END;
$function$
