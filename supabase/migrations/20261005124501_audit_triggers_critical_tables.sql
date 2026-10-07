-- Auditoria 20-dim (Onda 4) — trilha de auditoria DB-level nas tabelas
-- críticas restantes. user_roles já tem audit_user_role_changes (T28);
-- esta migration generaliza o mesmo padrão (admin_audit_log, SECURITY
-- DEFINER, nunca quebra a escrita principal) para:
--   profiles, suppliers, seller_carts, discount_approval_requests,
--   orders, quotes
-- Captura escrita direta na tabela (bypass das RPCs/edges — defesa em
-- profundidade que a auditoria app-level via useAuditLog não cobre).
-- UPDATE "touch-only" (só updated_at/version mudou) não gera linha.
-- Rollback: DROP TRIGGER trg_audit_row_change em profiles, suppliers,
-- seller_carts, discount_approval_requests, orders, quotes; DROP
-- FUNCTION public.fn_audit_row_change().

CREATE OR REPLACE FUNCTION public.fn_audit_row_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _actor uuid := auth.uid();
  _rec jsonb;
  _old jsonb;
  _rid uuid;
  _changed text[];
BEGIN
  _rec := CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE to_jsonb(NEW) END;
  _old := CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE to_jsonb(OLD) END;

  -- UPDATE sem mudança de dados (só colunas de sistema) não é evento auditável.
  IF TG_OP = 'UPDATE' THEN
    SELECT array_agg(k) INTO _changed
    FROM jsonb_each(_old) AS j(k, v)
    WHERE v IS DISTINCT FROM _rec -> k;
    IF _changed IS NULL OR _changed <@ ARRAY['updated_at', 'version']::text[] THEN
      RETURN NEW;
    END IF;
  END IF;

  _rid := COALESCE(
    (_rec ->> 'id')::uuid,
    (_rec ->> 'user_id')::uuid,
    (_rec ->> 'seller_id')::uuid,
    (_rec ->> 'created_by')::uuid
  );

  INSERT INTO public.admin_audit_log (
    user_id, action, resource_type, resource_id, details, source, created_at
  ) VALUES (
    COALESCE(
      _actor,
      (_rec ->> 'user_id')::uuid,
      (_rec ->> 'seller_id')::uuid,
      (_rec ->> 'created_by')::uuid,
      '00000000-0000-0000-0000-000000000000'::uuid
    ),
    TG_TABLE_NAME || '.' || lower(TG_OP),
    TG_TABLE_NAME,
    COALESCE(_rid::text, TG_TABLE_NAME || ':' || TG_OP),
    jsonb_build_object(
      'op', TG_OP,
      'old', _old,
      'new', CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE _rec END,
      'changed_fields', to_jsonb(_changed)
    ),
    CASE WHEN _actor IS NULL THEN 'system' ELSE 'database_trigger' END,
    now()
  );

  RETURN COALESCE(NEW, OLD);
EXCEPTION WHEN OTHERS THEN
  -- Auditoria nunca derruba a escrita principal (mesmo padrão de
  -- audit_user_role_changes): loga warning e devolve a row.
  RAISE WARNING 'fn_audit_row_change failed on %: %', TG_TABLE_NAME, SQLERRM;
  RETURN COALESCE(NEW, OLD);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.fn_audit_row_change() FROM PUBLIC, anon, authenticated;

COMMENT ON FUNCTION public.fn_audit_row_change() IS
  'Trigger genérica de auditoria → admin_audit_log (resource_type = tabela, action = <tabela>.<op>). Onda 4 da auditoria 20-dim.';

DO $$
DECLARE
  _t text;
BEGIN
  FOREACH _t IN ARRAY ARRAY[
    'profiles', 'suppliers', 'seller_carts',
    'discount_approval_requests', 'orders', 'quotes'
  ] LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS trg_audit_%1$s ON public.%1$I;
       CREATE TRIGGER trg_audit_%1$s
         AFTER INSERT OR UPDATE OR DELETE ON public.%1$I
         FOR EACH ROW EXECUTE FUNCTION public.fn_audit_row_change()',
      _t
    );
  END LOOP;

  FOREACH _t IN ARRAY ARRAY[
    'profiles', 'suppliers', 'seller_carts',
    'discount_approval_requests', 'orders', 'quotes'
  ] LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_trigger
      WHERE tgname = 'trg_audit_' || _t
        AND tgrelid = format('public.%I', _t)::regclass
    ) THEN
      RAISE EXCEPTION 'trg_audit_% não criado', _t;
    END IF;
  END LOOP;
END $$;
