-- ============================================================
-- Etapa 3A do plano: Fundação RBAC
-- Banco: doufsxqlfjyuvxuezpln (Gestão de Produtos)
-- Alinha com:
--   docs/RBAC_HELPERS.md
--   src/lib/rbac/route-matrix.ts
--   tests/rls/telemetry-logs-connections-access.test.ts
--   supabase/functions/_shared/edge-authz-manifest.ts
--   supabase/migrations/20260429155414_*.sql (que referencia is_admin_strict)
-- ============================================================

-- ─── 1. Enum app_role ────────────────────────────────────────────────
-- Criado em ordem hierárquica (do mais alto privilégio ao mais baixo)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
    CREATE TYPE public.app_role AS ENUM (
      'dev',          -- proprietário técnico, MCP keys, secrets
      'supervisor',   -- gestão funcional pós-migração legacy
      'admin',        -- legacy, equivalente a supervisor (vai sair)
      'manager',      -- legacy, equivalente a supervisor (vai sair)
      'agente'        -- vendedor
    );
  END IF;
END$$;

-- ─── 2. Limpar function is_admin() antiga (lê user_roles vazia) ─────
DROP FUNCTION IF EXISTS public.is_admin();

-- ─── 3. Recriar user_roles com schema correto ───────────────────────
-- Tabela existente está vazia, drop é seguro
DROP TABLE IF EXISTS public.user_roles CASCADE;

CREATE TABLE public.user_roles (
  user_id      uuid           NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role         public.app_role NOT NULL,
  created_at   timestamptz    NOT NULL DEFAULT now(),
  granted_by   uuid           REFERENCES auth.users(id) ON DELETE SET NULL,
  PRIMARY KEY (user_id, role)
);

CREATE INDEX user_roles_role_idx ON public.user_roles (role);

COMMENT ON TABLE public.user_roles IS 
  'Source of truth para autorização. Multi-role suportado (1 user pode ter dev+supervisor). PK composto (user_id, role).';

-- ─── 4. Função base has_role(uid, role) ─────────────────────────────
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;
COMMENT ON FUNCTION public.has_role(uuid, public.app_role) IS 
  'Helper base. Não usar em policies novas — preferir helpers semânticos (is_*, can_*).';

-- ─── 5. is_dev — restrito ao papel dev ──────────────────────────────
CREATE OR REPLACE FUNCTION public.is_dev(_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(_user_id, 'dev'::public.app_role);
$$;

-- ─── 6. is_supervisor_or_above — dev/supervisor/admin/manager ──────
CREATE OR REPLACE FUNCTION public.is_supervisor_or_above(_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id 
      AND role IN ('dev','supervisor','admin','manager')
  );
$$;

-- ─── 7. is_admin (com e sem parâmetro) — alias de is_supervisor_or_above
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_supervisor_or_above(_user_id);
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_supervisor_or_above(auth.uid());
$$;

-- ─── 8. is_admin_strict — só dev (referenciado por migration anterior)
CREATE OR REPLACE FUNCTION public.is_admin_strict(_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_dev(_user_id);
$$;

-- ─── 9. fn_is_admin_user mantida como compat (lê profiles.role) ─────
-- A função antiga continua existindo para policies legadas que ainda a usam.
-- Já existe e funciona — não mexer.

-- ─── 10. Helpers semânticos ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.can_view_audit_logs(_user_id uuid DEFAULT auth.uid())
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT public.is_dev(_user_id); $$;

CREATE OR REPLACE FUNCTION public.can_view_telemetry(_user_id uuid DEFAULT auth.uid())
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT public.is_supervisor_or_above(_user_id); $$;

CREATE OR REPLACE FUNCTION public.can_view_connections(_user_id uuid DEFAULT auth.uid())
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT public.is_supervisor_or_above(_user_id); $$;

CREATE OR REPLACE FUNCTION public.can_manage_connections(_user_id uuid DEFAULT auth.uid())
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT public.is_supervisor_or_above(_user_id); $$;

-- ─── 11. GRANTs — helpers executáveis por todos (bloqueiam internamente)
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.is_dev(uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.is_supervisor_or_above(uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.is_admin_strict(uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.can_view_audit_logs(uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.can_view_telemetry(uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.can_view_connections(uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.can_manage_connections(uuid) TO authenticated, anon;

-- ─── 12. Backfill dos 4 usuários reais ──────────────────────────────
-- Mapeamento baseado em email + departamento + papel atual em profiles.role
INSERT INTO public.user_roles (user_id, role, granted_by)
SELECT id, 'dev'::public.app_role, id
FROM auth.users WHERE email = 'adm01@promobrindes.com.br';

INSERT INTO public.user_roles (user_id, role, granted_by)
SELECT id, 'supervisor'::public.app_role, 
       (SELECT id FROM auth.users WHERE email = 'adm01@promobrindes.com.br')
FROM auth.users WHERE email = 'ti@promobrindes.com.br';

INSERT INTO public.user_roles (user_id, role, granted_by)
SELECT id, 'agente'::public.app_role,
       (SELECT id FROM auth.users WHERE email = 'adm01@promobrindes.com.br')
FROM auth.users 
WHERE email IN ('comercial03@promobrindes.com.br', 'comercial05@promobrindes.com.br');

-- ─── 13. RLS em user_roles ──────────────────────────────────────────
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own roles"
  ON public.user_roles FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Supervisors read all roles"
  ON public.user_roles FOR SELECT TO authenticated
  USING (public.is_supervisor_or_above(auth.uid()));

CREATE POLICY "Admins insert roles"
  ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (public.is_admin_strict(auth.uid()));

CREATE POLICY "Admins update roles"
  ON public.user_roles FOR UPDATE TO authenticated
  USING (public.is_admin_strict(auth.uid()))
  WITH CHECK (public.is_admin_strict(auth.uid()));

CREATE POLICY "Admins delete roles"
  ON public.user_roles FOR DELETE TO authenticated
  USING (public.is_admin_strict(auth.uid()));

-- ─── 14. Trigger: novo profile → role agente default ───────────────
CREATE OR REPLACE FUNCTION public.fn_grant_default_role_on_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Só insere role default se ainda não tiver nenhuma
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = NEW.id) THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (
      NEW.id,
      CASE 
        WHEN NEW.role IN ('admin', 'manager') THEN 'supervisor'::public.app_role
        ELSE 'agente'::public.app_role
      END
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_grant_default_role ON public.profiles;
CREATE TRIGGER trg_grant_default_role
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_grant_default_role_on_profile();

COMMENT ON TRIGGER trg_grant_default_role ON public.profiles IS
  'Garante que todo novo profile recebe pelo menos uma role em user_roles. admin/manager → supervisor; demais → agente.';
