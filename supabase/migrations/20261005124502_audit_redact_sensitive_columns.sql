-- Auditoria 20-dim (Onda 4, revisão) — redação de colunas sensíveis em
-- fn_audit_row_change (criada em 20261005124501). Sem isto, dois vazamentos:
--   1) LGPD: o UPDATE de anonimização de profiles gravava details.old com
--      a PII inteira (full_name/email/phone/...) recuperável por 90 dias;
--   2) suppliers.api_credentials (e qualquer coluna cujo nome indique
--      segredo) sobrevivia a rotações de chave dentro de details.old/new.
-- Regra: profiles redige a PII explicitamente; qualquer tabela redige coluna
-- cujo nome case com (credential|secret|token|password|api_key). O log fica
-- com "[REDACTED]" no lugar do valor; changed_fields (só nomes) continua.

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
  _rec_safe jsonb;
  _old_safe jsonb;
  _rid uuid;
  _changed text[];
  _redact text[];
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

  _redact := CASE
    WHEN TG_TABLE_NAME = 'profiles' THEN ARRAY[
      'full_name', 'email', 'phone', 'avatar_url',
      'department', 'preferences', 'bitrix_id'
    ]
    ELSE ARRAY[]::text[]
  END;

  _rec_safe := (
    SELECT jsonb_object_agg(
      j.k,
      CASE
        WHEN j.k = ANY(_redact)
          OR j.k ~* '(credential|secret|token|password|api_key)'
          THEN '"[REDACTED]"'::jsonb
        ELSE j.v
      END
    )
    FROM jsonb_each(_rec) AS j(k, v)
  );
  _old_safe := CASE WHEN _old IS NULL THEN NULL ELSE (
    SELECT jsonb_object_agg(
      j.k,
      CASE
        WHEN j.k = ANY(_redact)
          OR j.k ~* '(credential|secret|token|password|api_key)'
          THEN '"[REDACTED]"'::jsonb
        ELSE j.v
      END
    )
    FROM jsonb_each(_old) AS j(k, v)
  ) END;

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
      'old', _old_safe,
      'new', CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE _rec_safe END,
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
  'Trigger genérica de auditoria → admin_audit_log com redação de PII/segredos (Onda 4).';
