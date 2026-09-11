
-- ============================================================
-- MIGRATION v4: fix_auth_hydration_v4_drop_redundant_index
-- 2026-07-14 — BUG detectado na auditoria exaustiva pós-v3
--
-- PROBLEMA: idx_user_roles_user_id_covering criado em v3 com
--   INDEX ON user_roles (user_id, role)
-- é IDÊNTICO ao user_roles_pkey:
--   UNIQUE INDEX ON user_roles USING btree (user_id, role)
--
-- A PRIMARY KEY em PostgreSQL já cria automaticamente um B-tree
-- index nos campos (user_id, role), o que torna o índice adicional
-- 100% redundante — write overhead + 16KB de storage desperdiçados.
--
-- SOLUÇÃO: Drop do índice redundante.
-- A PK continua existindo e cobre todas as queries relevantes:
--   - WHERE user_id = ? (leading column do índice composto)
--   - WHERE user_id = ? AND role = ? (cobertura completa)
-- ============================================================

DROP INDEX IF EXISTS public.idx_user_roles_user_id_covering;

-- Confirma que o PK ainda está presente
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'user_roles' AND indexname = 'user_roles_pkey'
  ) THEN
    RAISE EXCEPTION 'user_roles_pkey não encontrado — PK foi dropada acidentalmente!';
  END IF;
  RAISE NOTICE 'OK: user_roles_pkey ainda presente após drop do índice redundante';
END;
$$;
;
