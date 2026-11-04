CREATE OR REPLACE FUNCTION public.fn_validate_video_on_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
    v_validation RECORD;
BEGIN
    -- Validar apenas se temos dados de dimensão
    IF NEW.width_px IS NOT NULL AND NEW.height_px IS NOT NULL THEN
        SELECT * INTO v_validation
        FROM validate_video_requirements(
            NEW.width_px,
            NEW.height_px,
            NEW.duration_seconds,
            NEW.file_size_bytes,
            COALESCE(NEW.source_supplier, 'DEFAULT')
        );
        
        -- Registrar log
        INSERT INTO video_validation_log (
            video_id, product_id, cloudflare_video_id, supplier_code,
            width_px, height_px, duration_seconds, file_size_bytes,
            validation_status, is_valid, issues, recommendations, action_type
        ) VALUES (
            NEW.id, NEW.product_id, NEW.cloudflare_video_id, NEW.source_supplier,
            NEW.width_px, NEW.height_px, NEW.duration_seconds, NEW.file_size_bytes,
            v_validation.validation_status, v_validation.is_valid,
            v_validation.issues, v_validation.recommendations, TG_OP
        );
    END IF;
    
    RETURN NEW;
END;
$function$
