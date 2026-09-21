-- Onda 0 do plano de execução — achado de emergência (2026-09-20), fora do
-- escopo original dos 2 planos de 50 etapas: gate de CI "RPC availability ·
-- staging/production" começou a falhar com
-- `AuthApiError: Database error creating new user` (code unexpected_failure)
-- ao tentar criar um usuário sintético via `admin.auth.admin.createUser`.
--
-- Causa raiz confirmada ao vivo (postgres_logs, 2026-09-20T09:25Z):
--   "insert or update on table "user_roles" violates foreign key constraint
--    "user_roles_user_id_profiles_fkey""
--
-- A FK é `user_roles.user_id REFERENCES profiles(user_id)` (não
-- `profiles(id)` — profiles tem as duas colunas, `id` é a PK própria e
-- `user_id` é UNIQUE e é a coluna que o resto do app usa para ligar a
-- auth.users: `src/services/authService.ts` busca perfil via
-- `.eq('user_id', userId)`, e FKs de `seller_id`/`admin_id` em outras
-- tabelas também apontam para `profiles.user_id` (ver
-- src/components/admin/DiscountApprovalQueue.tsx).
--
-- O trigger `on_auth_user_created` → `public.handle_new_user()` (em
-- auth.users) insere a linha em `public.profiles` mas SÓ seta
-- (id, email, full_name, role, department, is_active, preferences,
-- created_at, updated_at) — nunca `user_id`, que fica NULL. O trigger
-- seguinte `trg_grant_default_role` → `fn_grant_default_role_on_profile()`
-- (em public.profiles, AFTER INSERT) tenta inserir em `user_roles(user_id)`
-- usando `NEW.id` — que não bate com `profiles.user_id` (NULL) da própria
-- linha recém-criada, e a FK rejeita. Como os dois triggers rodam na mesma
-- transação do INSERT em auth.users (GoTrue chama isso via RPC/transação
-- única), a falha aborta a criação do usuário inteira, não só a role.
--
-- Confirmado ao vivo: 13/13 profiles existentes têm `user_id = id` (a
-- migration 20260511200050_fix_handle_new_user_profiles_id.sql já tinha
-- setado `user_id` corretamente) — a invariante é clara, uma reescrita
-- posterior da função (20260524210000_capture_fn_handle_new_user_vendedor.sql
-- e vizinhas, focadas em corrigir o mapeamento de role seller→vendedor)
-- reintroduziu o corpo da função sem a coluna `user_id`. Como não há
-- nenhum signup novo desde 2026-05-17 (antes das edições de 24/05), o bug
-- nunca foi exercitado por um usuário real até este teste de CI hoje —
-- mas bloquearia QUALQUER signup novo agora, incluindo via dashboard admin
-- (auth.admin.createUser usa o mesmo caminho).
--
-- Efeito desta migration: restaura `user_id = NEW.id` no INSERT de
-- `handle_new_user()`, sem tocar em nenhuma outra coluna/lógica (role,
-- department, preferences continuam iguais). Idempotente via
-- CREATE OR REPLACE FUNCTION.
--
-- Aplicado via E15 (.github/workflows/db-apply-migration.yml) — nunca
-- supabase db push nem execute_sql direto no canônico.

DO $precondition$
BEGIN
  IF to_regprocedure('public.handle_new_user()') IS NULL THEN
    RAISE EXCEPTION 'Precondição falhou: public.handle_new_user() não existe';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_proc
    WHERE oid = 'public.handle_new_user()'::regprocedure
      AND prosrc ILIKE '%user_id%'
  ) THEN
    RAISE EXCEPTION 'Precondição falhou: handle_new_user() já referencia user_id — achado pode já ter sido corrigido por outra via, investigar antes de prosseguir';
  END IF;

  IF EXISTS (SELECT 1 FROM public.profiles WHERE user_id IS DISTINCT FROM id) THEN
    RAISE EXCEPTION 'Precondição falhou: existe profile com user_id != id — a invariante assumida por esta migration não é universal, investigar antes de prosseguir';
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
        id, user_id, email, full_name, role,
        department, is_active, preferences,
        created_at, updated_at
    ) VALUES (
        NEW.id,
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

DO $postcondition$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc
    WHERE oid = 'public.handle_new_user()'::regprocedure
      AND prosrc ILIKE '%user_id%'
  ) THEN
    RAISE EXCEPTION 'Pós-condição falhou: handle_new_user() ainda não referencia user_id — CREATE OR REPLACE não teve o efeito esperado';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger t
    JOIN pg_proc p ON p.oid = t.tgfoid
    WHERE t.tgrelid = 'auth.users'::regclass
      AND NOT t.tgisinternal
      AND t.tgname = 'on_auth_user_created'
      AND p.proname = 'handle_new_user'
  ) THEN
    RAISE EXCEPTION 'Pós-condição falhou: trigger on_auth_user_created não está mais ligado a handle_new_user() — efeito colateral inesperado';
  END IF;
END;
$postcondition$;
