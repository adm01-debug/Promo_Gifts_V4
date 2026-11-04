CREATE OR REPLACE FUNCTION public.set_audit_user_fields()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
    BEGIN
        IF TG_OP = 'INSERT' THEN
            NEW.created_by := COALESCE(
                current_setting('app.current_user_id', true)::uuid,
                NEW.created_by
            );
            NEW.updated_by := COALESCE(
                current_setting('app.current_user_id', true)::uuid,
                NEW.updated_by
            );
        ELSIF TG_OP = 'UPDATE' THEN
            NEW.updated_by := COALESCE(
                current_setting('app.current_user_id', true)::uuid,
                NEW.updated_by
            );
        END IF;
    EXCEPTION
        WHEN OTHERS THEN
            NULL;
    END;
    
    RETURN NEW;
END;
$function$
