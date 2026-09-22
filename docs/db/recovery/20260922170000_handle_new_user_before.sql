-- Captura pg_catalog do canonico doufsxqlfjyuvxuezpln, antes da migration aprovada.
-- Formatacao: espacos em linhas vazias removidos; sem mudanca de logica.
-- SOMENTE RECUPERACAO SUPERVISIONADA: restaura o defeito de cadastro e a leitura
-- insegura de role nos metadados. Preferir compensacao forward-only revisada.
-- Nao aplicar junto com a migration; nao altera contas existentes.
BEGIN;
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_role TEXT;
    v_full_name TEXT;
    v_department TEXT;
    v_preferences JSONB;
BEGIN
    -- Role: lê do metadata, fallback 'sales'
    v_role := COALESCE(
        NULLIF(TRIM(NEW.raw_user_meta_data->>'role'), ''),
        'sales'
    );

    -- Validação: só aceita roles válidos
    IF v_role NOT IN ('admin', 'sales', 'manager') THEN
        v_role := 'sales';
    END IF;

    -- Nome: metadata 'name' ou 'full_name', fallback email
    v_full_name := COALESCE(
        NULLIF(TRIM(NEW.raw_user_meta_data->>'name'), ''),
        NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'), ''),
        NEW.email
    );

    -- Departamento
    v_department := NULLIF(TRIM(NEW.raw_user_meta_data->>'department'), '');

    -- Preferences (ex: title)
    v_preferences := '{}'::jsonb;
    IF NEW.raw_user_meta_data->>'title' IS NOT NULL THEN
        v_preferences := jsonb_build_object('title', NEW.raw_user_meta_data->>'title');
    END IF;

    INSERT INTO public.profiles (
        id, email, full_name, role,
        department, is_active, preferences,
        created_at, updated_at
    ) VALUES (
        NEW.id,
        NEW.email,
        v_full_name,
        v_role,
        v_department,
        TRUE,
        v_preferences,
        NOW(),
        NOW()
    );

    RETURN NEW;
END;
$function$;
COMMIT;
