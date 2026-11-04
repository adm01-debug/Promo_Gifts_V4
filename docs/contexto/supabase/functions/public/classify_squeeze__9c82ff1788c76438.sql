CREATE OR REPLACE FUNCTION public.classify_squeeze(product_name text)
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
    v_capacidade_ml TEXT;
    v_attributes JSONB;
BEGIN
    v_name := UPPER(unaccent(COALESCE(product_name, '')));
    
    -- Detectar material
    IF v_name ~ 'INOX|ACO.?INOX|AÇO.?INOX' THEN
        v_material := 'INOX';
        v_category_slug := 'squeeze-garrafas-inox';
        v_category_id := '0ef00ae9-87d4-4671-b841-3671008055ec'::uuid;
    ELSIF v_name ~ 'ALUMINIO|ALUMÍNIO|METAL' THEN
        v_material := 'METAL';
        v_category_slug := 'squeeze-garrafas-metal';
        v_category_id := '3480963c-946d-4c2e-b856-02fe9593d720'::uuid;
    ELSIF v_name ~ 'VIDRO|GLASS|BOROSSILICATO' THEN
        v_material := 'VIDRO';
        v_category_slug := 'squeeze-garrafas-vidro';
        v_category_id := '3a0aec05-79fe-47f7-a8fd-af77b78fadaa'::uuid;
    ELSIF v_name ~ 'PLASTIC|ACRILIC|ACRÍLICO|TRITAN|PP|PET|BPA' THEN
        v_material := 'PLASTICO';
        v_category_slug := 'squeeze-garrafas-plastico';
        v_category_id := '939ffda9-1b64-43d5-877e-ef3bc64abe78'::uuid;
    ELSE
        v_material := 'INDEFINIDO';
        v_category_slug := 'squeeze_garrafas';
        v_category_id := '9b763494-a404-40a4-b5cd-f8888595046f'::uuid;
    END IF;
    
    -- Detectar capacidade (ML ou LITROS)
    v_capacidade_ml := (regexp_match(v_name, '(\d+)\s*ML'))[1];
    
    -- Se não encontrou ML, tentar LITROS e converter
    IF v_capacidade_ml IS NULL THEN
        DECLARE
            v_litros TEXT;
        BEGIN
            v_litros := (regexp_match(v_name, '(\d+(?:[.,]\d+)?)\s*(?:L|LITRO)'))[1];
            IF v_litros IS NOT NULL THEN
                -- Converter para ML (multiplicar por 1000)
                v_capacidade_ml := (REPLACE(v_litros, ',', '.')::NUMERIC * 1000)::INTEGER::TEXT;
            END IF;
        END;
    END IF;
    
    v_attributes := jsonb_build_object(
        'is_termica',       v_name ~ 'TERMIC|THERMAL|DUPLA.?PAREDE|ISOTERM',
        'has_infusor',      v_name ~ 'INFUSOR|INFUSER',
        'has_canudo',       v_name ~ 'CANUDO|STRAW',
        'has_alca',         v_name ~ 'ALÇA|ALCA|HANDLE',
        'is_dobravel',      v_name ~ 'DOBRAVEL|SILICONE|RETRATIL',
        'is_esportiva',     v_name ~ 'SPORT|ACADEMIA|FITNESS|BIKE',
        'livre_bpa',        v_name ~ 'BPA.?FREE|LIVRE.?(?:DE.?)?BPA|SEM.?BPA',
        'capacidade_ml',    v_capacidade_ml
    );
    
    RETURN jsonb_build_object(
        'category_id', v_category_id,
        'category_slug', v_category_slug,
        'material', v_material,
        'attributes', v_attributes
    );
END;
$function$
