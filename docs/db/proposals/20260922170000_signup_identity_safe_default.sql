-- PROPOSTA, NAO APLICADA. Fora de supabase/migrations para impedir deploy acidental.
-- Substitui a proposta 20260920120000: aplicar apenas uma delas, nunca ambas.
-- Alvo: public.handle_new_user(). Nenhuma conta existente ou outro objeto e alterado.
-- Rollback: restaurar pg_get_functiondef capturado antes da janela; isso reintroduz
-- o defeito de cadastro e a dependencia de metadata nao confiavel. Preferir compensacao
-- forward-only revisada. Nao alterar/deletar profiles ou user_roles existentes.
-- Pre-condicao fixa o corpo inspecionado em 22/09, ignorando somente CRLF.
DO $precondition$
BEGIN
  IF NOT EXISTS (
    SELECT FROM pg_proc p
    WHERE p.oid = to_regprocedure('public.handle_new_user()')
      AND md5(replace(p.prosrc,chr(13),'')) = '59e7ff7d047a8a855cc785ee2e9b5ccf'
  ) THEN
    RAISE EXCEPTION 'handle_new_user mudou ou nao existe; recoletar e revisar antes de aplicar';
  END IF;
  IF NOT EXISTS (
    SELECT FROM pg_proc p
    WHERE p.oid = to_regprocedure('public.fn_grant_default_role_on_profile()')
      AND md5(replace(p.prosrc,chr(13),'')) = '7d526cb5c45ebfe5297f5034cfa2b424'
  ) THEN
    RAISE EXCEPTION 'Trigger de concessao de papel mudou; revisar o encadeamento';
  END IF;
  IF EXISTS (SELECT FROM public.profiles WHERE user_id IS DISTINCT FROM id) THEN
    RAISE EXCEPTION 'Identidades existentes divergentes; nao reparar dados implicitamente';
  END IF;
END;
$precondition$;

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
$function$;

DO $postcondition$
BEGIN
  IF NOT EXISTS (
    SELECT FROM pg_trigger t
    WHERE t.tgrelid='auth.users'::regclass AND t.tgname='on_auth_user_created'
      AND t.tgfoid='public.handle_new_user()'::regprocedure
      AND NOT t.tgisinternal AND t.tgenabled IN ('O','A')
  ) THEN
    RAISE EXCEPTION 'Trigger de cadastro ausente, desabilitado ou ligado a outra funcao';
  END IF;
END;
$postcondition$;
