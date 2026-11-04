-- ============================================================
-- Etapa 8: Edge functions + Vault
-- 
-- Bloco A: Renomear colunas integration_credentials para match com código
--          (name → secret_name, encrypted_value → secret_value)
-- Bloco B: Helper RPCs Vault (set/get/list/delete) via supabase_vault
-- Bloco C: Tabela edge_function_invocations (logs)
-- Bloco D: Comments e cleanup
-- ============================================================

-- ════════════════════════════════════════════════════════════
-- BLOCO A: Renomear integration_credentials para match com edge code
-- ════════════════════════════════════════════════════════════

-- Drop UNIQUE antigo
ALTER TABLE public.integration_credentials 
  DROP CONSTRAINT IF EXISTS integration_credentials_provider_name_key;

-- Renomear colunas (0 rows na tabela = seguro)
ALTER TABLE public.integration_credentials 
  RENAME COLUMN name TO secret_name;
ALTER TABLE public.integration_credentials 
  RENAME COLUMN encrypted_value TO secret_value;

-- UNIQUE em secret_name apenas (helper usa .maybeSingle() sem provider)
ALTER TABLE public.integration_credentials 
  ADD CONSTRAINT integration_credentials_secret_name_key 
  UNIQUE (secret_name);

COMMENT ON COLUMN public.integration_credentials.secret_name IS
  'Nome canônico do secret (ex: BITRIX_API_KEY, EXTERNAL_PROMOBRIND_URL). Match com helper supabase/functions/_shared/credentials.ts.';
COMMENT ON COLUMN public.integration_credentials.secret_value IS
  'Valor do secret. Lido pelo helper resolveCredential() via service_role. RLS bloqueia agente/supervisor de SELECT.';

-- ════════════════════════════════════════════════════════════
-- BLOCO B: Helper RPCs Vault
-- ════════════════════════════════════════════════════════════

-- B.1) vault_set_secret: armazena (cifra automaticamente via supabase_vault)
CREATE OR REPLACE FUNCTION public.vault_set_secret(
  p_name        text,
  p_value       text,
  p_description text DEFAULT NULL
)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, vault AS $$
DECLARE
  v_secret_id uuid;
BEGIN
  -- Gate: só dev pode escrever em vault
  IF NOT public.is_admin_strict(auth.uid()) THEN
    RAISE EXCEPTION 'unauthorized: only dev role can write to vault'
      USING ERRCODE = '42501';
  END IF;

  -- Upsert: se já existe, atualiza; senão insere
  SELECT id INTO v_secret_id FROM vault.secrets WHERE name = p_name LIMIT 1;
  
  IF v_secret_id IS NULL THEN
    -- INSERT direto cifra o `secret` automaticamente via trigger interno
    INSERT INTO vault.secrets (name, secret, description) 
    VALUES (p_name, p_value, p_description) 
    RETURNING id INTO v_secret_id;
  ELSE
    UPDATE vault.secrets 
    SET secret = p_value,
        description = COALESCE(p_description, description),
        updated_at = now()
    WHERE id = v_secret_id;
  END IF;
  
  RETURN v_secret_id;
END $$;

GRANT EXECUTE ON FUNCTION public.vault_set_secret(text, text, text) TO authenticated;
COMMENT ON FUNCTION public.vault_set_secret IS
  'Armazena/atualiza secret cifrado em vault.secrets. Apenas dev role pode escrever. Idempotente (upsert por name).';

-- B.2) vault_get_secret: retorna valor decifrado
CREATE OR REPLACE FUNCTION public.vault_get_secret(p_name text)
RETURNS text LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, vault AS $$
DECLARE
  v_value text;
BEGIN
  -- Gate: só dev pode ler em vault (edge functions usam service_role, bypassam isso)
  IF NOT public.is_admin_strict(auth.uid()) THEN
    RAISE EXCEPTION 'unauthorized: only dev role can read vault directly. Edge functions bypass via service_role.'
      USING ERRCODE = '42501';
  END IF;
  
  SELECT decrypted_secret INTO v_value 
  FROM vault.decrypted_secrets 
  WHERE name = p_name 
  LIMIT 1;
  
  RETURN v_value;  -- NULL se não existe
END $$;

GRANT EXECUTE ON FUNCTION public.vault_get_secret(text) TO authenticated;
COMMENT ON FUNCTION public.vault_get_secret IS
  'Retorna valor decifrado de um secret. Apenas dev role. Edge functions devem usar service_role direto em vault.decrypted_secrets ou via integration_credentials helper.';

