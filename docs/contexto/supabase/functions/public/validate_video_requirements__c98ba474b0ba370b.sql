CREATE OR REPLACE FUNCTION public.validate_video_requirements(p_width integer, p_height integer, p_duration_seconds integer DEFAULT NULL::integer, p_file_size_bytes bigint DEFAULT NULL::bigint, p_supplier_code character varying DEFAULT 'DEFAULT'::character varying)
 RETURNS TABLE(is_valid boolean, validation_status character varying, issues text[], recommendations text[])
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
    v_req RECORD;
    v_issues TEXT[] := ARRAY[]::TEXT[];
    v_recommendations TEXT[] := ARRAY[]::TEXT[];
    v_status VARCHAR(30);
    v_file_size_mb DECIMAL;
BEGIN
    -- Buscar requisitos do fornecedor
    SELECT * INTO v_req
    FROM supplier_video_requirements
    WHERE supplier_code = p_supplier_code AND is_active = true;
    
    IF NOT FOUND THEN
        SELECT * INTO v_req
        FROM supplier_video_requirements
        WHERE supplier_code = 'DEFAULT' AND is_active = true;
    END IF;
    
    -- Validar dimensões mínimas
    IF p_width IS NOT NULL AND p_width < v_req.min_width_px THEN
        v_issues := array_append(v_issues, 
            format('Largura %spx abaixo do mínimo (%spx)', p_width, v_req.min_width_px));
    END IF;
    
    IF p_height IS NOT NULL AND p_height < v_req.min_height_px THEN
        v_issues := array_append(v_issues, 
            format('Altura %spx abaixo do mínimo (%spx)', p_height, v_req.min_height_px));
    END IF;
    
    -- Validar dimensões ideais (apenas recomendação)
    IF p_width IS NOT NULL AND p_width < v_req.ideal_width_px THEN
        v_recommendations := array_append(v_recommendations, 
            format('Largura %spx abaixo do ideal (%spx)', p_width, v_req.ideal_width_px));
    END IF;
    
    -- Validar duração
    IF p_duration_seconds IS NOT NULL THEN
        IF p_duration_seconds < v_req.min_duration_seconds THEN
            v_issues := array_append(v_issues, 
                format('Duração %ss abaixo do mínimo (%ss)', p_duration_seconds, v_req.min_duration_seconds));
        END IF;
        IF p_duration_seconds > v_req.max_duration_seconds THEN
            v_recommendations := array_append(v_recommendations, 
                format('Duração %ss excede o recomendado (%ss)', p_duration_seconds, v_req.max_duration_seconds));
        END IF;
    END IF;
    
    -- Validar tamanho do arquivo
    IF p_file_size_bytes IS NOT NULL THEN
        v_file_size_mb := p_file_size_bytes / 1024.0 / 1024.0;
        IF v_file_size_mb > v_req.max_file_size_mb THEN
            v_issues := array_append(v_issues, 
                format('Arquivo %.1fMB excede o máximo (%.0fMB)', v_file_size_mb, v_req.max_file_size_mb));
        END IF;
    END IF;
    
    -- Determinar status
    IF array_length(v_issues, 1) > 0 THEN
        v_status := 'REPROVADO';
    ELSIF array_length(v_recommendations, 1) > 0 THEN
        v_status := 'APROVADO_COM_RESSALVAS';
    ELSE
        v_status := 'APROVADO';
    END IF;
    
    RETURN QUERY SELECT 
        (array_length(v_issues, 1) IS NULL OR array_length(v_issues, 1) = 0),
        v_status,
        v_issues,
        v_recommendations;
END;
$function$
