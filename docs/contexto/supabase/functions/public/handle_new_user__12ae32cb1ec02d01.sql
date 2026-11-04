CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_full_name TEXT;
    v_department TEXT;
    v_preferences JSONB;
BEGIN
    -- GUARD: raw_user_meta_data nao concede privilegios. Promocoes pertencem
    -- ao fluxo administrativo autenticado; todo cadastro inicia como vendedor.
    v_full_name := COALESCE(
        NULLIF(TRIM(NEW.raw_user_meta_data->>'name'), ''),
        NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'), ''),
        NEW.email
    );
    v_department := NULLIF(TRIM(NEW.raw_user_meta_data->>'department'), '');
    v_preferences := '{}'::jsonb;
    IF NEW.raw_user_meta_data->>'title' IS NOT NULL THEN
        v_preferences := jsonb_build_object('title', NEW.raw_user_meta_data->>'title');
    END IF;
    INSERT INTO public.profiles (
        id, user_id, email, full_name, role,
        department, is_active, preferences, created_at, updated_at
    ) VALUES (
        NEW.id, NEW.id, NEW.email, v_full_name, 'sales',
        v_department, TRUE, v_preferences, NOW(), NOW()
    );
    RETURN NEW;
END;
$function$