-- B.3) vault_list_secret_names: lista nomes (sem valores)
CREATE OR REPLACE FUNCTION public.vault_list_secret_names()
RETURNS TABLE (
  name        text,
  description text,
  created_at  timestamptz,
  updated_at  timestamptz
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, vault AS $$
BEGIN
  -- Gate: dev e supervisor podem listar nomes (auditoria de inventário)
  IF NOT public.is_supervisor_or_above(auth.uid()) THEN
    RAISE EXCEPTION 'unauthorized: requires supervisor role or above'
      USING ERRCODE = '42501';
  END IF;
  
  RETURN QUERY
  SELECT s.name, s.description, s.created_at, s.updated_at 
  FROM vault.secrets s 
  ORDER BY s.name;
END $$;

GRANT EXECUTE ON FUNCTION public.vault_list_secret_names() TO authenticated;
COMMENT ON FUNCTION public.vault_list_secret_names IS
  'Lista secrets do vault sem expor valores. Supervisor+ pode auditar inventário.';

-- B.4) vault_delete_secret: remove
CREATE OR REPLACE FUNCTION public.vault_delete_secret(p_name text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, vault AS $$
DECLARE
  v_deleted integer;
BEGIN
  IF NOT public.is_admin_strict(auth.uid()) THEN
    RAISE EXCEPTION 'unauthorized: only dev role can delete from vault'
      USING ERRCODE = '42501';
  END IF;
  
  DELETE FROM vault.secrets WHERE name = p_name;
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted > 0;
END $$;

GRANT EXECUTE ON FUNCTION public.vault_delete_secret(text) TO authenticated;
COMMENT ON FUNCTION public.vault_delete_secret IS
  'Remove secret do vault. Apenas dev. Retorna true se deletou.';

-- ════════════════════════════════════════════════════════════
-- BLOCO C: edge_function_invocations (logs)
-- ════════════════════════════════════════════════════════════

CREATE TABLE public.edge_function_invocations (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  function_slug     text NOT NULL,
  invoked_by        uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  invoked_at        timestamptz NOT NULL DEFAULT now(),
  request_method    text,
  request_metadata  jsonb,            -- redacted: NUNCA inserir secrets/headers de auth
  status_code       integer,
  duration_ms       integer,
  error_message     text,
  ip_address        inet,
  user_agent        text
);

CREATE INDEX idx_efi_function_slug   ON public.edge_function_invocations(function_slug, invoked_at DESC);
CREATE INDEX idx_efi_invoked_by      ON public.edge_function_invocations(invoked_by, invoked_at DESC) WHERE invoked_by IS NOT NULL;
CREATE INDEX idx_efi_invoked_at      ON public.edge_function_invocations(invoked_at DESC);
CREATE INDEX idx_efi_errors          ON public.edge_function_invocations(invoked_at DESC) WHERE status_code >= 400;

ALTER TABLE public.edge_function_invocations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "efi_select_supervisor_or_above"
  ON public.edge_function_invocations FOR SELECT TO authenticated
  USING (public.is_supervisor_or_above(auth.uid()));

-- service_role bypassa RLS, então edges INSERT diretamente sem policy explícita
-- Mas adicionamos policy permissiva caso runtime de edge use authenticated
CREATE POLICY "efi_insert_any_authenticated"
  ON public.edge_function_invocations FOR INSERT TO authenticated
  WITH CHECK (invoked_by = auth.uid() OR invoked_by IS NULL);

CREATE POLICY "efi_delete_dev_only"
  ON public.edge_function_invocations FOR DELETE TO authenticated
  USING (public.is_admin_strict(auth.uid()));

COMMENT ON TABLE public.edge_function_invocations IS
  'Logs de invocações de edge functions. Edges escrevem via service_role. NÃO inserir secrets/auth headers em request_metadata. Cleanup periódico via purge_edge_invocations_old() ou cron job.';

-- C.1) Cleanup de logs antigos (> 90 dias)
CREATE OR REPLACE FUNCTION public.purge_edge_invocations_old()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_count integer;
BEGIN
  DELETE FROM public.edge_function_invocations 
  WHERE invoked_at < now() - interval '90 days';
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END $$;
GRANT EXECUTE ON FUNCTION public.purge_edge_invocations_old() TO service_role;
